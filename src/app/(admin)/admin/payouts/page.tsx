import { Download } from 'lucide-react'

import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { EmptyState, Panel } from '@/components/admin/Panel'
import { PayoutButton } from '@/components/admin/PayoutButton'
import { formatBusinessDate, localDate } from '@/lib/admin/time'
import { IRS_1099_THRESHOLD_CENTS } from '@/lib/sweepers/earnings'
import { getCrewBalances, listPayouts, PAYOUT_METHODS } from '@/lib/sweepers/payouts'
import { cn, formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Payouts · Storm Sweep Admin' }

const short = (iso: string | null): string => (iso ? formatBusinessDate(new Date(iso), { month: 'short', day: 'numeric', year: 'numeric' }) : '—')

export default async function AdminPayoutsPage(): Promise<React.ReactElement> {
  const [balances, payouts] = await Promise.all([getCrewBalances(), listPayouts()])
  const owed = balances.reduce((n, b) => n + b.owed, 0)
  const year = localDate(new Date()).year
  const methodLabel = new Map(PAYOUT_METHODS.map((m) => [m.value, m.label]))

  return (
    <>
      <AdminTopbar title="Payouts" subtitle={`${formatCurrency(owed)} owed to Sweepers`}>
        <a
          href={`/api/admin/payouts/1099?year=${year}`}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-white/[0.07] bg-white/[0.04] px-2.5 text-xs font-semibold text-[#F0F0F0] hover:bg-white/[0.08]"
        >
          <Download className="size-3.5" aria-hidden="true" /> {year} 1099 summary
        </a>
        <a
          href={`/api/admin/payouts/1099?year=${year - 1}`}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-white/[0.07] bg-white/[0.04] px-2.5 text-xs font-semibold text-[#F0F0F0] hover:bg-white/[0.08]"
        >
          <Download className="size-3.5" aria-hidden="true" /> {year - 1}
        </a>
      </AdminTopbar>
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <Panel title="How payouts work">
          <p className="text-[13px] leading-relaxed text-[#C9C9CE]">
            Pay for each completed job is calculated automatically (speed rate + bonuses + commissions). When you send a Sweeper money
            (Zelle, check…), record it here — it covers everything they&apos;re owed and locks in each job&apos;s pay. Sweepers see paid vs.
            unpaid in their Earnings tab. The 1099 summary totals payments made in each calendar year; anyone at{' '}
            {formatCurrency(IRS_1099_THRESHOLD_CENTS)}+ needs a 1099-NEC by January 31 (collect a W-9 from each Sweeper — the app doesn&apos;t
            store tax IDs).
          </p>
        </Panel>

        <Panel title="Balances" bodyClassName="p-0">
          {balances.length === 0 ? (
            <EmptyState>No Sweepers yet.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <thead className="text-[10px] uppercase tracking-[0.15em] text-[#8A8A8F]">
                  <tr className="border-b border-white/[0.07]">
                    <th scope="col" className="px-4 py-2.5 font-bold">Sweeper</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-bold">Unpaid jobs</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-bold">Owed</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-bold">Paid {year}</th>
                    <th scope="col" className="px-3 py-2.5 font-bold">Last paid</th>
                    <th scope="col" className="w-72 px-4 py-2.5 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => (
                    <tr key={b.sweeperId} className="border-b border-white/[0.07] align-top last:border-b-0">
                      <th scope="row" className="px-4 py-3 font-semibold text-[#F0F0F0]">{b.name}</th>
                      <td className="px-3 py-3 text-right text-[#F0F0F0]">{b.jobs.length}</td>
                      <td className={cn('px-3 py-3 text-right font-semibold', b.owed ? 'text-wheat-light' : 'text-[#F0F0F0]')}>{formatCurrency(b.owed)}</td>
                      <td className="px-3 py-3 text-right text-[#F0F0F0]">
                        {formatCurrency(b.paidThisYear)}
                        {b.paidThisYear >= IRS_1099_THRESHOLD_CENTS ? (
                          <span className="ml-1.5 rounded bg-wheat/15 px-1.5 py-0.5 text-[10px] font-bold text-wheat-light">1099</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-[#C9C9CE]">{short(b.lastPaidAt)}</td>
                      <td className="px-4 py-3">
                        <PayoutButton sweeperId={b.sweeperId} name={b.name} owed={b.owed} jobs={b.jobs.length} w9OnFile={b.w9OnFile} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Payout history" bodyClassName="p-0">
          {payouts.length === 0 ? (
            <EmptyState>No payouts recorded yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-white/[0.07]">
              {payouts.map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 text-[13px]">
                  <span className="font-semibold text-[#F0F0F0]">{p.sweeperName}</span>
                  <span className="text-[#F0F0F0]">{formatCurrency(p.amount)}</span>
                  <span className="text-[#9A9A9F]">
                    {p.jobCount} job{p.jobCount === 1 ? '' : 's'} · {methodLabel.get(p.method)}
                    {p.reference ? ` · ${p.reference}` : ''}
                  </span>
                  <span className="ml-auto text-[11px] text-[#8A8A8F]">{short(p.paidAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </main>
    </>
  )
}
