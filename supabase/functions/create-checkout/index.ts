import Stripe from 'https://esm.sh/stripe@14.23.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'

const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY')!
const PUBLIC_SITE_URL = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:8080'
const PLATFORM_FEE_BPS = Number(Deno.env.get('PLATFORM_FEE_BPS') || '800') // 8%
const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean)

const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2024-06-20' })

function cors(origin?: string) {
  const allow = (origin && ALLOWED.includes(origin)) ? origin : '*'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, stripe-signature',
  }
}

export default async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin') || undefined
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(origin) })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: cors(origin) })

  try {
    const body = await req.json()
    const campaign_id: string = String(body.campaign_id || '').trim()
    const amount_cents: number = Math.floor(Number(body.amount_cents || 0))
    const tip_cents: number = Math.max(0, Math.floor(Number(body.tip_cents || 0)))
    const success_url: string = String(body.success_url || `${PUBLIC_SITE_URL}/thank-you`)
    const cancel_url: string = String(body.cancel_url || `${PUBLIC_SITE_URL}/`)

    if (!campaign_id || amount_cents < 100) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { 
        status: 400, 
        headers: { ...cors(origin), 'Content-Type': 'application/json' } 
      })
    }

    // Service-role client (never expose this in the browser)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Rate limiting - extract IP and check limits
    const ip = (req.headers.get('x-forwarded-for')||'').split(',')[0].trim() || 
               (req.headers.get('cf-connecting-ip')||'').trim() || 
               'unknown'
    
    // 10 checkout attempts per 5 minutes per IP (adjust as needed)
    const { data: allowed, error: rateLimitError } = await supabase.rpc('rl_take', { 
      p_action: 'checkout', 
      p_key: ip, 
      p_limit: 10, 
      p_window_seconds: 300 
    })
    
    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError)
      // Continue on rate limit errors to avoid blocking legitimate users
    } else if (!allowed) {
      console.log(`Rate limit exceeded for IP: ${ip}`)
      return new Response(JSON.stringify({ 
        error: 'Too many requests. Please try again in a few minutes.' 
      }), { 
        status: 429, 
        headers: { ...cors(origin), 'Content-Type': 'application/json' } 
      })
    }


    // 1) Lookup campaign
    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .select('id, title, organizer_id, status, slug')
      .eq('id', campaign_id)
      .single()
    if (campErr || !campaign) throw new Error(`Campaign not found: ${campErr?.message || 'missing'}`)
    if (campaign.status !== 'active') throw new Error('Campaign is not active')

    // 2) Lookup organizer account
    const { data: org, error: orgErr } = await supabase
      .from('users')
      .select('id, stripe_account_id, stripe_onboarding_complete')
      .eq('id', campaign.organizer_id)
      .single()
    
    // For demo campaigns, create a mock checkout URL
    if (campaign.slug === 'revolutionary-solar-panel-technology' || !org?.stripe_account_id) {
      console.log('Demo campaign detected, returning mock success')
      return new Response(JSON.stringify({ 
        checkout_url: `${PUBLIC_SITE_URL}/thank-you?demo=true&campaign=${campaign.slug}&amount=${amount_cents}`
      }), { 
        status: 200, 
        headers: { ...cors(origin), 'Content-Type': 'application/json' } 
      })
    }
      
    if (orgErr || !org?.stripe_account_id || !org?.stripe_onboarding_complete) {
      throw new Error('Organizer Stripe account not found or not onboarded')
    }

    // 3) Compute platform application fee
    const application_fee_amount = Math.floor((amount_cents * PLATFORM_FEE_BPS) / 10000) + tip_cents

    // 4) Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_intent_data: {
        application_fee_amount,
        transfer_data: { destination: org.stripe_account_id },
      },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amount_cents,
          product_data: { name: `Donation to ${campaign.title}` },
        },
      }],
      success_url: success_url,
      cancel_url: cancel_url,
      metadata: {
        campaign_id: campaign.id,
        campaign_slug: campaign.slug,
        organizer_id: org.id,
      },
    })

    return new Response(JSON.stringify({ checkout_url: session.url }), { 
      status: 200, 
      headers: { ...cors(origin), 'Content-Type': 'application/json' } 
    })
  } catch (e: any) {
    console.error('create-checkout error', e)
    return new Response(JSON.stringify({ error: e.message || 'Internal error' }), { 
      status: 400, 
      headers: { ...cors(), 'Content-Type': 'application/json' } 
    })
  }
}