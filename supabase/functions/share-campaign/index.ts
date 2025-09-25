import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'

const SITE_URL = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:8080'
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function esc(s: string) { 
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') 
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export default async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url)
    const slug = url.pathname.split('/').filter(Boolean).pop() || url.searchParams.get('slug') || ''
    
    if (!slug) {
      return new Response('Missing slug', { status: 400 })
    }

    console.log('Share campaign request for slug:', slug)

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('title, description, image_url, funding_goal_cents')
      .eq('slug', slug)
      .eq('status', 'active')
      .single()

    if (error) {
      console.error('Database error:', error)
    }

    const title = campaign?.title || 'Support this campaign'
    const desc = (campaign?.description || '').slice(0, 180)
    const img = campaign?.image_url || `${SITE_URL}/social-fallback.jpg`
    const canonical = `${SITE_URL}/campaign/${slug}`

    console.log('Generated meta data:', { title, desc, img, canonical })

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <link rel="canonical" href="${canonical}">
  <meta name="description" content="${esc(desc)}" />
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${esc(img)}" />
  <meta property="og:url" content="${canonical}" />
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="${esc(img)}" />
  <!-- Instant redirect for humans -->
  <meta http-equiv="refresh" content="0; url=${canonical}" />
  <script>location.replace(${JSON.stringify(canonical)})</script>
  <style>body{font-family:system-ui,Segoe UI,Roboto,Arial;padding:24px}a{color:#111827}</style>
</head>
<body>
  <p>Redirecting to <a href="${canonical}">${canonical}</a>…</p>
</body>
</html>`

    return new Response(html, { 
      status: 200, 
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        ...corsHeaders 
      } 
    })
  } catch (error: any) {
    console.error('Error in share-campaign function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      }
    })
  }
}