import { Medal } from 'lucide-react'

import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { EmptyState, Panel } from '@/components/admin/Panel'
import { SweeperPaperwork } from '@/components/admin/SweeperPaperwork'
import { TierOverrideSelect } from '@/components/admin/TierOverrideSelect'
import { formatBusinessDate } from '@/lib/admin/time'
import { getCrewTiers } from '@/lib/sweepers/board'
import { getCrewYearTotals, IRS_1099_THRESHOLD_CENTS } from '@/lib/sweepers/earnings'
import { getCrewPaperwork } from '@/lib/sweepers/paperwork'
import { JOB_BOARD, TIER_LABEL, TIER_ORDER, TIER_RULES } from '@/lib/sweepers/jobBoard'
import { cn, formatCurrency } from '@/lib/utils'
import type { SweeperTier } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Crew · Storm Sweep Admin' }

const TIER_STYLE: Record<SweeperTier, string> = {
  gold: 'text-wheat-light',
  silver: 'text-[#E5E5EA]',
  standard: 'text-sky-light',
}

export default async function AdminCrewPage(): Promise<React.ReactElement> {
  const [{ crew }, yearTotals, paperwork] = await Promise.all([getCrewTiers(), getCrewYearTotals(), getCrewPaperwork()])
  const year = formatBusinessDate(new Date(), { year: 'numeric' })
  const members = Array.from(crew.values()).filter((m) => !m.isDemo).sort(
    (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || b.score - a.score || a.name.localeCompare(b.name)
  )
  const count = (t: SweeperTier): number => members.filter((m) => m.tier === t).length

  return (
    <>
      <AdminTopbar
        title="Crew"
        subtitle={`${members.length} Sweeper${members.length === 1 ? '' : 's'} · ${count('gold')} Gold · ${count('silver')} Silver · ${count('standard')} Standard`}
      />
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <Panel title="Priority tiers" subtitle="How the job board drips">
          <p className="text-[13px] leading-relaxed text-[#C9C9CE]">
            New jobs open to <b className="text-wheat-light">Gold</b> first, then <b className="text-[#E5E5EA]">Silver</b>{' '}
            {JOB_BOARD.TIER_DRIP_MINUTES} min later, then everyone {JOB_BOARD.TIER_DRIP_MINUTES} min after that (empty tiers
            are skipped). Score = rating 40% + on-time reports 40% + reliability 20% (each late drop in 90 days costs a
            quarter of it). Gold: {TIER_RULES.gold.minJobs}+ jobs and a {TIER_RULES.gold.minScore}+ score. Silver:{' '}
            {TIER_RULES.silver.minJobs}+ jobs and {TIER_RULES.silver.minScore}+. Pin a tier to override.
          </p>
        </Panel>

        <Panel title="Sweepers" bodyClassName="p-0">
          {members.length === 0 ? (
            <EmptyState>No Sweepers yet — approve applicants to build your crew.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-[13px]">
                <thead className="text-[10px] uppercase tracking-[0.15em] text-[#8A8A8F]">
                  <tr className="border-b border-white/[0.07]">
                    <th className="px-4 py-2.5 font-bold">Sweeper</th>
                    <th className="px-3 py-2.5 font-bold">Tier</th>
                    <th className="px-3 py-2.5 font-bold">Score</th>
                    <th className="px-3 py-2.5 font-bold">Jobs done</th>
                    <th className="px-3 py-2.5 font-bold">On time</th>
                    <th className="px-3 py-2.5 font-bold">Rating</th>
                    <th className="px-3 py-2.5 font-bold">Late drops (90d)</th>
                    <th className="px-3 py-2.5 font-bold">Earned {year}</th>
                    <th className="w-56 px-3 py-2.5 font-bold">Paperwork</th>
                    <th className="w-44 px-4 py-2.5 font-bold">Override</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-white/[0.07] last:border-b-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#F0F0F0]">
                          {m.name}
                          <span className={m.available ? 'ml-2 text-[10px] font-bold uppercase text-[#2ECC71]' : 'ml-2 text-[10px] font-bold uppercase text-[#8A8A8F]'}>
                            {m.available ? 'Available' : 'Off'}
                          </span>
                        </p>
                        {m.phone ? (
                          <a href={`tel:${m.phone}`} className="text-[11px] text-sky-light hover:underline">
                            {m.phone}
                          </a>
                        ) : null}
                      </td>
                      <td className={cn('px-3 py-3 font-bold', TIER_STYLE[m.tier])}>
                        <span className="inline-flex items-center gap-1">
                          <Medal className="size-3.5" aria-hidden="true" />
                          {TIER_LABEL[m.tier]}
                          {m.override ? <span className="text-[10px] font-semibold text-[#8A8A8F]">(pinned)</span> : null}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[#F0F0F0]">{m.score}</td>
                      <td className="px-3 py-3 text-[#F0F0F0]">{m.stats.completedJobs}</td>
                      <td className="px-3 py-3 text-[#F0F0F0]">
                        {m.stats.completedJobs ? `${Math.round((m.stats.onTimeJobs / m.stats.completedJobs) * 100)}%` : '—'}
                      </td>
                      <td className="px-3 py-3 text-[#F0F0F0]">
                        {m.stats.ratingCount
                          ? `${(m.stats.ratingSum / m.stats.ratingCount).toFixed(1)}★ (${m.stats.ratingCount})`
                          : '—'}
                      </td>
                      <td className={cn('px-3 py-3', m.stats.lateDrops90d ? 'font-bold text-[#F1948A]' : 'text-[#F0F0F0]')}>
                        {m.stats.lateDrops90d}
                      </td>
                      <td className="px-3 py-3 text-[#F0F0F0]">
                        {formatCurrency(yearTotals.get(m.id) ?? 0)}
                        {(yearTotals.get(m.id) ?? 0) >= IRS_1099_THRESHOLD_CENTS ? (
                          <span className="ml-1.5 rounded bg-wheat/15 px-1.5 py-0.5 text-[10px] font-bold text-wheat-light">1099</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        {paperwork.get(m.id) ? (
                          <SweeperPaperwork
                            sweeperId={m.id}
                            w9={Boolean(paperwork.get(m.id)!.w9ReceivedAt)}
                            agreementSigned={paperwork.get(m.id)!.agreementSigned}
                            insuranceExpiresOn={paperwork.get(m.id)!.insuranceExpiresOn}
                            insurance={paperwork.get(m.id)!.insurance}
                            notes={paperwork.get(m.id)!.notes}
                          />
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <TierOverrideSelect sweeperId={m.id} override={m.override} autoTier={m.autoTier} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </main>
    </>
  )
}
