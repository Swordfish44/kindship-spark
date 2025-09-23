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
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface MarketingNewsletterProps {
  subject: string
  content: string
  siteName: string
  siteUrl: string
  unsubscribeUrl?: string
  previewText?: string
}

export const MarketingNewsletterEmail = ({
  subject,
  content,
  siteName,
  siteUrl,
  unsubscribeUrl,
  previewText,
}: MarketingNewsletterProps) => (
  <Html>
    <Head />
    <Preview>{previewText || subject}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Link href={siteUrl} style={logoLink}>
            <Heading style={logo}>{siteName}</Heading>
          </Link>
          <Hr style={hr} />
        </Section>
        
        <Section style={contentSection}>
          <Heading style={h1}>{subject}</Heading>
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </Section>

        <Section style={ctaSection}>
          <Link href={siteUrl} style={button}>
            Explore Campaigns
          </Link>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            You're receiving this newsletter because you've subscribed to updates from {siteName}.
          </Text>
          {unsubscribeUrl && (
            <Text style={footerText}>
              <Link href={unsubscribeUrl} style={unsubscribeLink}>
                Unsubscribe from marketing emails
              </Link>
            </Text>
          )}
          <Text style={footerText}>
            © 2024 {siteName}. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MarketingNewsletterEmail

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
  padding: '32px 0',
  textAlign: 'center' as const,
}

const logoLink = {
  textDecoration: 'none',
}

const logo = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}

const contentSection = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '40px',
  marginBottom: '32px',
  border: '1px solid #e5e7eb',
}

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 32px',
  lineHeight: '1.2',
  textAlign: 'center' as const,
}

const ctaSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const button = {
  backgroundColor: '#3b82f6',
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