import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    
    if (!hookSecret) {
      console.error('SEND_EMAIL_HOOK_SECRET not set')
      return new Response('Configuration error', { status: 500 })
    }

    const wh = new Webhook(hookSecret)
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type, site_url },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
      }
    }

    // Only handle email confirmation
    if (email_action_type === 'signup') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Construct verification URL
      const verificationUrl = `${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`

      // Call our custom send-email function
      const sendEmailResponse = await fetch(`${site_url}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          emailType: 'email_verification',
          data: {
            recipientEmail: user.email,
            verificationUrl,
            siteName: 'National Black Treasury',
            siteUrl: Deno.env.get('PUBLIC_SITE_URL') ?? '',
          },
        }),
      })

      if (!sendEmailResponse.ok) {
        const error = await sendEmailResponse.text()
        console.error('Failed to send custom verification email:', error)
        return new Response('Failed to send email', { status: 500 })
      }

      console.log('Custom verification email sent to:', user.email)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (error: any) {
    console.error('Auth email hook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})