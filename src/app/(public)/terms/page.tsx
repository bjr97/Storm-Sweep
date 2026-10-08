import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalPage, Section } from '@/components/legal/LegalPage'
import { CHANGE_CUTOFF_HOURS } from '@/lib/customer/rules'
import { PROMO_MIN_TOTAL } from '@/lib/booking/quote'
import { formatCurrency, PRICING } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms for booking storm shelter cleaning and Storm Ready memberships with Storm Sweep in Norman, Oklahoma.',
  alternates: { canonical: '/terms' },
}

const pct = (n: number): string => `${Math.round(n * 100)}%`

export default function TermsPage(): React.ReactElement {
  const m = PRICING.membership
  return (
    <LegalPage
      title="Terms of Service"
      updated="October 8, 2026"
      intro={
        <p>
          These terms cover booking a visit with Storm Sweep (&ldquo;we&rdquo;, &ldquo;us&rdquo;), a storm shelter cleaning and upgrade
          service in Norman, Oklahoma. By creating an account or booking a visit, you agree to them. We&apos;ve kept them in plain
          English.
        </p>
      }
    >
      <Section title="1. Booking a visit">
        <ul>
          <li>You book online for an address in our service area. If we don&apos;t serve your ZIP yet, you can join our waitlist.</li>
          <li>
            You pick a date and an arrival window (for example, Morning 8&ndash;11). Your Sweeper arrives during that window; the visit
            itself can run past the end of it.
          </li>
          <li>
            You may be asked for a photo of your shelter. We use it to plan the visit (size, condition, anything that needs special
            handling). If the photo shows heavy clutter or a safety concern, we may call you before confirming.
          </li>
          <li>X-Large shelters are priced by quote. We confirm the price with you before the visit.</li>
          <li>
            You must be 18 or older and have the right to authorize work at the property. An adult needs to be there at the end of
            the visit to review the work and sign off.
          </li>
        </ul>
      </Section>

      <Section title="2. Prices and payment">
        <ul>
          <li>
            Prices are shown before you pay. A {pct(PRICING.deposit_pct)} deposit is due when you book; the balance is due after the
            visit is complete.
          </li>
          <li>Payments are processed by our payment providers. We never see or store your full card number.</li>
          <li>
            Upgrades offered during a visit (like LED lighting or door hardware) are only added with your approval, confirmed with
            your initials on the Sweeper&apos;s phone, and are added to your balance.
          </li>
          <li>
            Discounts: one promo code or friend invite per booking. Promo codes may have expiry dates, use limits or be for
            first-time customers only, and every booking pays at least {formatCurrency(PROMO_MIN_TOTAL)}. Codes have no cash value.
          </li>
          <li>
            Friend invites: a first-time customer invited by a friend gets {formatCurrency(PRICING.referral.customer_credit)} off; the
            friend earns {formatCurrency(PRICING.referral.customer_credit)} in credit once that first visit is complete. Credit has no
            cash value and applies to future bookings.
          </li>
        </ul>
      </Section>

      <Section title="3. Rescheduling and cancelling">
        <ul>
          <li>
            You can reschedule or cancel online up to {CHANGE_CUTOFF_HOURS} hours before your visit. If you cancel in time, any
            deposit you paid is refunded to your original payment method.
          </li>
          <li>Within {CHANGE_CUTOFF_HOURS} hours of the visit, please contact us and we&apos;ll do our best to help.</li>
          <li>We may need to reschedule for safety, severe weather or staffing. If we can&apos;t find a new time that works, we refund what you paid for that visit.</li>
        </ul>
      </Section>

      <Section title="4. During the visit">
        <ul>
          <li>Please give clear access to the shelter (for garage shelters, move vehicles off the door) and keep pets away from the work area.</li>
          <li>
            Our Sweepers won&apos;t remove large items from your shelter without your OK. If we find a hazard (for example gas,
            standing water, damage or animals), we may pause or end the visit for everyone&apos;s safety and contact you about next
            steps.
          </li>
          <li>We take before and after photos of every visit as a record of the work. They appear in your account.</li>
          <li>
            Sweepers are independent contractors who perform visits booked through Storm Sweep. Please tell us about any problem
            with a visit within 7 days so we can make it right.
          </li>
        </ul>
      </Section>

      <Section title="5. Storm Ready membership">
        <ul>
          <li>
            Storm Ready is {formatCurrency(m.annual)} per year, or {formatCurrency(m.monthly)} per month on a {m.monthly_commitment_months}
            -month term. The monthly plan is a payment plan for the full term.
          </li>
          <li>
            It includes {m.visits_per_year} cleanings per membership year for shelters up to {m.covered_shelter_size} size (larger
            shelters pay the size difference), plus {pct(PRICING.member_upgrade_discount_pct)} off upgrades and prep kits.
          </li>
          <li>The visit you book when you join counts as your first included cleaning. Unused cleanings don&apos;t roll over.</li>
          <li>The membership is billed separately from your visits and is never added to a visit deposit.</li>
        </ul>
      </Section>

      <Section title="6. Photos and social media">
        <p>
          Before and after photos of your shelter help other Oklahomans see what a clean shelter looks like. When you create an
          account or book, a box lets you choose whether we may share these photos on social media; it&apos;s checked by default
          and you can untick it. You can change your choice anytime under <strong>Account</strong>. Shared photos never include
          your name or street address. See our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </Section>

      <Section title="7. Text messages">
        <p>
          We text you about your bookings (confirmations, reminders, &ldquo;on the way&rdquo; updates) and occasionally about
          seasonal offers. Message and data rates may apply. Reply <strong>STOP</strong> to opt out or <strong>START</strong> to
          opt back in. Replies reach our team.
        </p>
      </Section>

      <Section title="8. Our responsibility">
        <p>
          We do our work with care. To the extent the law allows, our responsibility for any visit is limited to re-doing the work
          or refunding what you paid for it, and we aren&apos;t responsible for pre-existing conditions of your shelter or property.
          Nothing here limits rights you have under Oklahoma law that can&apos;t be waived.
        </p>
      </Section>

      <Section title="9. Changes and governing law">
        <p>
          We may update these terms; the date above shows the latest version, and changes apply to bookings made after that date.
          These terms are governed by the laws of the State of Oklahoma.
        </p>
      </Section>
    </LegalPage>
  )
}
