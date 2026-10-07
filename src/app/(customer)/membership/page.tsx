import { Check, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

import { formatBusinessDate } from '@/lib/admin/time'
import { currentCustomerId, getCustomerProfile } from '@/lib/customer/portal'
import { formatCurrency, PRICING } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Membership · Storm Sweep' }

const PERKS = [
  `${PRICING.membership.visits_per_year} deep cleans a year included (up to standard size)`,
  `${Math.round(PRICING.member_upgrade_discount_pct * 100)}% off every upgrade — LED, hardware, carpet and prep kits`,
  'Your included clean is covered when you book online (large shelters pay the size difference)',
  'Before & after photo report every visit',
]

export default async function CustomerMembershipPage(): Promise<React.ReactElement> {
  const profile = await getCustomerProfile((await currentCustomerId())!)
  const active = profile?.membership_status === 'active'
  const used = profile?.visits_used ?? 0
  const left = Math.max(0, PRICING.membership.visits_per_year - used)
  const card = 'rounded-2xl border border-black/10 bg-white p-5 shadow-sm'

  return (
    <div className="space-y-5">
      <h1 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide">Storm Ready membership</h1>

      {active ? (
        <>
          <section className={`${card} border-wheat/60`}>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-[#8A6A1A]">
              <ShieldCheck className="size-5 text-wheat" aria-hidden="true" /> Active member
            </p>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[#6B6B70]">Plan</dt>
                <dd className="font-semibold">
                  {profile?.membership_plan === 'monthly'
                    ? `Monthly · ${formatCurrency(PRICING.membership.monthly)}/mo`
                    : `Annual · ${formatCurrency(PRICING.membership.annual)}/yr`}
                </dd>
              </div>
              <div>
                <dt className="text-[#6B6B70]">Included visits</dt>
                <dd className="font-semibold">{used} of {PRICING.membership.visits_per_year} used</dd>
              </div>
              <div>
                <dt className="text-[#6B6B70]">Renews</dt>
                <dd className="font-semibold">
                  {profile?.membership_renews_at
                    ? formatBusinessDate(new Date(profile.membership_renews_at), { month: 'long', day: 'numeric', year: 'numeric' })
                    : '—'}
                </dd>
              </div>
            </dl>
            {profile?.membership_plan === 'monthly' && profile.membership_commitment_ends_at ? (
              <p className="mt-3 text-xs text-[#6B6B70]">
                Monthly plans are a {PRICING.membership.monthly_commitment_months}-month commitment (through{' '}
                {formatBusinessDate(new Date(profile.membership_commitment_ends_at), { month: 'long', year: 'numeric' })}).
              </p>
            ) : null}
            <Link href="/book" className="mt-4 inline-flex h-11 items-center rounded-lg bg-sky px-5 font-semibold text-white hover:bg-sky-dark">
              {left > 0 ? `Book my included visit (${left} left)` : 'Book a visit — 10% off upgrades'}
            </Link>
          </section>
          <section className={card}>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide">Billing &amp; changes</h2>
            <p className="mt-1 text-sm text-[#4A4A50]">
              To update your payment method, change plans, or cancel, call or text us — online billing management is coming soon.
            </p>
          </section>
        </>
      ) : (
        <section className={card}>
          <p className="text-sm text-[#4A4A50]">
            Keep your shelter storm-ready all year for {formatCurrency(PRICING.membership.annual)}/yr or{' '}
            {formatCurrency(PRICING.membership.monthly)}/mo ({PRICING.membership.monthly_commitment_months}-month commitment).
          </p>
          <ul className="mt-4 space-y-2">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-[#27AE60]" aria-hidden="true" /> {p}
              </li>
            ))}
          </ul>
          <Link href="/book" className="mt-5 inline-flex h-11 items-center rounded-lg bg-wheat px-5 font-semibold text-shelter hover:bg-wheat-light">
            Join when you book your next visit
          </Link>
        </section>
      )}
    </div>
  )
}
