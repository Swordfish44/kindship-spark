import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Validation schemas
const CheckoutRequestSchema = z.object({
  campaign_id: z.string().uuid("Invalid campaign ID format"),
  amount_cents: z.number().int().min(100, "Amount must be at least $1.00 (100 cents)"),
  reward_tier_id: z.string().uuid().optional(),
  donor_name: z.string().optional(),
  donor_email: z.string().email("Invalid email format"),
  anonymous: z.boolean().default(false),
  message: z.string().max(500, "Message cannot exceed 500 characters").default(""),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
});

// Structured logging utility
function logEvent(level: 'info' | 'warn' | 'error', event: string, data?: any) {
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    event,
    function: 'create-checkout',
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);
    
    logEvent('info', 'checkout_request_started');
    
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
        logEvent('info', 'user_authenticated', { userId });
      } catch (error) {
        logEvent('warn', 'auth_token_invalid', { error: error.message });
      }
    }

    const requestBody = await req.json();
    
    // Validate input with Zod
    const validationResult = CheckoutRequestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      logEvent('error', 'validation_failed', { errors });
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const { 
      campaign_id, 
      amount_cents, 
      reward_tier_id,
      donor_name,
      donor_email,
      anonymous,
      message,
      success_url,
      cancel_url 
    } = validationResult.data;

    logEvent('info', 'input_validated', { campaign_id, amount, has_reward_tier: !!reward_tier_id });

    // Get campaign and organizer info
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        *,
        organizer:users!organizer_id (
          stripe_account_id,
          stripe_onboarding_complete,
          full_name
        )
      `)
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      logEvent('error', 'campaign_not_found', { campaign_id, error: campaignError?.message });
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'active') {
      logEvent('error', 'campaign_not_active', { campaign_id, status: campaign.status });
      throw new Error('Campaign is not active');
    }

    if (!campaign.organizer.stripe_account_id || !campaign.organizer.stripe_onboarding_complete) {
      logEvent('error', 'organizer_stripe_incomplete', { 
        campaign_id, 
        has_account_id: !!campaign.organizer.stripe_account_id,
        onboarding_complete: campaign.organizer.stripe_onboarding_complete 
      });
      throw new Error('Campaign organizer has not completed Stripe setup');
    }

    logEvent('info', 'campaign_validated', { campaign_id, organizer_id: campaign.organizer_id });

    // Validate reward tier if provided
    let rewardTier = null;
    if (reward_tier_id) {
      const { data: tier, error: tierError } = await supabase
        .from('reward_tiers')
        .select('*')
        .eq('id', reward_tier_id)
        .eq('campaign_id', campaign_id)
        .single();

      if (tierError || !tier) {
        logEvent('error', 'reward_tier_not_found', { reward_tier_id, error: tierError?.message });
        throw new Error('Invalid reward tier');
      }

      if (!tier.is_active) {
        logEvent('error', 'reward_tier_inactive', { reward_tier_id });
        throw new Error('Reward tier is not available');
      }

      if (tier.quantity_limit && tier.quantity_claimed >= tier.quantity_limit) {
        logEvent('error', 'reward_tier_sold_out', { 
          reward_tier_id, 
          quantity_limit: tier.quantity_limit,
          quantity_claimed: tier.quantity_claimed 
        });
        throw new Error('Reward tier is sold out');
      }

      if (amount_cents < tier.minimum_amount_cents) {
        logEvent('error', 'amount_below_minimum', { 
          reward_tier_id, 
          amount_cents, 
          minimum_amount_cents: tier.minimum_amount_cents 
        });
        throw new Error(`Minimum donation for this reward tier is $${(tier.minimum_amount_cents / 100).toFixed(2)}`);
      }

      logEvent('info', 'reward_tier_validated', { reward_tier_id, minimum_amount_cents: tier.minimum_amount_cents });

      rewardTier = tier;
    }

    // Calculate platform fee (8%) - amounts already in cents
    const platformFeeInCents = Math.round(amount_cents * 0.08);

    // Create Stripe Checkout Session
    const checkoutData = {
      mode: 'payment',
      success_url: success_url || `${req.headers.get('origin')}/donation/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/campaigns/${campaign.slug}`,
      customer_email: donor_email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Donation to ${campaign.title}`,
              description: rewardTier 
                ? `${rewardTier.title} - ${rewardTier.description}`
                : `Support ${campaign.organizer.full_name}'s campaign`,
              images: campaign.image_url ? [campaign.image_url] : [],
            },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFeeInCents,
        transfer_data: {
          destination: campaign.organizer.stripe_account_id,
        },
        metadata: {
          campaign_id,
          reward_tier_id: reward_tier_id || '',
          donor_name: donor_name || '',
          donor_email,
          anonymous: anonymous.toString(),
          message: message.substring(0, 500), // Stripe metadata limit
          donor_user_id: userId || '',
        },
      },
      metadata: {
        campaign_id,
        reward_tier_id: reward_tier_id || '',
        donor_name: donor_name || '',
        donor_email,
        anonymous: anonymous.toString(),
        message: message.substring(0, 500),
        donor_user_id: userId || '',
      },
    };

    const checkoutResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': checkoutData.mode,
        'success_url': checkoutData.success_url,
        'cancel_url': checkoutData.cancel_url,
        'customer_email': checkoutData.customer_email,
        'line_items[0][price_data][currency]': checkoutData.line_items[0].price_data.currency,
        'line_items[0][price_data][product_data][name]': checkoutData.line_items[0].price_data.product_data.name,
        'line_items[0][price_data][product_data][description]': checkoutData.line_items[0].price_data.product_data.description,
        'line_items[0][price_data][unit_amount]': checkoutData.line_items[0].price_data.unit_amount.toString(),
        'line_items[0][quantity]': checkoutData.line_items[0].quantity.toString(),
        'payment_intent_data[application_fee_amount]': checkoutData.payment_intent_data.application_fee_amount.toString(),
        'payment_intent_data[transfer_data][destination]': checkoutData.payment_intent_data.transfer_data.destination,
        ...Object.entries(checkoutData.metadata).reduce((acc, [key, value]) => {
          acc[`metadata[${key}]`] = value;
          return acc;
        }, {} as Record<string, string>),
        ...Object.entries(checkoutData.payment_intent_data.metadata).reduce((acc, [key, value]) => {
          acc[`payment_intent_data[metadata][${key}]`] = value;
          return acc;
        }, {} as Record<string, string>),
      }),
    });

    const checkout = await checkoutResponse.json();
    
    if (!checkoutResponse.ok) {
      logEvent('error', 'stripe_checkout_failed', { 
        error: checkout.error?.message, 
        stripe_code: checkout.error?.code,
        campaign_id 
      });
      throw new Error(`Stripe checkout creation failed: ${checkout.error?.message || 'Unknown error'}`);
    }

    logEvent('info', 'checkout_session_created', { 
      session_id: checkout.id, 
      campaign_id, 
      amount_cents: amountInCents 
    });

    // Log the donation attempt for analytics
    try {
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('campaign_analytics')
        .upsert({
          campaign_id,
          recorded_date: today,
          conversion_rate: 0, // Will be updated when payment completes
        }, {
          onConflict: 'campaign_id,recorded_date'
        });
      } catch (error) {
        logEvent('warn', 'analytics_logging_failed', { error: error.message, campaign_id });
      }

    return new Response(JSON.stringify({ 
      checkout_url: checkout.url,
      session_id: checkout.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logEvent('error', 'checkout_creation_failed', { 
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