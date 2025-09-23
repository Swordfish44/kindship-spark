import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Structured logging utility
function logEvent(level: 'info' | 'warn' | 'error', event: string, data?: any) {
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    event,
    function: 'stripe-webhooks',
    ...data
  };
  console.log(JSON.stringify(logData));
}

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

  const webhookSecret = stripeWebhookSecret;
  const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

  try {
    logEvent('info', 'webhook_processing_started');
    
    // Get the raw body as text for signature verification
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      logEvent('error', 'missing_stripe_signature');
      throw new Error('No Stripe signature found');
    }
    
    if (!webhookSecret) {
      logEvent('error', 'webhook_secret_not_configured');
      throw new Error('Webhook secret not configured');
    }
    
    // Verify the webhook signature
    const encoder = new TextEncoder();
    const sigElements = signature.split(',');
    
    let timestamp: string | null = null;
    let signatures: string[] = [];
    
    for (const element of sigElements) {
      const [key, value] = element.split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key === 'v1') {
        signatures.push(value);
      }
    }
    
    if (!timestamp || signatures.length === 0) {
      logEvent('error', 'invalid_signature_format');
      throw new Error('Invalid signature format');
    }
    
    // Create the payload for verification
    const payload = `${timestamp}.${body}`;
    const expectedSignature = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ).then(key => 
      crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    ).then(signature => 
      Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    );
    
    // Verify at least one signature matches
    const signatureValid = signatures.some(sig => sig === expectedSignature);
    if (!signatureValid) {
      logEvent('error', 'signature_verification_failed');
      throw new Error('Invalid webhook signature');
    }
    
    logEvent('info', 'webhook_signature_verified');

    // Parse the event
    const event = JSON.parse(body);
    logEvent('info', 'webhook_event_received', { eventType: event.type, eventId: event.id });
    
    // Check for idempotency - prevent duplicate processing
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single();
      
    if (existingEvent) {
      logEvent('info', 'webhook_event_already_processed', { eventId: event.id });
      return new Response(JSON.stringify({ received: true, status: 'duplicate' }), { 
        headers: corsHeaders 
      });
    }
    
    // Record this event for idempotency
    await supabase
      .from('webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString(),
        data: event
      });

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
        
      case 'radar.early_fraud_warning.created':
        await handleFraudWarning(supabase, event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(supabase, event.data.object);
        break;
        
      default:
        logEvent('warn', 'unhandled_event_type', { eventType: event.type, eventId: event.id });
        break;
    }

    logEvent('info', 'webhook_processing_completed', { eventType: event.type, eventId: event.id });
    return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });

  } catch (error) {
    logEvent('error', 'webhook_processing_failed', { 
      error: error.message, 
      stack: error.stack?.split('\n').slice(0, 3).join('\n') 
    });
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString() 
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

async function handleCheckoutCompleted(supabase: any, session: any) {
  logEvent('info', 'processing_checkout_completed', { sessionId: session.id });
  
  try {
    // Get campaign info from metadata
    const campaignId = session.metadata?.campaign_id;
    const rewardTierId = session.metadata?.reward_tier_id;
    const donorName = session.metadata?.donor_name || session.customer_details?.name;
    const donorEmail = session.metadata?.donor_email || session.customer_details?.email;
    const anonymous = session.metadata?.anonymous === 'true';
    const message = session.metadata?.message;

    if (!campaignId) {
      logEvent('error', 'checkout_missing_campaign_id', { sessionId: session.id });
      throw new Error('No campaign_id in session metadata');
    }

    // Calculate amounts in cents (no conversion needed)
    const totalAmountCents = session.amount_total; // Already in cents
    const platformFeeCents = Math.round(totalAmountCents * 0.08); // 8% platform fee
    const netAmountCents = totalAmountCents - platformFeeCents;

    logEvent('info', 'donation_amounts_calculated', { 
      sessionId: session.id, 
      totalAmountCents, 
      platformFeeCents, 
      netAmountCents 
    });

    // Record the donation
    const { data: donation, error: donationError } = await supabase
      .from('donations')
      .insert({
        campaign_id: campaignId,
        amount_cents: totalAmountCents,
        platform_fee_cents: platformFeeCents,
        net_amount_cents: netAmountCents,
        // Keep legacy columns for compatibility during transition
        amount: totalAmountCents / 100,
        platform_fee: platformFeeCents / 100,
        net_amount: netAmountCents / 100,
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
      logEvent('error', 'donation_creation_failed', { 
        error: donationError.message, 
        campaignId, 
        sessionId: session.id 
      });
      throw donationError;
    }

    logEvent('info', 'donation_created', { donationId: donation.id, campaignId });

    // Update campaign current_amount
    const { error: campaignError } = await supabase
      .rpc('increment_campaign_amount_cents', {
        campaign_id_param: campaignId,
        amount_cents_param: totalAmountCents
      });

    if (campaignError) {
      logEvent('error', 'campaign_amount_update_failed', { error: campaignError.message, campaignId });
    } else {
      logEvent('info', 'campaign_amount_updated', { campaignId, totalAmountCents });
    }

    // Update reward tier claimed count if applicable
    if (rewardTierId) {
      const { error: tierError } = await supabase
        .rpc('increment_reward_tier_claimed', {
          tier_id_param: rewardTierId
        });

      if (tierError) {
        logEvent('error', 'reward_tier_update_failed', { error: tierError.message, rewardTierId });
      } else {
        logEvent('info', 'reward_tier_updated', { rewardTierId });
      }
    }

    // Update campaign analytics
    const today = new Date().toISOString().split('T')[0];
    const { error: analyticsError } = await supabase
      .from('campaign_analytics')
      .upsert({
        campaign_id: campaignId,
        recorded_date: today,
        avg_donation_amount: totalAmountCents / 100, // Keep as decimal for analytics
      }, {
        onConflict: 'campaign_id,recorded_date'
      });

    if (analyticsError) {
      logEvent('error', 'analytics_update_failed', { error: analyticsError.message, campaignId });
    } else {
      logEvent('info', 'analytics_updated', { campaignId });
    }

    logEvent('info', 'checkout_completed_successfully', { 
      donationId: donation.id, 
      campaignId, 
      totalAmount 
    });

  } catch (error) {
    logEvent('error', 'checkout_completion_failed', { 
      error: error.message, 
      sessionId: session.id 
    });
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

async function handleFraudWarning(supabase: any, warning: any) {
  console.log('Processing radar.early_fraud_warning.created:', warning.id);
  
  try {
    // Find the donation by charge ID
    const { data: donation } = await supabase
      .from('donations')
      .select('id, campaign_id, amount, donor_email')
      .eq('stripe_charge_id', warning.charge)
      .single();

    if (donation) {
      // Log the fraud warning for monitoring
      console.warn(`Fraud warning for donation ${donation.id}: ${warning.fraud_type}`);
      
      // You could add a fraud_alerts table to track these
      // or send notifications to campaign organizers
      
      // For now, we'll add a comment about the warning
      const { error } = await supabase
        .from('campaign_comments')
        .insert({
          campaign_id: donation.campaign_id,
          user_id: '00000000-0000-0000-0000-000000000000', // System user
          content: `⚠️ Fraud warning detected for recent donation. Amount: $${donation.amount}`,
          is_deleted: false
        });

      if (error && !error.message.includes('violates row-level security')) {
        console.error('Error logging fraud warning:', error);
      }
    }
  } catch (error) {
    console.error('Error processing fraud warning:', error);
  }
}

async function handlePaymentFailed(supabase: any, paymentIntent: any) {
  console.log('Processing payment_intent.payment_failed:', paymentIntent.id);
  
  try {
    // Log failed payment attempt for analytics
    const campaignId = paymentIntent.metadata?.campaign_id;
    
    if (campaignId) {
      // Update campaign analytics with failed attempt
      const today = new Date().toISOString().split('T')[0];
      const { error: analyticsError } = await supabase
        .from('campaign_analytics')
        .upsert({
          campaign_id: campaignId,
          recorded_date: today,
          // You could add a failed_payments_count field
        }, {
          onConflict: 'campaign_id,recorded_date'
        });

      if (analyticsError) {
        console.error('Error updating failed payment analytics:', analyticsError);
      }
    }

    // Log the failure reason
    console.warn(`Payment failed: ${paymentIntent.id}, Reason: ${paymentIntent.last_payment_error?.message || 'Unknown'}`);
    
  } catch (error) {
    console.error('Error processing payment failure:', error);
  }
}