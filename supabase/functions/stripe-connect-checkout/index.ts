import Stripe from 'https://esm.sh/stripe@14.23.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'

/**
 * Stripe Connect Checkout Edge Function
 * 
 * This function handles creating checkout sessions for marketplace purchases.
 * It uses destination charges with application fees to monetize transactions.
 * 
 * Endpoints:
 * - POST /create-checkout-session - Creates a checkout session with destination charge
 * - POST /get-session-status - Retrieves checkout session status
 */

function logEvent(level: 'info' | 'warn' | 'error', event: string, data?: any) {
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    event,
    function: 'stripe-connect-checkout',
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

  const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173';

  // Initialize Stripe with the latest API version
  const stripe = new Stripe(stripeSecretKey, { 
    apiVersion: '2023-10-16', // Using stable version for Deno compatibility
    typescript: true
  });

  try {
    const { action, ...payload } = await req.json();
    logEvent('info', 'request_received', { action });

    switch (action) {
      case 'create-checkout-session': {
        /**
         * Creates a checkout session with destination charge and application fee.
         * The majority of the payment goes to the connected account,
         * while the platform takes an application fee.
         */
        const { 
          productIds, // Array of {productId, quantity} objects
          connectedAccountId,
          customerEmail,
          // Platform fee configuration
          applicationFeePercent = 5, // Default 5% platform fee
          metadata = {}
        } = payload;

        // Validate required fields
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
          return new Response(JSON.stringify({ 
            error: 'productIds array is required and must not be empty' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!connectedAccountId) {
          return new Response(JSON.stringify({ 
            error: 'connectedAccountId is required' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        logEvent('info', 'creating_checkout_session', { 
          connectedAccountId, 
          productCount: productIds.length 
        });

        try {
          // Fetch product and price information for all items
          const lineItems = await Promise.all(
            productIds.map(async (item: any) => {
              const { productId, quantity = 1 } = item;
              
              if (!productId) {
                throw new Error('Each item must have a productId');
              }

              const product = await stripe.products.retrieve(productId);
              
              if (!product.default_price) {
                throw new Error(`Product ${productId} has no default price`);
              }

              const price = await stripe.prices.retrieve(product.default_price as string);

              return {
                price_data: {
                  currency: price.currency,
                  product_data: {
                    name: product.name,
                    description: product.description || undefined,
                    images: product.images || []
                  },
                  unit_amount: price.unit_amount
                },
                quantity: quantity
              };
            })
          );

          // Calculate total amount for application fee calculation
          const totalAmount = lineItems.reduce((sum, item) => {
            return sum + (item.price_data.unit_amount! * item.quantity);
          }, 0);

          // Calculate application fee (platform's commission)
          // TODO: Customize this logic based on your business model
          const applicationFeeAmount = Math.round(totalAmount * (applicationFeePercent / 100));

          logEvent('info', 'calculated_fees', { 
            totalAmount, 
            applicationFeeAmount, 
            feePercent: applicationFeePercent 
          });

          // Create checkout session with destination charge
          const session = await stripe.checkout.sessions.create({
            // Line items for the checkout
            line_items: lineItems,
            mode: 'payment',
            
            // Payment intent configuration for destination charge
            payment_intent_data: {
              // Application fee goes to the platform
              application_fee_amount: applicationFeeAmount,
              
              // Transfer configuration - remaining amount goes to connected account
              transfer_data: {
                destination: connectedAccountId,
              },
              
              // Optional: Add metadata for tracking
              metadata: {
                connected_account_id: connectedAccountId,
                platform_fee_amount: applicationFeeAmount.toString(),
                ...metadata
              }
            },

            // Redirect URLs
            success_url: `${siteUrl}/stripe-connect/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${siteUrl}/stripe-connect/storefront`,

            // Optional: Pre-fill customer email
            ...(customerEmail && { customer_email: customerEmail }),

            // Optional: Collect customer information
            customer_creation: 'if_required',
            billing_address_collection: 'required',
            shipping_address_collection: {
              allowed_countries: ['US', 'CA', 'GB', 'AU'] // Customize based on your needs
            },

            // Session metadata
            metadata: {
              connected_account_id: connectedAccountId,
              application_fee_percent: applicationFeePercent.toString(),
              ...metadata
            }
          });

          logEvent('info', 'checkout_session_created', { 
            sessionId: session.id,
            connectedAccountId,
            applicationFeeAmount
          });

          return new Response(JSON.stringify({
            sessionId: session.id,
            url: session.url,
            totalAmount: totalAmount,
            applicationFeeAmount: applicationFeeAmount,
            destinationAmount: totalAmount - applicationFeeAmount
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (error: any) {
          logEvent('error', 'checkout_session_creation_failed', { 
            error: error.message,
            connectedAccountId
          });
          
          return new Response(JSON.stringify({ 
            error: `Failed to create checkout session: ${error.message}` 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      case 'get-session-status': {
        /**
         * Retrieves the status of a checkout session.
         * Useful for post-purchase confirmation and order tracking.
         */
        const { sessionId } = payload;

        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Session ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        logEvent('info', 'getting_session_status', { sessionId });

        try {
          const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent', 'line_items']
          });

          let paymentStatus = 'unknown';
          let transferInfo = null;

          if (session.payment_intent && typeof session.payment_intent === 'object') {
            paymentStatus = session.payment_intent.status;
            
            // Get transfer information if payment was successful
            if (session.payment_intent.status === 'succeeded' && session.payment_intent.transfer_data) {
              transferInfo = {
                destination: session.payment_intent.transfer_data.destination,
                amount: session.payment_intent.transfer_data.amount || 
                       (session.payment_intent.amount_received - (session.payment_intent.application_fee_amount || 0))
              };
            }
          }

          return new Response(JSON.stringify({
            sessionId: session.id,
            paymentStatus: paymentStatus,
            paymentIntentId: typeof session.payment_intent === 'string' ? 
                           session.payment_intent : session.payment_intent?.id,
            customerEmail: session.customer_details?.email,
            totalAmount: session.amount_total,
            currency: session.currency,
            metadata: session.metadata,
            transferInfo: transferInfo,
            // Line items information
            lineItems: session.line_items?.data?.map((item: any) => ({
              description: item.description,
              quantity: item.quantity,
              amount: item.amount_total,
              currency: item.currency
            })) || []
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (error: any) {
          logEvent('error', 'session_status_get_failed', { 
            sessionId, 
            error: error.message 
          });
          
          return new Response(JSON.stringify({ 
            error: `Failed to get session status: ${error.message}` 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      default: {
        logEvent('warn', 'invalid_action', { action });
        return new Response(JSON.stringify({ 
          error: `Invalid action: ${action}. Valid actions are: create-checkout-session, get-session-status` 
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