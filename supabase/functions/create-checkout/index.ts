import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch (error) {
        console.log('Auth token invalid, proceeding as guest donation');
      }
    }

    const { 
      campaign_id, 
      amount, 
      reward_tier_id,
      donor_name,
      donor_email,
      anonymous = false,
      message = '',
      success_url,
      cancel_url 
    } = await req.json();

    // Validate required fields
    if (!campaign_id || !amount || amount < 1) {
      throw new Error('Campaign ID and amount (minimum $1) are required');
    }

    if (!donor_email) {
      throw new Error('Donor email is required');
    }

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
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'active') {
      throw new Error('Campaign is not active');
    }

    if (!campaign.organizer.stripe_account_id || !campaign.organizer.stripe_onboarding_complete) {
      throw new Error('Campaign organizer has not completed Stripe setup');
    }

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
        throw new Error('Invalid reward tier');
      }

      if (!tier.is_active) {
        throw new Error('Reward tier is not available');
      }

      if (tier.quantity_limit && tier.quantity_claimed >= tier.quantity_limit) {
        throw new Error('Reward tier is sold out');
      }

      if (amount < tier.minimum_amount) {
        throw new Error(`Minimum donation for this reward tier is $${tier.minimum_amount}`);
      }

      rewardTier = tier;
    }

    // Calculate platform fee (8%)
    const amountInCents = Math.round(amount * 100);
    const platformFeeInCents = Math.round(amountInCents * 0.08);

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
            unit_amount: amountInCents,
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
      throw new Error(`Stripe checkout creation failed: ${checkout.error?.message || 'Unknown error'}`);
    }

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
      console.error('Error logging analytics:', error);
    }

    return new Response(JSON.stringify({ 
      checkout_url: checkout.url,
      session_id: checkout.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Checkout creation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});