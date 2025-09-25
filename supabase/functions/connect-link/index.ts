import Stripe from 'https://esm.sh/stripe@14.23.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'

function logEvent(level: 'info' | 'warn' | 'error', event: string, data?: any) {
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    event,
    function: 'connect-link',
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173';

  if (!stripeSecretKey || !supabaseUrl || !supabaseAnonKey) {
    logEvent('error', 'missing_environment_variables');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const stripe = new Stripe(stripeSecretKey, { 
    apiVersion: '2023-10-16',
    typescript: true
  });

  // Use the caller's JWT context (authenticated user)
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.get('Authorization') || ''
      }
    }
  });

  try {
    logEvent('info', 'connect_link_request_started');

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logEvent('warn', 'authentication_failed', { error: authError?.message });
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    logEvent('info', 'user_authenticated', { user_id: user.id });

    // Find the user record
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, organization_name, stripe_account_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userError) {
      logEvent('error', 'user_lookup_failed', { error: userError.message });
      throw userError;
    }

    if (!userRecord) {
      logEvent('error', 'user_record_not_found', { user_id: user.id });
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Ensure a Stripe Express account exists
    let accountId = userRecord.stripe_account_id;
    
    if (!accountId) {
      logEvent('info', 'creating_stripe_account', { user_id: user.id });
      
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: userRecord.email,
        business_type: 'individual',
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true }
        },
        metadata: {
          user_id: user.id,
          organization_name: userRecord.organization_name || ''
        }
      });

      accountId = account.id;
      logEvent('info', 'stripe_account_created', { account_id: accountId, user_id: user.id });

      // Update user record with Stripe account ID
      const { error: updateError } = await supabase
        .from('users')
        .update({ stripe_account_id: accountId })
        .eq('id', userRecord.id);

      if (updateError) {
        logEvent('error', 'user_update_failed', { error: updateError.message });
        throw updateError;
      }
    }

    // Create an onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/dashboard?connect=refresh`,
      return_url: `${siteUrl}/dashboard?connect=done`,
      type: 'account_onboarding'
    });

    logEvent('info', 'account_link_created', { 
      account_id: accountId, 
      user_id: user.id,
      url_created: true 
    });

    return new Response(JSON.stringify({ 
      url: accountLink.url, 
      account_id: accountId 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    logEvent('error', 'connect_link_error', { 
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