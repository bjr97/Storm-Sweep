import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import * as React from 'react'

// Email clients only support inline styles, so this template (like the others
// in src/emails) uses style objects — the no-inline-styles rule is for the app UI.
const brand = { sky: '#2E86C1', cream: '#F7F7F4', charcoal: '#141416', text: '#333333', muted: '#666666' }

export interface VisitUpdateEmailProps {
  preview: string
  title: string
  greeting: string
  message: string
  rows: { label: string; value: string }[]
  ctaLabel?: string
  ctaUrl?: string
  footnote?: string
}

/** General-purpose visit update: rescheduled, cancelled, reminders, alerts. */
export function VisitUpdateEmail({ preview, title, greeting, message, rows, ctaLabel, ctaUrl, footnote }: VisitUpdateEmailProps): React.ReactElement {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>STORM SWEEP</Heading>
          <Hr style={hr} />
          <Heading as="h2" style={subheading}>{title}</Heading>
          <Text style={paragraph}>{greeting}</Text>
          <Text style={paragraph}>{message}</Text>
          {rows.length ? (
            <Section style={box}>
              {rows.map((r) => (
                <Text key={r.label} style={row}>
                  <strong>{r.label}:</strong> {r.value}
                </Text>
              ))}
            </Section>
          ) : null}
          {ctaLabel && ctaUrl ? (
            <Button href={ctaUrl} style={button}>
              {ctaLabel}
            </Button>
          ) : null}
          {footnote ? <Text style={note}>{footnote}</Text> : null}
          <Hr style={hr} />
          <Text style={note}>Storm Sweep · Norman, OK</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main: React.CSSProperties = { backgroundColor: brand.cream, fontFamily: 'Barlow, Arial, sans-serif' }
const container: React.CSSProperties = { backgroundColor: '#ffffff', margin: '0 auto', padding: '32px 24px', maxWidth: '560px', borderRadius: '8px' }
const heading: React.CSSProperties = { color: brand.sky, fontSize: '32px', fontWeight: '700', letterSpacing: '2px', margin: '0 0 4px', fontFamily: 'Bebas Neue, Arial, sans-serif' }
const subheading: React.CSSProperties = { color: brand.charcoal, fontSize: '22px', fontWeight: '600', margin: '0 0 16px' }
const paragraph: React.CSSProperties = { color: brand.text, fontSize: '15px', lineHeight: '24px', margin: '0 0 16px' }
const box: React.CSSProperties = { backgroundColor: brand.cream, borderRadius: '6px', padding: '16px 20px', margin: '0 0 24px' }
const row: React.CSSProperties = { color: brand.text, fontSize: '14px', lineHeight: '22px', margin: '0 0 6px' }
const button: React.CSSProperties = { backgroundColor: brand.sky, borderRadius: '6px', color: '#ffffff', display: 'block', fontSize: '15px', fontWeight: '600', padding: '12px 24px', textAlign: 'center', textDecoration: 'none' }
const hr: React.CSSProperties = { borderColor: '#e5e5e5', margin: '20px 0' }
const note: React.CSSProperties = { color: brand.muted, fontSize: '13px', lineHeight: '20px', margin: '0 0 8px' }
