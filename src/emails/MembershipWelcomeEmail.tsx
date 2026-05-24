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

export interface MembershipWelcomeEmailProps {
  customerName: string
  planLabel: string
  planPrice: string
  renewalDate: string
  visitsPerYear: number
  bookUrl: string
  portalUrl: string
}

export function MembershipWelcomeEmail({
  customerName,
  planLabel,
  planPrice,
  renewalDate,
  visitsPerYear,
  bookUrl,
  portalUrl,
}: MembershipWelcomeEmailProps): React.ReactElement {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Storm Ready — your membership is active</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>STORM SWEEP</Heading>
          <Text style={tagline}>Storm Ready Membership</Text>
          <Hr style={hr} />

          <Heading as="h2" style={subheading}>
            Welcome to Storm Ready 🌪️
          </Heading>
          <Text style={paragraph}>Hi {customerName},</Text>
          <Text style={paragraph}>
            You&apos;re officially Storm Ready. Your membership keeps your
            underground shelter clean, inspected, and ready when Oklahoma
            weather turns serious.
          </Text>

          <Section style={goldBox}>
            <Text style={planName}>{planLabel}</Text>
            <Text style={planPriceStyle}>{planPrice}</Text>
            <Text style={planDetail}>Renews: {renewalDate}</Text>
          </Section>

          <Section style={benefitsBox}>
            <Text style={benefitsHeading}>Your member benefits</Text>
            <Text style={benefitItem}>✓ {visitsPerYear} professional shelter visits per year</Text>
            <Text style={benefitItem}>✓ 10% off all upgrades (LED, supply kits, hardware)</Text>
            <Text style={benefitItem}>✓ Priority scheduling during tornado season</Text>
            <Text style={benefitItem}>✓ Before &amp; after photo documentation every visit</Text>
            <Text style={benefitItem}>✓ Member-only portal with full service history</Text>
          </Section>

          <Text style={paragraph}>
            Schedule your first included visit today — most members book one
            visit in spring and one before peak storm season.
          </Text>

          <Button style={button} href={bookUrl}>
            Schedule Your First Visit
          </Button>
          <Button style={secondaryButton} href={portalUrl}>
            Manage Membership
          </Button>

          <Text style={footer}>
            Questions about your plan? Reply to this email anytime.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default MembershipWelcomeEmail

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
  color: brand.wheat,
  fontSize: '13px',
  fontWeight: '600',
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

const goldBox: React.CSSProperties = {
  backgroundColor: '#FDF6E3',
  borderLeft: `4px solid ${brand.wheat}`,
  borderRadius: '6px',
  padding: '16px 20px',
  margin: '0 0 24px',
}

const planName: React.CSSProperties = {
  color: brand.charcoal,
  fontSize: '18px',
  fontWeight: '700',
  margin: '0 0 4px',
}

const planPriceStyle: React.CSSProperties = {
  color: brand.wheat,
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 4px',
}

const planDetail: React.CSSProperties = {
  color: brand.muted,
  fontSize: '13px',
  margin: '0',
}

const benefitsBox: React.CSSProperties = {
  margin: '0 0 24px',
}

const benefitsHeading: React.CSSProperties = {
  color: brand.charcoal,
  fontSize: '15px',
  fontWeight: '600',
  margin: '0 0 12px',
}

const benefitItem: React.CSSProperties = {
  color: brand.text,
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 6px',
}

const button: React.CSSProperties = {
  backgroundColor: brand.wheat,
  borderRadius: '6px',
  color: brand.charcoal,
  display: 'block',
  fontSize: '15px',
  fontWeight: '600',
  padding: '12px 24px',
  textDecoration: 'none',
  textAlign: 'center',
  margin: '0 0 12px',
}

const secondaryButton: React.CSSProperties = {
  ...button,
  backgroundColor: '#ffffff',
  border: `2px solid ${brand.sky}`,
  color: brand.sky,
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
