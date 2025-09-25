import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface CampaignUpdateProps {
  campaignTitle: string
  updateTitle: string
  updateContent: string
  organizerName: string
  campaignUrl: string
  siteName: string
  unsubscribeUrl?: string
}

export const CampaignUpdateEmail = ({
  campaignTitle,
  updateTitle,
  updateContent,
  organizerName,
  campaignUrl,
  siteName,
  unsubscribeUrl,
}: CampaignUpdateProps) => (
  <Html>
    <Head />
    <Preview>{campaignTitle} - {updateTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={campaignLabel}>Campaign Update</Text>
          <Heading style={h1}>{updateTitle}</Heading>
          <Text>{campaignTitle}</Text>
        </Section>
        
        <Section style={contentSection}>
          <Text style={greeting}>Hello!</Text>
          <Text style={text}>
            {organizerName} has shared an important update about the "{campaignTitle}" campaign:
          </Text>
          
          <Section style={updateSection}>
            <div dangerouslySetInnerHTML={{ __html: updateContent }} />
          </Section>
        </Section>

        <Section style={buttonSection}>
          <Link href={campaignUrl} style={button}>
            View Full Campaign
          </Link>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            You're receiving this update because you've supported or subscribed to updates for this campaign.
          </Text>
          {unsubscribeUrl && (
            <Text style={footerText}>
              <Link href={unsubscribeUrl} style={unsubscribeLink}>
                Unsubscribe from campaign updates
              </Link>
            </Text>
          )}
          <Text style={footerText}>
            Thank you for being part of the {siteName} community.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default CampaignUpdateEmail

const main = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
}

const header = {
  textAlign: 'center' as const,
  padding: '40px 0',
}

const campaignLabel = {
  color: '#10b981',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0 0 8px',
}

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 16px',
  lineHeight: '1.2',
}

const campaignTitle = {
  color: '#6b7280',
  fontSize: '18px',
  margin: '0',
  fontStyle: 'italic',
}

const contentSection = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '32px',
  marginBottom: '32px',
  border: '1px solid #e5e7eb',
}

const greeting = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
}

const updateSection = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  border: '1px solid #e5e7eb',
}

const buttonSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const button = {
  backgroundColor: '#10b981',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
}

const footer = {
  borderTop: '1px solid #e5e7eb',
  paddingTop: '32px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#9ca3af',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 12px',
}

const unsubscribeLink = {
  color: '#6b7280',
  textDecoration: 'underline',
}