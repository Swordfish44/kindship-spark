import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import Stripe from 'https://esm.sh/stripe@14.23.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'

const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY')!
const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2024-06-20' })

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const since = body.since ? new Date(body.since) : new Date(Date.now() - 1000*60*60*24*30) // default 30d
    const limit = Math.min(500, Math.max(1, Number(body.limit || 200)))

    console.log(`Syncing ledger data since ${since.toISOString()}, limit ${limit}`)

    // Find candidate donations needing fee backfill
    const { data: rows, error } = await supabase.rpc('select_donations_for_fee_backfill', {
      p_since: since.toISOString(), 
      p_limit: limit
    })
    
    if (error) {
      console.error('Error fetching donations for backfill:', error)
      throw error
    }

    console.log(`Found ${rows?.length || 0} donations to process`)

    let updated = 0
    for (const r of rows as any[]) {
      try {
        // r: { pi: text, campaign_id: uuid, organizer_acct: text }
        const pi = await stripe.paymentIntents.retrieve(r.pi, { 
          stripeAccount: r.organizer_acct 
        })
        
        const charge = pi.charges?.data?.[0]
        if (!charge) {
          console.log(`No charge found for PI ${r.pi}`)
          continue
        }

        const chargeId = charge.id
        const balId = typeof charge.balance_transaction === 'string' 
          ? charge.balance_transaction 
          : (charge.balance_transaction as any)?.id
          
        let stripeFee = 0
        if (balId) {
          try {
            const bal = await stripe.balanceTransactions.retrieve(balId as string, { 
              stripeAccount: r.organizer_acct 
            })
            stripeFee = bal.fee ?? 0
          } catch (balError) {
            console.warn(`Could not fetch balance transaction ${balId}:`, balError)
          }
        }

        const { error: upErr } = await supabase
          .from('donations')
          .update({
            stripe_charge_id: chargeId,
            stripe_balance_txn_id: balId,
            stripe_fee_cents: stripeFee
          })
          .eq('stripe_payment_intent_id', r.pi)
          
        if (!upErr) {
          updated++
          console.log(`Updated donation ${r.pi} with fee ${stripeFee}`)
        } else {
          console.error(`Error updating donation ${r.pi}:`, upErr)
        }
      } catch (piError) {
        console.error(`Error processing PI ${r.pi}:`, piError)
      }
    }

    console.log(`Successfully updated ${updated} donations`)

    return new Response(JSON.stringify({ 
      updated, 
      processed: rows?.length || 0 
    }), { 
      status: 200, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    })
  } catch (e: any) {
    console.error('sync-ledger error:', e)
    return new Response(JSON.stringify({ 
      error: e.message || 'Internal server error' 
    }), { 
      status: 500, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    })
  }
})