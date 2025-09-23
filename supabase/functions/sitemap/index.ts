import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'

const SITE_URL = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:8080'
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

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
    console.log('Generating sitemap...')

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('slug, updated_at')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(500)

    if (error) {
      console.error('Database error:', error)
    }

    const urls = [
      `${SITE_URL}/`,
      `${SITE_URL}/discover`,
      `${SITE_URL}/auth`,
      ...((campaigns || []).map(c => `${SITE_URL}/campaign/${c.slug}`))
    ]

    console.log(`Generated sitemap with ${urls.length} URLs`)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls.map(u => `\n  <url><loc>${u}</loc></url>`).join('') + `\n</urlset>`

    return new Response(xml, { 
      headers: { 
        'Content-Type': 'application/xml',
        ...corsHeaders 
      } 
    })
  } catch (error: any) {
    console.error('Error in sitemap function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      }
    })
  }
}