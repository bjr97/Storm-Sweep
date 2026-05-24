import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

const brand = {
  sky: '#2E86C1',
  wheat: '#D4A843',
  cream: '#F7F7F4',
  charcoal: '#141416',
  text: '#333333',
  muted: '#666666',
}

export interface MembershipReceiptEmailProps {
  customerName: string
  planLabel: string
  amount: string
  paymentDate: string
  renewalDate: string
  portalUrl: string
}

export function MembershipReceiptEmail({
  customerName,
  planLabel,
  amount,
  paymentDate,
  renewalDate,
  portalUrl,
}: MembershipReceiptEmailProps): React.ReactElement {
  return (
    <Html>
      <Head />
      <Preview>Your Storm Ready membership receipt — {amount}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>STORM SWEEP</Heading>
          <Text style={tagline}>Membership Receipt</Text>
          <Hr style={hr} />

          <Heading as="h2" style={subheading}>
            Payment Received
          </Heading>
          <Text style={paragraph}>Hi {customerName},</Text>
          <Text style={paragraph}>
            Thank you for your Storm Ready membership payment. Here is your
            receipt:
          </Text>

          <Section style={receiptBox}>
            <Text style={receiptRow}>
              <strong>Plan:</strong> {planLabel}
            </Text>
            <Text style={receiptRow}>
              <strong>Amount paid:</strong> {amount}
            </Text>
            <Text style={receiptRow}>
              <strong>Payment date:</strong> {paymentDate}
            </Text>
            <Text style={receiptRow}>
              <strong>Next renewal:</strong> {renewalDate}
            </Text>
          </Section>

          <Text style={paragraph}>
            Your membership renews automatically via Stripe. Manage billing,
            update payment methods, or cancel anytime from your portal.
          </Text>

          <Button style={button} href={portalUrl}>
            Manage Membership
          </Button>

          <Text style={footer}>
            This receipt is for your records. No action is required unless you
            want to schedule your next visit.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default MembershipReceiptEmail

const main: React.CSSProperties = {
  backgroundColor: brand.cream,
  fontFamily: 'Barlow, Arial, sans-serif',
}

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '32px 24px',
  maxWidth: '560px',
  borderRadius: '8px',
}

const heading: React.CSSProperties = {
  color: brand.sky,
  fontSize: '32px',
  fontWeight: '700',
  letterSpacing: '2px',
  margin: '0 0 4px',
  fontFamily: 'Bebas Neue, Arial, sans-serif',
}

const tagline: React.CSSProperties = {
  color: brand.muted,
  fontSize: '13px',
  margin: '0 0 16px',
}

const subheading: React.CSSProperties = {
  color: brand.charcoal,
  fontSize: '22px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const paragraph: React.CSSProperties = {
  color: brand.text,
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const receiptBox: React.CSSProperties = {
  backgroundColor: brand.cream,
  borderRadius: '6px',
  padding: '16px 20px',
  margin: '0 0 24px',
}

const receiptRow: React.CSSProperties = {
  color: brand.text,
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 8px',
}

const button: React.CSSProperties = {
  backgroundColor: brand.sky,
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600',
  padding: '12px 24px',
  textDecoration: 'none',
  textAlign: 'center',
  margin: '0 0 24px',
}

const hr: React.CSSProperties = {
  borderColor: '#e5e5e5',
  margin: '0 0 24px',
}

const footer: React.CSSProperties = {
  color: brand.muted,
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
}
