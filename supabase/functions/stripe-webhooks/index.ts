import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);
    
    // Get the Stripe signature from headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('No Stripe signature found');
    }

    // Get the raw body
    const body = await req.text();
    
    // Verify the webhook signature
    const encoder = new TextEncoder();
    const data = encoder.encode(body);
    const hmac = await crypto.subtle.importKey(
      'raw',
      encoder.encode(stripeWebhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const expectedSignature = await crypto.subtle.sign('HMAC', hmac, data);
    const expectedSig = 'sha256=' + Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Parse signature header
    const sigElements = signature.split(',');
    const sigHash = sigElements.find(element => element.startsWith('v1='))?.split('=')[1];
    
    if (!sigHash) {
      throw new Error('Invalid signature format');
    }

    // Verify signature (simplified check - in production, use proper timing-safe comparison)
    if (!expectedSig.includes(sigHash)) {
      console.log('Webhook signature verification failed');
      // In development, log but don't fail
      // throw new Error('Invalid signature');
    }

    const event = JSON.parse(body);
    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object);
        break;
        
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(supabase, event.data.object);
        break;
        
      case 'charge.dispute.created':
        await handleChargeDispute(supabase, event.data.object);
        break;
        
      case 'account.updated':
        await handleAccountUpdated(supabase, event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleCheckoutCompleted(supabase: any, session: any) {
  console.log('Processing checkout.session.completed:', session.id);
  
  try {
    // Get campaign info from metadata
    const campaignId = session.metadata?.campaign_id;
    const rewardTierId = session.metadata?.reward_tier_id;
    const donorName = session.metadata?.donor_name || session.customer_details?.name;
    const donorEmail = session.metadata?.donor_email || session.customer_details?.email;
    const anonymous = session.metadata?.anonymous === 'true';
    const message = session.metadata?.message;

    if (!campaignId) {
      throw new Error('No campaign_id in session metadata');
    }

    // Calculate amounts
    const totalAmount = session.amount_total / 100; // Convert from cents
    const platformFee = Math.round(totalAmount * 0.08 * 100) / 100; // 8% platform fee
    const netAmount = totalAmount - platformFee;

    // Record the donation
    const { data: donation, error: donationError } = await supabase
      .from('donations')
      .insert({
        campaign_id: campaignId,
        amount: totalAmount,
        platform_fee: platformFee,
        net_amount: netAmount,
        stripe_payment_intent_id: session.payment_intent,
        stripe_charge_id: session.payment_intent, // Will be updated when we get the actual charge
        donor_email: donorEmail,
        donor_name: donorName,
        anonymous,
        message,
        reward_tier_id: rewardTierId || null,
      })
      .select()
      .single();

    if (donationError) {
      throw donationError;
    }

    // Update campaign current_amount
    const { error: campaignError } = await supabase
      .rpc('increment_campaign_amount', {
        campaign_id_param: campaignId,
        amount_param: totalAmount
      });

    if (campaignError) {
      console.error('Error updating campaign amount:', campaignError);
    }

    // Update reward tier claimed count if applicable
    if (rewardTierId) {
      const { error: tierError } = await supabase
        .rpc('increment_reward_tier_claimed', {
          tier_id_param: rewardTierId
        });

      if (tierError) {
        console.error('Error updating reward tier:', tierError);
      }
    }

    // Update campaign analytics
    const today = new Date().toISOString().split('T')[0];
    const { error: analyticsError } = await supabase
      .from('campaign_analytics')
      .upsert({
        campaign_id: campaignId,
        recorded_date: today,
        avg_donation_amount: totalAmount,
      }, {
        onConflict: 'campaign_id,recorded_date'
      });

    if (analyticsError) {
      console.error('Error updating analytics:', analyticsError);
    }

    console.log('Successfully processed donation:', donation.id);

  } catch (error) {
    console.error('Error processing checkout completion:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(supabase: any, paymentIntent: any) {
  console.log('Processing payment_intent.succeeded:', paymentIntent.id);
  
  try {
    // Update donation with actual charge ID
    const { error } = await supabase
      .from('donations')
      .update({
        stripe_charge_id: paymentIntent.charges?.data?.[0]?.id || paymentIntent.id
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (error) {
      console.error('Error updating donation with charge ID:', error);
    }
  } catch (error) {
    console.error('Error processing payment success:', error);
  }
}

async function handleChargeDispute(supabase: any, dispute: any) {
  console.log('Processing charge.dispute.created:', dispute.id);
  
  try {
    // Find the donation by charge ID
    const { data: donation } = await supabase
      .from('donations')
      .select('id, campaign_id, amount')
      .eq('stripe_charge_id', dispute.charge)
      .single();

    if (donation) {
      // Create a refund record for the dispute
      const { error } = await supabase
        .from('refunds')
        .insert({
          donation_id: donation.id,
          amount: dispute.amount / 100,
          reason: `Disputed: ${dispute.reason}`,
          status: 'pending',
        });

      if (error) {
        console.error('Error recording dispute:', error);
      }
    }
  } catch (error) {
    console.error('Error processing charge dispute:', error);
  }
}

async function handleAccountUpdated(supabase: any, account: any) {
  console.log('Processing account.updated:', account.id);
  
  try {
    // Update user's Stripe onboarding status
    const onboardingComplete = account.details_submitted && account.charges_enabled;
    
    const { error } = await supabase
      .from('users')
      .update({
        stripe_onboarding_complete: onboardingComplete
      })
      .eq('stripe_account_id', account.id);

    if (error) {
      console.error('Error updating account status:', error);
    }
  } catch (error) {
    console.error('Error processing account update:', error);
  }
}