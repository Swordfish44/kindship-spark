import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const SITE = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:5173'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export default async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const js = `(()=>{
    try{
      const s = document.currentScript; if(!s) return;
      const slug = s.getAttribute('data-slug'); if(!slug) return console.error('[FundFlow] Missing data-slug');
      const width = s.getAttribute('data-width') || '100%';
      const currency = s.getAttribute('data-currency') || 'USD';
      const amounts = (s.getAttribute('data-amounts')||'').replace(/\\s+/g,'');
      const origin = '${SITE}'.replace(/\\/$/,'');
      const src = origin + '/embed/' + encodeURIComponent(slug) + '?currency=' + encodeURIComponent(currency) + (amounts?('&amounts='+encodeURIComponent(amounts)):'');
      const id = 'fundflow-embed-'+Math.random().toString(36).slice(2);
      const iframe = document.createElement('iframe');
      iframe.src = src; iframe.id = id; iframe.title = 'Donate';
      iframe.style.border='0'; iframe.style.width = width; iframe.style.minWidth='280px'; iframe.style.overflow='hidden';
      iframe.allow = 'payment *';
      // default height until first postMessage
      iframe.style.height='420px';
      s.parentNode?.insertBefore(iframe, s);

      window.addEventListener('message', (ev)=>{
        try{
          const d = ev.data || {}; if(!d.__NBT_EMBED__ || d.type!=='height') return;
          if (ev.source === iframe.contentWindow) {
            iframe.style.height = Math.max(320, Number(d.height||0)) + 'px';
          }
        }catch(e){}
      });
    }catch(e){console.error('[FundFlow embed]',e)}
  })();`

  return new Response(js, { 
    headers: { 
      ...corsHeaders,
      'Content-Type': 'text/javascript; charset=utf-8', 
      'Cache-Control': 'public, max-age=600' 
    } 
  })
}