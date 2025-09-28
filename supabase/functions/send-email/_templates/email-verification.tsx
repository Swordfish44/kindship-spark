import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'https://esm.sh/@react-email/components@0.0.22'
import * as React from 'https://esm.sh/react@18.3.1'

interface EmailVerificationProps {
  verificationUrl: string
  siteName: string
  siteUrl: string
}

export const EmailVerificationEmail = ({
  verificationUrl,
  siteName,
  siteUrl,
}: EmailVerificationProps) => (
  <Html>
    <Head />
    <Preview>Verify your email address for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to {siteName}!</Heading>
        <Text style={text}>
          Thank you for signing up with the National Black Treasury. To complete your registration and secure your account, please verify your email address.
        </Text>
        <Link
          href={verificationUrl}
          target="_blank"
          style={{
            ...button,
            display: 'block',
            marginBottom: '16px',
          }}
        >
          Verify Email Address
        </Link>
        <Text style={text}>
          This link will expire in 24 hours for security reasons. If you didn't create an account with us, you can safely ignore this email.
        </Text>
        <Text style={footer}>
          Best regards,<br />
          The National Black Treasury Team<br />
          <Link
            href={siteUrl}
            target="_blank"
            style={{ ...link, color: '#898989' }}
          >
            {siteUrl}
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailVerificationEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  lineHeight: '42px',
}

const text = {
  color: '#444',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const button = {
  backgroundColor: '#000',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '12px 20px',
  marginTop: '16px',
  marginBottom: '16px',
}

const link = {
  color: '#0070f3',
  textDecoration: 'underline',
}

const footer = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '22px',
  marginTop: '32px',
  marginBottom: '24px',
}