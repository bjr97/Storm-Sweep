import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
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

export interface BookingConfirmationEmailProps {
  customerName: string
  scheduledDate: string
  timeWindow: string
  address: string
  serviceSummary: string
  totalAmount: string
  sweeperName: string
  portalUrl: string
}

export function BookingConfirmationEmail({
  customerName,
  scheduledDate,
  timeWindow,
  address,
  serviceSummary,
  totalAmount,
  sweeperName,
  portalUrl,
}: BookingConfirmationEmailProps): React.ReactElement {
  return (
    <Html>
      <Head />
      <Preview>Your Storm Sweep is confirmed for {scheduledDate}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>STORM SWEEP</Heading>
          <Text style={tagline}>Norman, Oklahoma · Shelter Cleaning Pros</Text>
          <Hr style={hr} />

          <Heading as="h2" style={subheading}>
            Booking Confirmed 🌪️
          </Heading>
          <Text style={paragraph}>Hi {customerName},</Text>
          <Text style={paragraph}>
            Your underground storm shelter cleaning is confirmed. Here are your
            details:
          </Text>

          <Section style={summaryBox}>
            <Text style={summaryRow}>
              <strong>Date:</strong> {scheduledDate}
            </Text>
            <Text style={summaryRow}>
              <strong>Window:</strong> {timeWindow}
            </Text>
            <Text style={summaryRow}>
              <strong>Address:</strong> {address}
            </Text>
            <Text style={summaryRow}>
              <strong>Services:</strong> {serviceSummary}
            </Text>
            <Text style={summaryRow}>
              <strong>Total:</strong> {totalAmount}
            </Text>
            <Text style={summaryRow}>
              <strong>Your Sweeper:</strong> {sweeperName}
            </Text>
          </Section>

          <Text style={paragraph}>
            Track your job, view photos, and manage your account in your customer
            portal.
          </Text>

          <Button style={button} href={portalUrl}>
            Open Customer Portal
          </Button>

          <Text style={footer}>
            Questions? Reply to this email or text us. We&apos;ll send a reminder
            the day before your visit.
          </Text>
          <Text style={footerMuted}>
            Storm Sweep · Norman, OK ·{' '}
            <Link href="https://stormsweep.com" style={link}>
              stormsweep.com
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default BookingConfirmationEmail

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

const summaryBox: React.CSSProperties = {
  backgroundColor: brand.cream,
  borderRadius: '6px',
  padding: '16px 20px',
  margin: '0 0 24px',
}

const summaryRow: React.CSSProperties = {
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
  margin: '0 0 8px',
}

const footerMuted: React.CSSProperties = {
  color: '#999999',
  fontSize: '12px',
  margin: '0',
}

const link: React.CSSProperties = {
  color: brand.sky,
  textDecoration: 'underline',
}
