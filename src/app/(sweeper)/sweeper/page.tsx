import { CalendarDays, Clock, Lock, MapPin, Medal, Navigation, Ruler } from 'lucide-react'
import Link from 'next/link'

import { AvailabilityToggle } from '@/components/sweeper/AvailabilityToggle'
import { BoardAutoRefresh } from '@/components/sweeper/BoardAutoRefresh'
import { ClaimButton } from '@/components/sweeper/ClaimButton'
import { DropButton } from '@/components/sweeper/DropButton'
import { PayCountdown } from '@/components/sweeper/PayCountdown'
import { formatBusinessDate, formatBusinessTime } from '@/lib/admin/time'
import { timeWindowLabel } from '@/lib/booking/timeWindows'
import { getSweeperBoard } from '@/lib/sweepers/board'
import { calculateSweeperPay, JOB_BOARD, potentialPay, TIER_LABEL, TIER_RULES } from '@/lib/sweepers/jobBoard'
import { createClient } from '@/lib/supabase/server'
import { cn, formatCurrency, PRICING } from '@/lib/utils'
import type { SweeperTier, TimeWindow } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Job Board · Storm Sweep' }

const TIER_STYLE: Record<SweeperTier, string> = {
  gold: 'border-wheat/40 bg-wheat/15 text-wheat-light',
  silver: 'border-white/25 bg-white/10 text-[#E5E5EA]',
  standard: 'border-sky/30 bg-sky/10 text-sky-light',
}

const SIZE_LABEL: Record<string, string> = { small: 'Small', standard: 'Standard', large: 'Large', xlarge: 'X-Large' }

