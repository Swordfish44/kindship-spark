import React from 'npm:react@18.3.1'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

import { DonationReceiptEmail } from './_templates/donation-receipt.tsx'
import { CampaignUpdateEmail } from './_templates/campaign-update.tsx'
import { MarketingNewsletterEmail } from './_templates/marketing-newsletter.tsx'

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
    const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { emailType, data } = await req.json()

    let html = ''
    let subject = ''
    let fromEmail = `${Deno.env.get('SITE_NAME')} <${Deno.env.get('FROM_EMAIL')}>`

    switch (emailType) {
      case 'donation_receipt':
        html = await renderAsync(
          React.createElement(DonationReceiptEmail, {
            donorName: data.donorName,
            campaignTitle: data.campaignTitle,
            amount: data.amount,
            date: data.date,
            message: data.message,
            siteUrl: Deno.env.get('PUBLIC_SITE_URL') ?? '',
            siteName: Deno.env.get('SITE_NAME') ?? '',
          })
        )
        subject = `Thank you for your donation to ${data.campaignTitle}`
        break

      case 'campaign_update':
        html = await renderAsync(
          React.createElement(CampaignUpdateEmail, {
            campaignTitle: data.campaignTitle,
            updateTitle: data.updateTitle,
            updateContent: data.updateContent,
            organizerName: data.organizerName,
            campaignUrl: data.campaignUrl,
            siteName: Deno.env.get('SITE_NAME') ?? '',
            unsubscribeUrl: data.unsubscribeUrl,
          })
        )
        subject = `${data.campaignTitle} - ${data.updateTitle}`
        break

      case 'marketing_newsletter':
        html = await renderAsync(
          React.createElement(MarketingNewsletterEmail, {
            subject: data.subject,
            content: data.content,
            siteName: Deno.env.get('SITE_NAME') ?? '',
            siteUrl: Deno.env.get('PUBLIC_SITE_URL') ?? '',
            unsubscribeUrl: data.unsubscribeUrl,
            previewText: data.previewText,
          })
        )
        subject = data.subject
        break

      default:
        throw new Error(`Unknown email type: ${emailType}`)
    }

    // Send email
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [data.recipientEmail],
      subject,
      html,
    })

    if (emailError) {
      throw emailError
    }

    // Log email send
    const { error: logError } = await supabase
      .from('email_sends')
      .insert({
        recipient_email: data.recipientEmail,
        recipient_user_id: data.recipientUserId,
        email_type: emailType,
        subject,
        status: 'sent',
        external_id: emailResult?.id,
        sent_at: new Date().toISOString(),
        metadata: { resend_data: emailResult },
      })

    if (logError) {
      console.error('Failed to log email send:', logError)
    }

    console.log('Email sent successfully:', {
      type: emailType,
      recipient: data.recipientEmail,
      subject,
      messageId: emailResult?.id,
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResult?.id 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )

  } catch (error: any) {
    console.error('Error sending email:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send email' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})