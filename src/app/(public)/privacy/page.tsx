import type { Metadata } from 'next'

import { LegalPage, Section } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What Storm Sweep collects, why, who we share it with, and the choices you have.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage(): React.ReactElement {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="October 8, 2026"
      intro={<p>We collect only what we need to clean your shelter and keep you updated. We don&apos;t sell your information.</p>}
    >
      <Section title="What we collect">
        <ul>
          <li><strong>Contact details:</strong> your name, email, phone number and service address.</li>
          <li><strong>Booking details:</strong> services, dates, arrival windows, notes you give us, and visit history.</li>
          <li>
            <strong>Photos:</strong> the shelter photo you upload when booking, and the before/after photos, videos and checklist
            photos our Sweepers take during visits. Your signature at the end of a visit is also stored as a record.
          </li>
          <li>
            <strong>Payments:</strong> amounts, deposit/balance status and a reference from our payment provider. We never store
            card numbers.
          </li>
          <li><strong>Messages:</strong> texts and requests you send us, and whether you&apos;ve opted out of texts.</li>
          <li><strong>Your choices:</strong> social photo sharing, membership status, referral codes and credits.</li>
        </ul>
      </Section>

      <Section title="How we use it">
        <ul>
          <li>To schedule and perform your visits, send confirmations, reminders and visit reports, and take payment.</li>
          <li>To plan visits: we check your shelter photo (with help from an AI tool) for size and condition before confirming.</li>
          <li>To find your address on a map for the Sweeper&apos;s directions and to confirm they arrived at the right place.</li>
          <li>To answer your questions, and to occasionally tell you about seasonal services (reply STOP to opt out of texts).</li>
          <li>With your permission, to share before/after shelter photos on social media (see below).</li>
        </ul>
      </Section>

      <Section title="Who sees it">
        <ul>
          <li>
            <strong>Your Sweeper:</strong> before a Sweeper accepts your job they see only your city and ZIP. Once assigned, they see
            your first name, address, visit details and notes, so they can do the work.
          </li>
          <li><strong>Our team:</strong> the Storm Sweep office, to run bookings and support.</li>
          <li>
            <strong>Service providers</strong> that run parts of our service for us, under their own privacy and security terms:
            website hosting and database (Vercel, Supabase), payments (PayPal and our card processor), text messages (Twilio), email
            (Resend), address suggestions (Google), shelter photo checks (Anthropic) and map coordinates (U.S. Census Bureau
            geocoder).
          </li>
          <li>We may share information if required by law or to protect someone&apos;s safety.</li>
        </ul>
        <p>We do not sell or rent your personal information, and we don&apos;t use advertising trackers on this site.</p>
      </Section>

      <Section title="Photos on social media">
        <p>
          New accounts start with social photo sharing <strong>on</strong> (the box is checked when you sign up or book; you can
          untick it). You can turn it off anytime under <strong>Account</strong>, which also applies to photos already taken. We
          only share photos of the shelter itself, and never your name or street address.
        </p>
      </Section>

      <Section title="Cookies">
        <p>We use cookies only to keep you signed in and to remember site settings. There are no ad or analytics trackers.</p>
      </Section>

      <Section title="Keeping and deleting your information">
        <p>
          We keep your account and visit records while you&apos;re a customer and as long as needed for taxes, payments and
          resolving disputes. To get a copy of your information, correct it, or ask us to delete your account, contact us as shown
          below. Some records (like payment history) may need to be kept for legal reasons.
        </p>
      </Section>

      <Section title="Security">
        <p>
          Your account is protected by your login, data is encrypted in transit, and photos are stored privately and shown only
          through short-lived secure links.
        </p>
      </Section>

      <Section title="Children">
        <p>Our services are for adults. We don&apos;t knowingly collect information from children under 13.</p>
      </Section>

      <Section title="Changes">
        <p>If we change this policy, we&apos;ll update the date above. Significant changes will be shared by email or text.</p>
      </Section>
    </LegalPage>
  )
}
