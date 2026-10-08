import type { Metadata } from 'next'
import Link from 'next/link'

import { ContactLine, LegalPage } from '@/components/legal/LegalPage'
import { CHANGE_CUTOFF_HOURS } from '@/lib/customer/rules'
import { TIME_WINDOWS } from '@/lib/booking/timeWindows'
import { formatCurrency, PRICING } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Storm Shelter Cleaning FAQ',
  description: 'How a Storm Sweep visit works in Norman, OK: what we clean, prep, payment, rescheduling, membership, photos and texts.',
  alternates: { canonical: '/faq' },
}

type Faq = { q: string; a: React.ReactNode }

const pct = (n: number): string => `${Math.round(n * 100)}%`

function faqs(): { group: string; items: Faq[] }[] {
  const windows = TIME_WINDOWS.filter((w) => w.value !== 'flexible')
    .map((w) => `${w.label} ${w.hours}`)
    .join(', ')
  const m = PRICING.membership
  return [
    {
      group: 'The visit',
      items: [
        {
          q: 'What does a shelter cleaning include?',
          a: (
            <>
              Our deep clean removes debris and trash (with your review), vacuums the ceiling, walls and floor, treats mold and
              mildew, scrubs and deodorizes, and cleans the hatch door and hinges. We inspect the shelter and send you a before and
              after photo report. See{' '}
              <Link href="/services">Services</Link> for upgrades like LED lighting and door hardware.
            </>
          ),
        },
        {
          q: 'When will my Sweeper arrive?',
          a: <>You pick a date and an arrival window when you book ({windows}, or Flexible). We text you when your Sweeper is on the way.</>,
        },
        {
          q: 'Do I need to be home?',
          a: 'Yes, an adult needs to be there at the end of the visit to look over the work and sign off on the Sweeper’s phone. You’re also asked to approve (with your initials) any upgrade before it’s added.',
        },
        {
          q: 'How should I prepare?',
          a: 'Make sure we can reach the shelter (for garage shelters, move cars off the door) and keep pets away from the work area. If you upload a photo of your shelter when booking, it helps us arrive ready.',
        },
        {
          q: 'Will you throw out things stored in my shelter?',
          a: 'We won’t remove large items without your OK. If your shelter is very full, we may call you before the visit to plan it.',
        },
        {
          q: 'What if something is unsafe?',
          a: 'If a Sweeper finds a hazard (gas smell, standing water, damage or animals), they pause the visit and our team contacts you about next steps.',
        },
      ],
    },
    {
      group: 'Booking and payment',
      items: [
        {
          q: 'How does payment work?',
          a: `A ${pct(PRICING.deposit_pct)} deposit when you book, and the balance after the visit is complete. Prices are shown before you pay.`,
        },
        {
          q: 'Can I reschedule or cancel?',
          a: `Yes, online from your account up to ${CHANGE_CUTOFF_HOURS} hours before the visit. Cancelling in time refunds any deposit. Inside ${CHANGE_CUTOFF_HOURS} hours, please contact us.`,
        },
        {
          q: 'Do you serve my area?',
          a: (
            <>
              We serve Norman and about 15 miles around it: Moore, Noble, Newcastle, Midwest City, Del City and south Oklahoma
              City. If your ZIP isn&apos;t covered yet, the booking form lets you join the waitlist, and we&apos;ll let you know when
              we expand. <Link href="/book">Start a booking</Link> to check.
            </>
          ),
        },
        {
          q: 'My shelter is extra large. What does it cost?',
          a: 'X-Large shelters get a custom quote. Book online and we’ll confirm the price with you before the visit.',
        },
        {
          q: 'Do you have a referral program?',
          a: `Yes. Share your invite link from your account: your friend gets ${formatCurrency(PRICING.referral.customer_credit)} off their first visit and you get ${formatCurrency(PRICING.referral.customer_credit)} credit when it’s done.`,
        },
      ],
    },
    {
      group: 'Storm Ready membership',
      items: [
        {
          q: 'What is Storm Ready?',
          a: (
            <>
              {formatCurrency(m.annual)}/year or {formatCurrency(m.monthly)}/month ({m.monthly_commitment_months}-month term).
              Includes {m.visits_per_year} cleanings a year and {pct(PRICING.member_upgrade_discount_pct)} off upgrades and prep kits. See{' '}
              <Link href="/pricing">Pricing</Link>.
            </>
          ),
        },
        {
          q: 'How do I use my included cleanings?',
          a: 'Sign in and book; your included visit is applied automatically. The visit you book when you join is your first cleaning.',
        },
      ],
    },
    {
      group: 'Photos, texts and your account',
      items: [
        {
          q: 'Will my shelter photos be posted online?',
          a: (
            <>
              Only if photo sharing is on: it&apos;s checked by default when you sign up or book, and you can turn it off anytime in{' '}
              <strong>Account</strong>. Shared photos show the shelter only, never your name or street address. See our{' '}
              <Link href="/privacy">Privacy Policy</Link>.
            </>
          ),
        },
        {
          q: 'Where can I see my visit report and photos?',
          a: 'Sign in: Visits shows each report with your Sweeper’s checklist, and Photos has all your before and after shots.',
        },
        {
          q: 'How do I stop text messages?',
          a: 'Reply STOP to any text from us. Reply START to turn them back on.',
        },
      ],
    },
  ]
}

export default function FaqPage(): React.ReactElement {
  const groups = faqs()
  return (
    <LegalPage
      title="Questions & answers"
      intro={
        <p>
          Can&apos;t find your answer? <ContactLine />
        </p>
      }
    >
      {groups.map((g) => (
        <section key={g.group} className="space-y-3">
          <h2>{g.group}</h2>
          <div className="divide-y divide-white/10 rounded-xl border border-white/10">
            {g.items.map((f) => (
              <details key={f.q} className="group px-4 py-3">
                <summary className="cursor-pointer list-none font-semibold text-[var(--color-text)] marker:hidden">
                  <span className="mr-2 inline-block text-[var(--color-primary-light)] transition-transform group-open:rotate-90">›</span>
                  {f.q}
                </summary>
                <div className="mt-2 pl-5">{f.a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </LegalPage>
  )
}
