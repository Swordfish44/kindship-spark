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

    const { campaignId, updateTitle, updateContent } = await req.json()

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        id,
        title,
        slug,
        organizer_id,
        users!campaigns_organizer_id_fkey(full_name, email)
      `)
      .eq('id', campaignId)
      .eq('status', 'active')
      .single()

    if (campaignError || !campaign) {
      throw new Error('Campaign not found or inactive')
    }

    // Get campaign subscribers who haven't unsubscribed
    const { data: subscribers, error: subscribersError } = await supabase
      .from('campaign_subscribers')
      .select('email, user_id')
      .eq('campaign_id', campaignId)
      .eq('is_active', true)

    if (subscribersError) {
      throw new Error('Failed to get subscribers')
    }

    // Get donors who should receive updates (haven't unsubscribed)
    const { data: donors, error: donorsError } = await supabase
      .from('donations')
      .select('donor_email, donor_id')
      .eq('campaign_id', campaignId)
      .not('donor_email', 'is', null)

    if (donorsError) {
      throw new Error('Failed to get donors')
    }

    // Combine subscribers and donors, remove duplicates
    const allRecipients = new Map<string, { email: string; userId?: string }>()
    
    subscribers?.forEach(sub => {
      if (sub.email) {
        allRecipients.set(sub.email, { email: sub.email, userId: sub.user_id })
      }
    })

    donors?.forEach(donor => {
      if (donor.donor_email && !allRecipients.has(donor.donor_email)) {
        allRecipients.set(donor.donor_email, { 
          email: donor.donor_email, 
          userId: donor.donor_id 
        })
      }
    })

    const recipients = Array.from(allRecipients.values())
    
    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recipients found' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    // Send emails to all recipients
    const emailPromises = recipients.map(async (recipient) => {
      // Check if user has unsubscribed from campaign updates
      const { data: isUnsubscribed } = await supabase
        .rpc('is_user_unsubscribed', {
          email_address: recipient.email,
          email_type_check: 'campaign_updates'
        })

      if (isUnsubscribed) {
        console.log(`Skipping ${recipient.email} - unsubscribed from campaign updates`)
        return null
      }

      // Check email preferences if user is logged in
      if (recipient.userId) {
        const { data: preferences } = await supabase
          .from('email_preferences')
          .select('is_enabled')
          .eq('user_id', recipient.userId)
          .eq('email_type', 'campaign_updates')
          .single()

        if (preferences && !preferences.is_enabled) {
          console.log(`Skipping ${recipient.email} - campaign updates disabled in preferences`)
          return null
        }
      }

      const unsubscribeUrl = `${Deno.env.get('PUBLIC_SITE_URL')}/unsubscribe?email=${encodeURIComponent(recipient.email)}&type=campaign_updates`
      const campaignUrl = `${Deno.env.get('PUBLIC_SITE_URL')}/campaign/${campaign.slug}`

      return fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          emailType: 'campaign_update',
          data: {
            recipientEmail: recipient.email,
            recipientUserId: recipient.userId,
            campaignTitle: campaign.title,
            updateTitle,
            updateContent,
            organizerName: (campaign.users as any)?.full_name || 'Campaign Organizer',
            campaignUrl,
            unsubscribeUrl,
          },
        }),
      })
    })

    const results = await Promise.allSettled(emailPromises)
    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value !== null
    ).length

    console.log(`Campaign update sent to ${successCount} recipients for campaign: ${campaign.title}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        recipientCount: successCount,
        totalRecipients: recipients.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )

  } catch (error: any) {
    console.error('Error sending campaign update:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send campaign update' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})