import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'

import { ReviewForm } from '@/components/customer/ReviewForm'
import { VisitChanger } from '@/components/customer/VisitChanger'
import { VisitProgress } from '@/components/customer/VisitProgress'
import { StatusBadge, VisitFacts } from '@/components/customer/VisitSummary'
import { formatBusinessDate } from '@/lib/admin/time'
import { currentCustomerId, getCustomerProfile, listCustomerVisits } from '@/lib/customer/portal'
import { visitSteps } from '@/lib/customer/rules'
import { formatCurrency, PRICING } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'My Storm Sweep' }

const card = 'rounded-2xl border border-black/10 bg-white p-5 shadow-sm'
const h2 = 'font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-shelter'
const primary = 'inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-sky px-5 font-semibold text-white hover:bg-sky-dark'

export default async function CustomerDashboardPage(): Promise<React.ReactElement> {
  const userId = (await currentCustomerId())!
  const [profile, visits] = await Promise.all([getCustomerProfile(userId), listCustomerVisits(userId)])
  const firstName = (profile?.full_name ?? '').split(/\s+/)[0] || 'there'
  const isMember = profile?.membership_status === 'active'

  const active = visits
    .filter((v) => v.status === 'pending' || v.status === 'confirmed' || v.status === 'in_progress')
    .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
  const next = active[0]
  const lastDone = visits.find((v) => v.status === 'complete')
  const visitsLeft = Math.max(0, PRICING.membership.visits_per_year - (profile?.visits_used ?? 0))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide">Hi {firstName}</h1>
        <p className="text-sm text-[#6B6B70]">Your shelter, your visits, and your reports — all in one place.</p>
      </div>

      {/* Next visit */}
      {next ? (
        <section className={card} aria-labelledby="next-visit">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="next-visit" className={h2}>
              {next.status === 'in_progress' ? 'Happening now' : 'Your next visit'}
            </h2>
            <StatusBadge status={next.status} />
          </div>
          <div className="space-y-4">
            <VisitProgress steps={visitSteps(next)} />
            <VisitFacts visit={next} />
            {next.status === 'pending' ? (
              <p className="rounded-lg bg-[#E67E22]/10 px-3 py-2 text-sm text-[#7A4510]">
                We&apos;re reviewing your shelter photo and will confirm shortly.
              </p>
            ) : null}
            {next.status !== 'in_progress' ? (
              <VisitChanger
                jobId={next.id}
                canChange={next.canChange}
                hasDeposit={next.payment_status === 'deposit_paid' || next.payment_status === 'paid'}
                isMemberVisit={next.membership_visit}
              />
            ) : null}
            <Link href={`/history/${next.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-sky-dark hover:underline">
              Visit details <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          {active.length > 1 ? (
            <p className="mt-3 text-xs text-[#6B6B70]">
              + {active.length - 1} more upcoming —{' '}
              <Link href="/history" className="font-semibold text-sky-dark hover:underline">see all</Link>
            </p>
          ) : null}
        </section>
      ) : (
        <section className={card}>
          <h2 className={h2}>No visit scheduled</h2>
          <p className="mb-4 mt-1 text-sm text-[#6B6B70]">Keep your shelter clean, lit and stocked before storm season.</p>
          <Link href="/book" className={primary}>
            {isMember && visitsLeft > 0 ? 'Book my included visit' : 'Book a visit'}
          </Link>
        </section>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {/* Membership */}
        <section className={card} aria-labelledby="membership">
          <h2 id="membership" className={`${h2} flex items-center gap-2`}>
            <ShieldCheck className="size-5 text-wheat" aria-hidden="true" /> Storm Ready
          </h2>
          {isMember ? (
            <div className="mt-2 space-y-3 text-sm">
              <p>
                <span className="font-semibold">{profile?.membership_plan === 'monthly' ? 'Monthly' : 'Annual'} member</span>
                {profile?.membership_renews_at
                  ? ` · renews ${formatBusinessDate(new Date(profile.membership_renews_at), { month: 'long', day: 'numeric', year: 'numeric' })}`
                  : ''}
              </p>
              <p>
                Included visits: <b>{profile?.visits_used ?? 0} of {PRICING.membership.visits_per_year} used</b> · 10% off every upgrade
              </p>
              <Link href="/membership" className="inline-flex items-center gap-1 font-semibold text-sky-dark hover:underline">
                Membership details <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="mt-2 space-y-3 text-sm">
              <p>
                {PRICING.membership.visits_per_year} cleanings a year, and 10% off every upgrade —{' '}
                {formatCurrency(PRICING.membership.annual)}/yr.
              </p>
              <Link href="/membership" className="inline-flex items-center gap-1 font-semibold text-sky-dark hover:underline">
                See what&apos;s included <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>

        {/* Latest report */}
        <section className={card} aria-labelledby="latest">
          <h2 id="latest" className={`${h2} flex items-center gap-2`}>
            <Sparkles className="size-5 text-sky" aria-hidden="true" /> Latest report
          </h2>
          {lastDone ? (
            <div className="mt-2 space-y-3">
              {lastDone.afterPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                <img src={lastDone.afterPhotoUrl} alt="Your shelter after the visit" className="aspect-[4/3] w-full rounded-xl object-cover" />
              ) : null}
              <p className="text-sm">
                {lastDone.completed_at
                  ? formatBusinessDate(new Date(lastDone.completed_at), { month: 'long', day: 'numeric', year: 'numeric' })
                  : ''}{' '}
                · {lastDone.service_type[0]}
              </p>
              <Link href={`/history/${lastDone.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-sky-dark hover:underline">
                See photos &amp; full report <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              {!lastDone.reviewed ? (
                <div className="border-t border-black/10 pt-3">
                  <ReviewForm jobId={lastDone.id} sweeperFirstName={lastDone.sweeperFirstName} />
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#6B6B70]">After your first visit, your before &amp; after photos and service report show up here.</p>
          )}
        </section>
      </div>
    </div>
  )
}
