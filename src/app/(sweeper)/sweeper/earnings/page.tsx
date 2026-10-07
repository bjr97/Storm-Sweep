import { Info } from 'lucide-react'
import Link from 'next/link'

import { formatBusinessDate, monthRange, weekRange, yearRange } from '@/lib/admin/time'
import { getSweeperEarnings, IRS_1099_THRESHOLD_CENTS, summarize } from '@/lib/sweepers/earnings'
import { createClient } from '@/lib/supabase/server'
import { cn, formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Earnings · Storm Sweep' }

const PERIODS = { week: 'This week', month: 'This month' } as const
type Period = keyof typeof PERIODS

export default async function SweeperEarningsPage({ searchParams }: { searchParams: { period?: string } }): Promise<React.ReactElement> {
  const period: Period = searchParams.period === 'month' ? 'month' : 'week'
  const {
    data: { user },
  } = await createClient().auth.getUser()
  const now = new Date()
  const [jobs, yearJobs] = user
    ? await Promise.all([
        getSweeperEarnings(user.id, period === 'week' ? weekRange(now) : monthRange(now)),
        getSweeperEarnings(user.id, yearRange(now)),
      ])
    : [[], []]
  const sum = summarize(jobs)
  const ytd = summarize(yearJobs).total
  const year = formatBusinessDate(now, { year: 'numeric' })

  return (
    <main className="space-y-4 px-4 pt-5">
      <h1 className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-white">Earnings</h1>

      <nav aria-label="Period" className="grid grid-cols-2 gap-1 rounded-lg bg-white/[0.05] p-1">
        {(Object.keys(PERIODS) as Period[]).map((p) => (
          <Link
            key={p}
            aria-current={p === period ? 'page' : undefined}
            href={`/sweeper/earnings?period=${p}`}
            scroll={false}
            className={cn(
              'rounded-md py-2 text-center text-sm font-semibold',
              p === period ? 'bg-sky text-white' : 'text-[#9A9A9F] hover:text-white'
            )}
          >
            {PERIODS[p]}
          </Link>
        ))}
      </nav>

      <section aria-label="Summary" className="grid grid-cols-3 gap-2">
        {[
          { label: 'Earned', value: formatCurrency(sum.total), accent: 'text-[#2ECC71]' },
          { label: 'Jobs', value: String(sum.count), accent: 'text-white' },
          { label: 'Avg / job', value: sum.count ? formatCurrency(sum.average) : '—', accent: 'text-white' },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8A8A8F]">{k.label}</p>
            <p className={cn('font-[family-name:var(--font-bebas)] text-3xl leading-tight tracking-wide', k.accent)}>{k.value}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="jobs-heading" className="space-y-2">
        <h2 id="jobs-heading" className="text-xs font-bold uppercase tracking-[0.15em] text-[#8A8A8F]">Completed jobs</h2>
        {jobs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/[0.1] px-4 py-8 text-center text-sm text-[#8A8A8F]">
            No completed jobs {period === 'week' ? 'this week' : 'this month'} yet.
          </p>
        ) : (
          jobs.map((j) => (
            <details key={j.jobId} className="group rounded-xl border border-white/[0.07] bg-[#1C1C1F]">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    {formatBusinessDate(new Date(j.completedAt), { weekday: 'short', month: 'short', day: 'numeric' })} · {j.customerFirstName}
                  </p>
                  <p className="truncate text-xs text-[#9A9A9F]">{j.area} · {j.services.join(' + ')}</p>
                </div>
                <p className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-[#2ECC71]">{formatCurrency(j.pay.total)}</p>
              </summary>
              <dl className="space-y-1 border-t border-white/[0.07] px-3 py-2.5 text-xs text-[#C9C9CE]">
                <div className="flex justify-between">
                  <dt>Base pay ({Math.round(j.pay.pct * 100)}%{j.viaClaim ? ', claim speed' : ', assigned by office'})</dt>
                  <dd>{formatCurrency(j.pay.base)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Turnaround bonus{j.pay.turnaround === 0 ? ' (report 4+ days late)' : ''}</dt>
                  <dd>{formatCurrency(j.pay.turnaround)}</dd>
                </div>
                <div className="flex justify-between"><dt>Upgrade commissions ({j.upgradesSold})</dt><dd>{formatCurrency(j.pay.upgrades)}</dd></div>
                <div className="flex justify-between"><dt>Video bonus{j.videoBonus ? '' : ' (needs before + after video)'}</dt><dd>{formatCurrency(j.pay.video)}</dd></div>
                <div className="flex justify-between border-t border-white/10 pt-1 font-bold text-white"><dt>Total</dt><dd>{formatCurrency(j.pay.total)}</dd></div>
              </dl>
            </details>
          ))
        )}
      </section>

      <section className="flex gap-3 rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-4 text-xs text-[#C9C9CE]">
        <Info className="size-4 shrink-0 text-sky-light" aria-hidden="true" />
        <div className="space-y-1">
          <p>
            <span className="font-semibold text-white">{year} so far: {formatCurrency(ytd)}</span>
            {ytd >= IRS_1099_THRESHOLD_CENTS
              ? ` — you'll receive a 1099-NEC by January 31.`
              : ` — a 1099-NEC is issued once you earn ${formatCurrency(IRS_1099_THRESHOLD_CENTS)} in a year.`}
          </p>
          <p>As an independent contractor, no taxes are withheld — set some aside for quarterly estimated payments.</p>
        </div>
      </section>
    </main>
  )
}
