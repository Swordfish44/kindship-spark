import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import Stripe from 'https://esm.sh/stripe@14.23.0?target=deno';

// Validation schemas
const StripeConnectRequestSchema = z.object({
  action: z.enum(['create_account_link', 'create_payment_intent', 'check_onboarding_status']),
});

const PaymentIntentSchema = z.object({
  campaign_id: z.string().uuid(),
  amount: z.number().min(1),
  donor_email: z.string().email(),
  donor_name: z.string().optional(),
  anonymous: z.boolean().default(false),
  message: z.string().max(500).default(""),
});

// Structured logging utility
function logEvent(level: 'info' | 'warn' | 'error', event: string, data?: any) {
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    event,
    function: 'stripe-connect',
    ...data
  };
  console.log(JSON.stringify(logData));
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);
    
    logEvent('info', 'stripe_connect_request_started');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logEvent('error', 'missing_auth_header');
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logEvent('error', 'auth_failed', { error: authError?.message });
      throw new Error('Invalid auth token');
    }

    logEvent('info', 'user_authenticated', { userId: user.id });

    const requestBody = await req.json();
    const validationResult = StripeConnectRequestSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      logEvent('error', 'validation_failed', { errors });
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const { action } = validationResult.data;
    logEvent('info', 'action_validated', { action });

    switch (action) {
      case 'create_account_link': {
        const { data: userProfile } = await supabase
          .from('users')
          .select('stripe_account_id, email')
          .eq('id', user.id)
          .single();

        let accountId = userProfile?.stripe_account_id;

        // Create Stripe Express account if it doesn't exist
        if (!accountId) {
          const account = await stripe.accounts.create({
            type: 'express',
            country: 'US',
            email: userProfile?.email || user.email || '',
          });

          accountId = account.id;

          // Save Stripe account ID to user profile
          await supabase
            .from('users')
            .update({ stripe_account_id: accountId })
            .eq('id', user.id);
        }

        // Create account link for onboarding using Stripe SDK
        const accountLink = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: `${req.headers.get('origin')}/onboarding?refresh=true`,
          return_url: `${req.headers.get('origin')}/dashboard`,
          type: 'account_onboarding',
        });

        return new Response(JSON.stringify({ url: accountLink.url }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create_payment_intent': {
        const paymentValidation = PaymentIntentSchema.safeParse(requestBody);
        if (!paymentValidation.success) {
          const errors = paymentValidation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
          logEvent('error', 'payment_intent_validation_failed', { errors });
          throw new Error(`Payment intent validation failed: ${errors.join(', ')}`);
        }
        
        const { campaign_id, amount, donor_email, donor_name, anonymous, message } = paymentValidation.data;

        // Get campaign and organizer Stripe account
        const { data: campaign } = await supabase
          .from('campaigns')
          .select(`
            *,
            organizer:users!organizer_id (
              stripe_account_id,
              stripe_onboarding_complete
            )
          `)
          .eq('id', campaign_id)
          .single();

        if (!campaign?.organizer.stripe_account_id || !campaign?.organizer.stripe_onboarding_complete) {
          throw new Error('Campaign organizer has not completed Stripe onboarding');
        }

        const platformFee = Math.round(amount * 0.08 * 100); // 8% platform fee in cents
        const amountInCents = Math.round(amount * 100);

        const paymentIntentResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            amount: amountInCents.toString(),
            currency: 'usd',
            application_fee_amount: platformFee.toString(),
            transfer_data: JSON.stringify({
              destination: campaign.organizer.stripe_account_id,
            }),
            metadata: JSON.stringify({
              campaign_id,
              donor_email: donor_email || '',
              donor_name: donor_name || '',
              anonymous: anonymous ? 'true' : 'false',
              message: message || '',
            }),
          }),
        });

        const paymentIntent = await paymentIntentResponse.json();
        
        if (!paymentIntentResponse.ok) {
          throw new Error(`Payment intent creation failed: ${paymentIntent.error?.message}`);
        }

        return new Response(JSON.stringify({ 
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'check_onboarding_status': {
        const { data: userProfile } = await supabase
          .from('users')
          .select('stripe_account_id')
          .eq('id', user.id)
          .single();

        if (!userProfile?.stripe_account_id) {
          return new Response(JSON.stringify({ 
            onboarding_complete: false,
            details_submitted: false 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check account status using Stripe SDK
        const account = await stripe.accounts.retrieve(userProfile.stripe_account_id);

        const onboardingComplete = account.details_submitted && account.charges_enabled;

        // Update user profile if onboarding is complete
        if (onboardingComplete) {
          await supabase
            .from('users')
            .update({ stripe_onboarding_complete: true })
            .eq('id', user.id);
        }

        return new Response(JSON.stringify({ 
          onboarding_complete: onboardingComplete,
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    logEvent('error', 'stripe_connect_failed', { 
      error: error.message, 
      stack: error.stack?.split('\n').slice(0, 3).join('\n') 
    });
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString() 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});