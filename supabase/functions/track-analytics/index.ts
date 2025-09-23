import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { eventType, campaignId, data } = await req.json()

    const today = new Date().toISOString().split('T')[0]
    const currentHour = new Date().getHours()

    switch (eventType) {
      case 'page_view':
        // Update daily analytics
        await supabase
          .from('campaign_analytics')
          .upsert({
            campaign_id: campaignId,
            recorded_date: today,
            page_views: 1,
            unique_visitors: data?.isUnique ? 1 : 0,
          }, {
            onConflict: 'campaign_id,recorded_date',
            count: 'none'
          })

        // Update hourly analytics
        await supabase
          .from('campaign_performance_hourly')
          .upsert({
            campaign_id: campaignId,
            recorded_at: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), currentHour).toISOString(),
            page_views: 1,
            unique_visitors: data?.isUnique ? 1 : 0,
          }, {
            onConflict: 'campaign_id,recorded_at',
            count: 'none'
          })
        break

      case 'social_share':
        await supabase
          .from('campaign_analytics')
          .upsert({
            campaign_id: campaignId,
            recorded_date: today,
            social_shares: 1,
          }, {
            onConflict: 'campaign_id,recorded_date',
            count: 'none'
          })

        await supabase
          .from('campaign_performance_hourly')
          .upsert({
            campaign_id: campaignId,
            recorded_at: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), currentHour).toISOString(),
            social_shares: 1,
          }, {
            onConflict: 'campaign_id,recorded_at',
            count: 'none'
          })
        break

      case 'email_open':
        await supabase
          .from('campaign_performance_hourly')
          .upsert({
            campaign_id: campaignId,
            recorded_at: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), currentHour).toISOString(),
            email_opens: 1,
          }, {
            onConflict: 'campaign_id,recorded_at',
            count: 'none'
          })
        break

      case 'email_click':
        await supabase
          .from('campaign_performance_hourly')
          .upsert({
            campaign_id: campaignId,
            recorded_at: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), currentHour).toISOString(),
            email_clicks: 1,
          }, {
            onConflict: 'campaign_id,recorded_at',
            count: 'none'
          })
        break

      case 'session_tracking':
        // Update session analytics
        await supabase
          .from('campaign_analytics')
          .upsert({
            campaign_id: campaignId,
            recorded_date: today,
            avg_session_duration: data?.sessionDuration || 0,
            bounce_rate: data?.bounceRate || 0,
            traffic_sources: data?.trafficSource ? { [data.trafficSource]: 1 } : {},
            device_breakdown: data?.deviceType ? { [data.deviceType]: 1 } : {},
            geographic_data: data?.location ? { [data.location]: 1 } : {},
          }, {
            onConflict: 'campaign_id,recorded_date',
            count: 'none'
          })
        break

      default:
        throw new Error(`Unknown event type: ${eventType}`)
    }

    console.log(`Analytics tracked: ${eventType} for campaign ${campaignId}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Analytics tracked successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )

  } catch (error: any) {
    console.error('Error tracking analytics:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to track analytics' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})