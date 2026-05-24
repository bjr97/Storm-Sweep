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
  cream: '#F7F7F4',
  charcoal: '#141416',
  text: '#333333',
  muted: '#666666',
}

export interface JobCompleteEmailProps {
  customerName: string
  completedDate: string
  address: string
  serviceSummary: string
  beforePhotoUrls: string[]
  afterPhotoUrls: string[]
  upgradeNotes: string | null
  portalUrl: string
  reportUrl: string
}

export function JobCompleteEmail({
  customerName,
  completedDate,
  address,
  serviceSummary,
  beforePhotoUrls,
  afterPhotoUrls,
  upgradeNotes,
  portalUrl,
  reportUrl,
}: JobCompleteEmailProps): React.ReactElement {
  return (
    <Html>
      <Head />
      <Preview>Your Storm Sweep is complete — view your before &amp; after photos</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>STORM SWEEP</Heading>
          <Text style={tagline}>Service Complete Report</Text>
          <Hr style={hr} />

          <Heading as="h2" style={subheading}>
            All Done! 🎉
          </Heading>
          <Text style={paragraph}>Hi {customerName},</Text>
          <Text style={paragraph}>
            Your shelter cleaning at {address} was completed on {completedDate}.
            Here&apos;s your service summary:
          </Text>

          <Section style={summaryBox}>
            <Text style={summaryRow}>
              <strong>Services:</strong> {serviceSummary}
            </Text>
            {upgradeNotes ? (
              <Text style={summaryRow}>
                <strong>Upgrade recommendations:</strong> {upgradeNotes}
              </Text>
            ) : null}
          </Section>

          {beforePhotoUrls.length > 0 ? (
            <Section style={photoSection}>
              <Text style={photoHeading}>Before Photos</Text>
              {beforePhotoUrls.map((url) => (
                <Link key={url} href={url} style={photoLink}>
                  View before photo
                </Link>
              ))}
            </Section>
          ) : null}

          {afterPhotoUrls.length > 0 ? (
            <Section style={photoSection}>
              <Text style={photoHeading}>After Photos</Text>
              {afterPhotoUrls.map((url) => (
                <Link key={url} href={url} style={photoLink}>
                  View after photo
                </Link>
              ))}
            </Section>
          ) : null}

          <Button style={button} href={reportUrl}>
            View Full Service Report
          </Button>
          <Button style={secondaryButton} href={portalUrl}>
            Open Customer Portal
          </Button>

          <Text style={footer}>
            Thank you for trusting Storm Sweep with your family&apos;s shelter.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default JobCompleteEmail

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

const photoSection: React.CSSProperties = {
  margin: '0 0 16px',
}

const photoHeading: React.CSSProperties = {
  color: brand.charcoal,
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
}

const photoLink: React.CSSProperties = {
  color: brand.sky,
  display: 'block',
  fontSize: '14px',
  margin: '0 0 6px',
}

const button: React.CSSProperties = {
  backgroundColor: brand.sky,
  borderRadius: '6px',
  color: '#ffffff',
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
