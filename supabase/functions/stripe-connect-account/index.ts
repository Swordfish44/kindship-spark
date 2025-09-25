import Stripe from 'https://esm.sh/stripe@14.23.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'

/**
 * Stripe Connect Account Management Edge Function
 * 
 * This function handles creating and managing Stripe Connect accounts for sellers/vendors.
 * It implements the controller model where the platform is responsible for pricing,
 * fee collection, and losses/refunds/chargebacks.
 * 
 * Endpoints:
 * - POST /create-account - Creates a new connected account
 * - POST /get-account-status - Retrieves account status and onboarding completion
 * - POST /create-onboarding-link - Creates an account link for onboarding
 */

function logEvent(level: 'info' | 'warn' | 'error', event: string, data?: any) {
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    event,
    function: 'stripe-connect-account',
    ...data
  };
  console.log(JSON.stringify(logData));
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  // TODO: Replace with your actual Stripe secret key
  // You can set this in Supabase Dashboard -> Settings -> Edge Functions -> Secrets
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    logEvent('error', 'missing_stripe_secret_key');
    return new Response(JSON.stringify({ 
      error: 'STRIPE_SECRET_KEY environment variable is required. Please add it in Supabase Dashboard -> Settings -> Edge Functions -> Secrets' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173';

  if (!supabaseUrl || !supabaseAnonKey) {
    logEvent('error', 'missing_supabase_config');
    return new Response(JSON.stringify({ error: 'Supabase configuration missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Initialize Stripe with the latest API version
  const stripe = new Stripe(stripeSecretKey, { 
    apiVersion: '2023-10-16', // Using stable version for Deno compatibility
    typescript: true
  });

  // Initialize Supabase client with user context
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.get('Authorization') || ''
      }
    }
  });

  try {
    const { action, ...payload } = await req.json();
    logEvent('info', 'request_received', { action });

    // Verify user authentication for all actions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logEvent('warn', 'authentication_failed', { error: authError?.message });
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    switch (action) {
      case 'create-account': {
        /**
         * Creates a new Stripe Connect account using the controller model.
         * The platform is responsible for pricing, fees, and losses.
         */
        const { email, businessName, country = 'US' } = payload;

        if (!email) {
          return new Response(JSON.stringify({ error: 'Email is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        logEvent('info', 'creating_connect_account', { userId: user.id, email });

        // Create connected account with controller model
        // Platform is responsible for pricing, fees, and losses
        const account = await stripe.accounts.create({
          email: email,
          controller: {
            // Platform controls pricing and collects fees
            fees: {
              payer: 'application' as const
            },
            // Platform is responsible for losses/refunds/chargebacks
            losses: {
              payments: 'application' as const
            },
            // Give them access to the express dashboard for account management
            stripe_dashboard: {
              type: 'express' as const
            }
          },
          country: country,
          // Optional: Add business information if provided
          ...(businessName && {
            business_type: 'company',
            company: {
              name: businessName
            }
          }),
          metadata: {
            user_id: user.id,
            created_by: 'stripe-connect-demo'
          }
        });

        logEvent('info', 'connect_account_created', { 
          accountId: account.id, 
          userId: user.id 
        });

        return new Response(JSON.stringify({ 
          accountId: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get-account-status': {
        /**
         * Retrieves the current status of a connected account.
         * This includes onboarding status and capabilities.
         */
        const { accountId } = payload;

        if (!accountId) {
          return new Response(JSON.stringify({ error: 'Account ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        logEvent('info', 'retrieving_account_status', { accountId });

        try {
          const account = await stripe.accounts.retrieve(accountId);
          
          return new Response(JSON.stringify({
            accountId: account.id,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
            // Check if onboarding is complete
            onboardingComplete: account.charges_enabled && account.payouts_enabled && account.details_submitted,
            // Additional useful information
            country: account.country,
            defaultCurrency: account.default_currency,
            // Requirements for onboarding
            requirements: {
              currentlyDue: account.requirements?.currently_due || [],
              eventuallyDue: account.requirements?.eventually_due || [],
              pastDue: account.requirements?.past_due || []
            }
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          logEvent('error', 'account_retrieval_failed', { 
            accountId, 
            error: error.message 
          });
          
          return new Response(JSON.stringify({ 
            error: `Failed to retrieve account: ${error.message}` 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      case 'create-onboarding-link': {
        /**
         * Creates an Account Link for onboarding a connected account.
         * This redirects the user to Stripe's hosted onboarding flow.
         */
        const { accountId } = payload;

        if (!accountId) {
          return new Response(JSON.stringify({ error: 'Account ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        logEvent('info', 'creating_onboarding_link', { accountId });

        try {
          const accountLink = await stripe.accountLinks.create({
            account: accountId,
            // URL to redirect to if the user refreshes the page during onboarding
            refresh_url: `${siteUrl}/stripe-connect?refresh=true&account=${accountId}`,
            // URL to redirect to when onboarding is complete
            return_url: `${siteUrl}/stripe-connect?success=true&account=${accountId}`,
            type: 'account_onboarding'
          });

          logEvent('info', 'onboarding_link_created', { 
            accountId, 
            url: 'generated' 
          });

          return new Response(JSON.stringify({ 
            url: accountLink.url 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          logEvent('error', 'onboarding_link_creation_failed', { 
            accountId, 
            error: error.message 
          });
          
          return new Response(JSON.stringify({ 
            error: `Failed to create onboarding link: ${error.message}` 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      default: {
        logEvent('warn', 'invalid_action', { action });
        return new Response(JSON.stringify({ 
          error: `Invalid action: ${action}. Valid actions are: create-account, get-account-status, create-onboarding-link` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

  } catch (error: any) {
    logEvent('error', 'request_processing_error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});