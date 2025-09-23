import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

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

// Email configuration
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const fromEmail = Deno.env.get('FROM_EMAIL') || 'receipts@your-domain.com';
const siteName = Deno.env.get('SITE_NAME') || 'National Black Treasury';
const siteUrl = Deno.env.get('SITE_URL') || 'https://your-site.com';

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
        
      case 'charge.refunded':
        await handleChargeRefunded(supabase, event.data.object);
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

    // Send email receipts
    await sendDonationEmails(supabase, {
      donationId: donation.id,
      campaignId,
      donorEmail,
      donorName,
      totalAmountCents,
      paymentIntentId: session.payment_intent,
      anonymous,
      message
    });

    logEvent('info', 'checkout_completed_successfully', { 
      donationId: donation.id, 
      campaignId, 
      totalAmountCents 
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

async function handleChargeRefunded(supabase: any, charge: any) {
  logEvent('info', 'processing_charge_refunded', { chargeId: charge.id });
  
  try {
    // Find the donation by charge ID
    const { data: donation, error: donationError } = await supabase
      .from('donations')
      .select('id, amount_cents, refunded_cents, campaign_id')
      .eq('stripe_charge_id', charge.id)
      .single();

    if (donationError || !donation) {
      logEvent('error', 'donation_not_found_for_refund', { 
        error: donationError?.message, 
        chargeId: charge.id 
      });
      return;
    }

    // Calculate total refunded amount in cents
    let totalRefundedCents = 0;
    for (const refund of charge.refunds.data) {
      totalRefundedCents += refund.amount; // Already in cents
    }

    // Update donation with refunded amount
    const { error: updateError } = await supabase
      .from('donations')
      .update({
        refunded_cents: totalRefundedCents
      })
      .eq('id', donation.id);

    if (updateError) {
      logEvent('error', 'refund_amount_update_failed', { 
        error: updateError.message, 
        donationId: donation.id 
      });
    } else {
      logEvent('info', 'refund_amount_updated', { 
        donationId: donation.id, 
        totalRefundedCents,
        chargeId: charge.id 
      });
    }

    // Create refund records for tracking
    for (const refund of charge.refunds.data) {
      const { error: refundRecordError } = await supabase
        .from('refunds')
        .insert({
          donation_id: donation.id,
          amount: refund.amount / 100, // Convert to dollars for legacy field
          reason: refund.reason || 'Refund processed',
          status: refund.status || 'succeeded',
          stripe_refund_id: refund.id,
          processed_at: new Date(refund.created * 1000).toISOString()
        });

      if (refundRecordError) {
        logEvent('error', 'refund_record_creation_failed', { 
          error: refundRecordError.message, 
          refundId: refund.id 
        });
      }
    }

  } catch (error) {
    logEvent('error', 'charge_refund_processing_failed', { 
      error: error.message, 
      chargeId: charge.id 
    });
  }
}

async function sendDonationEmails(supabase: any, donationData: {
  donationId: string;
  campaignId: string;
  donorEmail: string;
  donorName: string;
  totalAmountCents: number;
  paymentIntentId: string;
  anonymous: boolean;
  message?: string;
}) {
  const { donationId, campaignId, donorEmail, donorName, totalAmountCents, paymentIntentId, anonymous, message } = donationData;
  
  try {
    logEvent('info', 'email_sending_started', { donationId, paymentIntentId });

    // Check if emails were already sent for this payment intent
    const { data: existingLog } = await supabase
      .from('receipt_logs')
      .select('*')
      .eq('donation_pi', paymentIntentId)
      .single();

    if (existingLog) {
      logEvent('info', 'emails_already_sent', { 
        donationId, 
        paymentIntentId,
        receiptSentAt: existingLog.receipt_sent_at,
        organizerSentAt: existingLog.organizer_sent_at
      });
      return;
    }

    // Get campaign and organizer information
    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        title,
        organizer_id,
        users!campaigns_organizer_id_fkey(email, full_name)
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaignData) {
      logEvent('error', 'campaign_data_fetch_failed', { error: campaignError?.message, campaignId });
      return;
    }

    const organizerEmail = campaignData.users?.email;
    const organizerName = campaignData.users?.full_name;
    const campaignTitle = campaignData.title;

    // Create initial log entry
    const { data: logEntry, error: logError } = await supabase
      .from('receipt_logs')
      .insert({
        donation_pi: paymentIntentId,
        donor_email: donorEmail,
        organizer_email: organizerEmail
      })
      .select()
      .single();

    if (logError) {
      logEvent('error', 'receipt_log_creation_failed', { error: logError.message, paymentIntentId });
      return;
    }

    const amountFormatted = `$${(totalAmountCents / 100).toFixed(2)}`;
    let emailsSent = { receipt: false, organizer: false };

    // Send receipt email to donor
    if (donorEmail) {
      try {
        const receiptResponse = await resend.emails.send({
          from: `${siteName} <${fromEmail}>`,
          to: [donorEmail],
          subject: `Thank you for your donation to ${campaignTitle}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; text-align: center;">Thank you for your donation!</h1>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #333; margin-top: 0;">Donation Receipt</h2>
                <p><strong>Campaign:</strong> ${campaignTitle}</p>
                <p><strong>Amount:</strong> ${amountFormatted}</p>
                <p><strong>Donor:</strong> ${donorName}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
              </div>
              
              <p>Your generous donation will help make a difference. You will receive updates on how your contribution is being used.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${siteUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Visit ${siteName}</a>
              </div>
              
              <p style="font-size: 12px; color: #666; text-align: center;">
                This receipt serves as confirmation of your donation. Please keep this for your records.
              </p>
            </div>
          `
        });

        if (receiptResponse.error) {
          logEvent('error', 'receipt_email_failed', { 
            error: receiptResponse.error.message, 
            donorEmail, 
            donationId 
          });
        } else {
          emailsSent.receipt = true;
          logEvent('info', 'receipt_email_sent', { donorEmail, donationId });
        }
      } catch (error) {
        logEvent('error', 'receipt_email_exception', { 
          error: error.message, 
          donorEmail, 
          donationId 
        });
      }
    }

    // Send notification email to organizer
    if (organizerEmail) {
      try {
        const organizerResponse = await resend.emails.send({
          from: `${siteName} <${fromEmail}>`,
          to: [organizerEmail],
          subject: `New donation received for ${campaignTitle}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; text-align: center;">New Donation Received!</h1>
              
              <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                <h2 style="color: #333; margin-top: 0;">Donation Details</h2>
                <p><strong>Campaign:</strong> ${campaignTitle}</p>
                <p><strong>Amount:</strong> ${amountFormatted}</p>
                <p><strong>Donor:</strong> ${anonymous ? 'Anonymous' : donorName}</p>
                <p><strong>Email:</strong> ${anonymous ? 'Hidden' : donorEmail}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                ${message && !anonymous ? `<p><strong>Message:</strong> ${message}</p>` : ''}
              </div>
              
              <p>Hello ${organizerName},</p>
              
              <p>Great news! Your campaign "${campaignTitle}" has received a new donation of ${amountFormatted}.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${siteUrl}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Campaign Dashboard</a>
              </div>
              
              <p style="font-size: 12px; color: #666;">
                You're receiving this email because you're the organizer of this campaign. 
                <br>Keep up the great work!
              </p>
            </div>
          `
        });

        if (organizerResponse.error) {
          logEvent('error', 'organizer_email_failed', { 
            error: organizerResponse.error.message, 
            organizerEmail, 
            donationId 
          });
        } else {
          emailsSent.organizer = true;
          logEvent('info', 'organizer_email_sent', { organizerEmail, donationId });
        }
      } catch (error) {
        logEvent('error', 'organizer_email_exception', { 
          error: error.message, 
          organizerEmail, 
          donationId 
        });
      }
    }

    // Update log with send timestamps
    const updateData: any = {};
    if (emailsSent.receipt) {
      updateData.receipt_sent_at = new Date().toISOString();
    }
    if (emailsSent.organizer) {
      updateData.organizer_sent_at = new Date().toISOString();
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('receipt_logs')
        .update(updateData)
        .eq('id', logEntry.id);
    }

    logEvent('info', 'email_sending_completed', { 
      donationId, 
      paymentIntentId,
      receiptSent: emailsSent.receipt,
      organizerSent: emailsSent.organizer
    });

  } catch (error) {
    logEvent('error', 'email_sending_failed', { 
      error: error.message, 
      donationId, 
      paymentIntentId 
    });
  }
}