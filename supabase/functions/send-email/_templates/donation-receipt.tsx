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
  Row,
  Column,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface DonationReceiptProps {
  donorName: string
  campaignTitle: string
  amount: string
  date: string
  message?: string
  siteUrl: string
  siteName: string
}

export const DonationReceiptEmail = ({
  donorName,
  campaignTitle,
  amount,
  date,
  message,
  siteUrl,
  siteName,
}: DonationReceiptProps) => (
  <Html>
    <Head />
    <Preview>Thank you for your generous donation to {campaignTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Thank You! 💛</Heading>
          <Text style={subtitle}>Your donation has been received</Text>
        </Section>
        
        <Section style={receiptSection}>
          <Heading style={h2}>Donation Receipt</Heading>
          <Row style={receiptRow}>
            <Column style={receiptLabel}>Campaign:</Column>
            <Column style={receiptValue}>{campaignTitle}</Column>
          </Row>
          <Row style={receiptRow}>
            <Column style={receiptLabel}>Amount:</Column>
            <Column style={receiptValue}>{amount}</Column>
          </Row>
          <Row style={receiptRow}>
            <Column style={receiptLabel}>Donor:</Column>
            <Column style={receiptValue}>{donorName}</Column>
          </Row>
          <Row style={receiptRow}>
            <Column style={receiptLabel}>Date:</Column>
            <Column style={receiptValue}>{date}</Column>
          </Row>
          {message && (
            <Row style={receiptRow}>
              <Column style={receiptLabel}>Message:</Column>
              <Column style={receiptValue}>{message}</Column>
            </Row>
          )}
        </Section>

        <Section style={contentSection}>
          <Text style={text}>
            Your generous donation will help make a real difference. You'll receive 
            updates on how your contribution is being used to support this important cause.
          </Text>
          <Text style={text}>
            This receipt serves as confirmation of your donation. Please keep this 
            for your records.
          </Text>
        </Section>

        <Section style={buttonSection}>
          <Link href={siteUrl} style={button}>
            View Campaign Progress
          </Link>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            Thank you for supporting {campaignTitle} through {siteName}.
          </Text>
          <Text style={footerText}>
            If you have any questions, please contact us through our website.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default DonationReceiptEmail

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

const h1 = {
  color: '#1f2937',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 16px',
  lineHeight: '1.2',
}

const subtitle = {
  color: '#6b7280',
  fontSize: '18px',
  margin: '0',
}

const h2 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 24px',
}

const receiptSection = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '32px',
  marginBottom: '32px',
  border: '1px solid #e5e7eb',
}

const receiptRow = {
  marginBottom: '16px',
}

const receiptLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  width: '120px',
}

const receiptValue = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '500',
}

const contentSection = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '32px',
  marginBottom: '32px',
  border: '1px solid #e5e7eb',
}

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const buttonSection = {
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
  margin: '0 0 8px',
}