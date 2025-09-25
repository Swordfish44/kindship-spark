import Stripe from 'https://esm.sh/stripe@14.23.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'

/**
 * Stripe Connect Products Management Edge Function
 * 
 * This function handles creating and managing products for the marketplace.
 * Products are created at the platform level, with metadata linking them
 * to connected accounts for commission/fee calculation.
 * 
 * Endpoints:
 * - POST /create-product - Creates a new product with price
 * - POST /list-products - Lists all products (for storefront)
 * - POST /get-product - Gets a specific product by ID
 */

function logEvent(level: 'info' | 'warn' | 'error', event: string, data?: any) {
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    event,
    function: 'stripe-connect-products',
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

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

    switch (action) {
      case 'create-product': {
        /**
         * Creates a new product with pricing at the platform level.
         * The connected account ID is stored in metadata for commission calculation.
         */
        
        // Verify user authentication for product creation
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          logEvent('warn', 'authentication_failed', { error: authError?.message });
          return new Response(JSON.stringify({ error: 'Authentication required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { 
          name, 
          description, 
          priceInCents, 
          currency = 'usd', 
          connectedAccountId,
          images = [],
          // Optional: Add custom metadata for your business logic
          category,
          tags
        } = payload;

        // Validate required fields
        if (!name || !priceInCents || !connectedAccountId) {
          return new Response(JSON.stringify({ 
            error: 'Missing required fields: name, priceInCents, connectedAccountId are required' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (priceInCents < 50) {
          return new Response(JSON.stringify({ 
            error: 'Price must be at least $0.50 (50 cents)' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        logEvent('info', 'creating_product', { 
          userId: user.id, 
          connectedAccountId, 
          productName: name 
        });

        try {
          // Create product at platform level (not on connected account)
          const product = await stripe.products.create({
            name: name,
            description: description || '',
            images: images,
            // Store connected account information in metadata
            // This is crucial for determining where to transfer funds
            metadata: {
              connected_account_id: connectedAccountId,
              created_by_user_id: user.id,
              created_at: new Date().toISOString(),
              // Optional: Add business-specific metadata
              ...(category && { category }),
              ...(tags && { tags: Array.isArray(tags) ? tags.join(',') : tags })
            },
            // Set default price for the product
            default_price_data: {
              unit_amount: priceInCents,
              currency: currency.toLowerCase()
            }
          });

          logEvent('info', 'product_created', { 
            productId: product.id,
            defaultPriceId: product.default_price,
            connectedAccountId,
            userId: user.id
          });

          return new Response(JSON.stringify({
            productId: product.id,
            priceId: product.default_price,
            name: product.name,
            description: product.description,
            images: product.images,
            unitAmount: priceInCents,
            currency: currency,
            connectedAccountId: connectedAccountId
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (error: any) {
          logEvent('error', 'product_creation_failed', { 
            error: error.message,
            connectedAccountId,
            userId: user.id
          });
          
          return new Response(JSON.stringify({ 
            error: `Failed to create product: ${error.message}` 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      case 'list-products': {
        /**
         * Lists all products for the storefront.
         * This is a public endpoint that doesn't require authentication.
         */
        const { limit = 20, startingAfter } = payload;

        logEvent('info', 'listing_products', { limit });

        try {
          const products = await stripe.products.list({
            active: true,
            limit: Math.min(limit, 100), // Cap at 100 for performance
            ...(startingAfter && { starting_after: startingAfter })
          });

          // Get price information for each product
          const productsWithPrices = await Promise.all(
            products.data.map(async (product: any) => {
              let priceInfo = null;
              
              if (product.default_price) {
                try {
                  const price = await stripe.prices.retrieve(product.default_price as string);
                  priceInfo = {
                    id: price.id,
                    unitAmount: price.unit_amount,
                    currency: price.currency
                  };
                } catch (error) {
                  logEvent('warn', 'failed_to_fetch_price', { 
                    productId: product.id, 
                    priceId: product.default_price 
                  });
                }
              }

              return {
                id: product.id,
                name: product.name,
                description: product.description,
                images: product.images,
                metadata: product.metadata,
                price: priceInfo,
                // Extract connected account ID from metadata
                connectedAccountId: product.metadata?.connected_account_id || null,
                // Extract other useful metadata
                category: product.metadata?.category || null,
                tags: product.metadata?.tags ? product.metadata.tags.split(',') : []
              };
            })
          );

          logEvent('info', 'products_listed', { count: productsWithPrices.length });

          return new Response(JSON.stringify({
            products: productsWithPrices,
            hasMore: products.has_more
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (error: any) {
          logEvent('error', 'product_listing_failed', { error: error.message });
          
          return new Response(JSON.stringify({ 
            error: `Failed to list products: ${error.message}` 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      case 'get-product': {
        /**
         * Gets a specific product by ID with price information.
         */
        const { productId } = payload;

        if (!productId) {
          return new Response(JSON.stringify({ error: 'Product ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        logEvent('info', 'getting_product', { productId });

        try {
          const product = await stripe.products.retrieve(productId);
          
          let priceInfo = null;
          if (product.default_price) {
            const price = await stripe.prices.retrieve(product.default_price as string);
            priceInfo = {
              id: price.id,
              unitAmount: price.unit_amount,
              currency: price.currency
            };
          }

          return new Response(JSON.stringify({
            id: product.id,
            name: product.name,
            description: product.description,
            images: product.images,
            metadata: product.metadata,
            price: priceInfo,
            connectedAccountId: product.metadata?.connected_account_id || null,
            category: product.metadata?.category || null,
            tags: product.metadata?.tags ? product.metadata.tags.split(',') : []
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (error: any) {
          logEvent('error', 'product_get_failed', { 
            productId, 
            error: error.message 
          });
          
          return new Response(JSON.stringify({ 
            error: `Failed to get product: ${error.message}` 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      default: {
        logEvent('warn', 'invalid_action', { action });
        return new Response(JSON.stringify({ 
          error: `Invalid action: ${action}. Valid actions are: create-product, list-products, get-product` 
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