function When({ iso, window }: { iso: string | null; window: TimeWindow | null }): React.ReactElement {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#F0F0F0]">
      <span className="inline-flex items-center gap-1.5 font-semibold">
        <CalendarDays className="size-4 text-sky-light" aria-hidden="true" />
        {iso ? formatBusinessDate(new Date(iso), { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date TBD'}
      </span>
      <span className="inline-flex items-center gap-1.5 text-[#C9C9CE]">
        <Clock className="size-4 text-sky-light" aria-hidden="true" />
        {timeWindowLabel(window) ?? (iso ? formatBusinessTime(iso) : 'Time TBD')}
      </span>
    </p>
  )
}

export default async function SweeperBoardPage(): Promise<React.ReactElement> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const board = user ? await getSweeperBoard(user.id) : null

  if (!board) {
    return <p className="px-4 py-10 text-center text-sm text-[#8A8A8F]">Your Sweeper profile isn&apos;t set up yet. Contact the office.</p>
  }

  const { me, open, upcoming, mine, today } = board
  const nextUp = mine.find((j) => j.status === 'in_progress') ?? mine[0]
  const firstName = me.name.split(/\s+/)[0]

  return (
    <main className="space-y-6 px-4 pb-16 pt-5">
      <BoardAutoRefresh />

      {/* Who + tier */}
      <section className="rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A8A8F]">Hey {firstName}</p>
            <h1 className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-white">Job board</h1>
          </div>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold', TIER_STYLE[me.tier])}>
            <Medal className="size-4" aria-hidden="true" />
            {TIER_LABEL[me.tier]}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#9A9A9F]">
          Score {me.score} · {me.stats.completedJobs} job{me.stats.completedJobs === 1 ? '' : 's'} done.{' '}
          {me.tier === 'gold'
            ? 'You see new jobs first.'
            : `Gold Sweepers see new jobs ${JOB_BOARD.TIER_DRIP_MINUTES} min before ${me.tier === 'silver' ? 'you' : 'Silver'}${me.tier === 'standard' ? `, Silver ${JOB_BOARD.TIER_DRIP_MINUTES} min before you` : ''}. Reach ${
                me.tier === 'silver' ? `Gold with ${TIER_RULES.gold.minJobs}+ jobs and a ${TIER_RULES.gold.minScore}+ score` : `Silver with ${TIER_RULES.silver.minJobs}+ jobs and a ${TIER_RULES.silver.minScore}+ score`
              } — great reviews, on-time reports, no late drops.`}
        </p>
        <AvailabilityToggle initial={me.available} />
      </section>

      {/* Today */}
      <section aria-label="Today" className="grid grid-cols-3 gap-2">
        {[
          { label: "Today's jobs", value: String(today.jobs) },
          { label: 'Done', value: `${today.done}/${today.jobs}` },
          { label: 'Est. earnings', value: formatCurrency(today.estimated) },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A8A8F]">{k.label}</p>
            <p className="font-[family-name:var(--font-bebas)] text-2xl leading-tight tracking-wide text-white">{k.value}</p>
          </div>
        ))}
      </section>

      {nextUp ? (
        <section aria-labelledby="next-up" className="space-y-3 rounded-xl border-2 border-sky/60 bg-sky/[0.08] p-4">
          <p id="next-up" className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-light">
            {nextUp.status === 'in_progress' ? 'In progress' : 'Next up'}
          </p>
          <When iso={nextUp.scheduledAt} window={nextUp.timeWindow} />
          <p className="text-sm text-white">
            {nextUp.customerFirstName} · {nextUp.address}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(nextUp.address)}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 items-center justify-center gap-1.5 rounded-lg bg-white/[0.08] text-sm font-bold text-white hover:bg-white/[0.12]"
            >
              <Navigation className="size-4" aria-hidden="true" /> Navigate
            </a>
            <Link
              href={`/sweeper/jobs/${nextUp.id}`}
              className="flex h-12 items-center justify-center rounded-lg bg-sky text-sm font-bold text-white hover:bg-sky-light"
            >
              {nextUp.status === 'in_progress' ? 'Continue job' : 'Open job'}
            </Link>
          </div>
        </section>
      ) : null}

      {/* My jobs */}
      <section aria-labelledby="mine-heading" className="space-y-3">
        <h2 id="mine-heading" className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-white">
          My upcoming jobs <span className="text-[#8A8A8F]">({mine.length})</span>
        </h2>
        {mine.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/[0.1] px-4 py-6 text-center text-sm text-[#8A8A8F]">
            No jobs yet — claim one below.
          </p>
        ) : (
          mine.map((job) => {
            const pay = calculateSweeperPay({ serviceValue: job.serviceValue, pct: job.pct })
            return (
              <article key={job.id} className="space-y-2.5 rounded-xl border border-sky/25 bg-[#1C1C1F] p-4">
                {job.rescheduledByCustomer ? (
                  <p className="rounded-md border border-wheat/40 bg-wheat/10 px-2.5 py-1.5 text-xs font-semibold text-wheat-light">
                    This visit was moved. Still works? If not, drop it — no penalty.
                  </p>
                ) : null}
                <When iso={job.scheduledAt} window={job.timeWindow} />
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-1.5 text-sm text-sky-light hover:underline"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {job.address}
                </a>
                <p className="text-sm text-[#C9C9CE]">
                  {job.customerFirstName} · {SIZE_LABEL[job.shelterSize]} shelter · {job.services.join(' + ')}
                </p>
                {job.notes ? <p className="whitespace-pre-wrap rounded-md bg-white/[0.04] p-2 text-xs text-[#C9C9CE]">{job.notes}</p> : null}
                <p className="text-xs text-[#9A9A9F]">
                  Base pay <span className="font-semibold text-white">{formatCurrency(pay.base)}</span> ({Math.round(job.pct * 100)}% locked in)
                  {' '}+ up to {formatCurrency(PRICING.sweeper.turnaround_same_day)} for a same-day report
                </p>
                <Link
                  href={`/sweeper/jobs/${job.id}`}
                  className="flex h-12 w-full items-center justify-center rounded-lg bg-sky font-[family-name:var(--font-barlow-condensed)] text-base font-bold uppercase tracking-wider text-white hover:bg-sky-light"
                >
                  {job.status === 'in_progress' ? 'Continue job' : 'Open job'}
                </Link>
                {job.status === 'confirmed' ? <DropButton jobId={job.id} late={job.lateDropIfDroppedNow} /> : null}
              </article>
            )
          })
        )}
      </section>

      {/* Open jobs */}
      <section aria-labelledby="open-heading" className="space-y-3">
        <h2 id="open-heading" className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-white">
          Open jobs <span className="text-[#8A8A8F]">({open.length})</span>
        </h2>
        <p className="text-xs leading-relaxed text-[#9A9A9F]">
          Claim fast for a higher rate: {Math.round(PRICING.sweeper.accept_1hr_pct * 100)}% within 1 hour of a job opening to you,
          then {Math.round(PRICING.sweeper.accept_4hr_pct * 100)}% / {Math.round(PRICING.sweeper.accept_24hr_pct * 100)}% /{' '}
          {Math.round(PRICING.sweeper.base_pct * 100)}%. Finish and submit the report on the scheduled day for +
          {formatCurrency(PRICING.sweeper.turnaround_same_day)}. Max {JOB_BOARD.MAX_JOBS_PER_DAY} jobs per day.
        </p>

        {upcoming.count > 0 ? (
          <p className="flex items-center gap-2 rounded-lg border border-wheat/25 bg-wheat/[0.07] px-3 py-2 text-xs text-wheat-light">
            <Lock className="size-4 shrink-0" aria-hidden="true" />
            {upcoming.count} more job{upcoming.count === 1 ? '' : 's'} open to you
            {upcoming.nextAt
              ? ` — next in ${Math.max(1, Math.ceil((new Date(upcoming.nextAt).getTime() - Date.now()) / 60_000))} min`
              : ' soon'}{' '}
            (higher tiers see new jobs first).
          </p>
        ) : null}

        {open.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/[0.1] px-4 py-6 text-center text-sm text-[#8A8A8F]">
            No open jobs right now. This page refreshes on its own.
          </p>
        ) : (
          open.map((job) => (
            <article key={job.id} className="space-y-3 rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-4">
              <div className="flex items-start justify-between gap-3">
                <When iso={job.scheduledAt} window={job.timeWindow} />
                <div className="shrink-0 text-right">
                  <p className="font-[family-name:var(--font-bebas)] text-2xl leading-none tracking-wide text-[#2ECC71]">
                    {formatCurrency(potentialPay(job.serviceValue, job.pct))}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-[#8A8A8F]">up to</p>
                </div>
              </div>
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-[#C9C9CE]">
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-[#8A8A8F]" aria-hidden="true" />{job.area}</span>
                <span className="inline-flex items-center gap-1.5"><Ruler className="size-4 text-[#8A8A8F]" aria-hidden="true" />{SIZE_LABEL[job.shelterSize]}</span>
              </p>
              <p className="text-sm text-[#F0F0F0]">{job.services.join(' + ')}</p>
              <p className="text-xs font-semibold text-wheat-light">
                <PayCountdown visibleAt={job.visibleAt} />
              </p>
              <ClaimButton jobId={job.id} disabled={job.dayFull} disabledLabel={`You have ${JOB_BOARD.MAX_JOBS_PER_DAY} jobs that day`} />
            </article>
          ))
        )}
      </section>
    </main>
  )
}
