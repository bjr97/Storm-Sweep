import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { EmptyState, Panel } from '@/components/admin/Panel'
import { RevenueMonthsChart } from '@/components/admin/RevenueMonthsChart'
import { getRevenueReport } from '@/lib/admin/revenue'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Revenue · Storm Sweep Admin' }

export default async function AdminRevenuePage(): Promise<React.ReactElement> {
  const { months, totals, sources } = await getRevenueReport()
  const topSource = sources[0]?.revenue ?? 0

  const kpis = [
    { label: 'Revenue · 12 mo', value: formatCurrency(totals.revenue), note: `${totals.jobs} completed visit${totals.jobs === 1 ? '' : 's'}` },
    { label: 'Sweeper pay', value: formatCurrency(totals.sweeperPay), note: 'Base + bonuses + commissions' },
    { label: 'Gross margin', value: totals.marginPct === null ? '—' : `${totals.marginPct}%`, note: `${formatCurrency(totals.margin)} after Sweeper pay` },
    { label: 'Avg visit', value: totals.avgJob === null ? '—' : formatCurrency(totals.avgJob), note: 'Per completed visit' },
    { label: 'Sold on site', value: formatCurrency(totals.onSite), note: 'Upgrades added by Sweepers' },
  ]

  return (
    <>
      <AdminTopbar title="Revenue" subtitle="Completed visits, last 12 months · memberships billed in Stripe not included" />
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-5">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-white/[0.07] bg-[#1C1C1F] px-4 pb-3.5 pt-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A8A8F]">{k.label}</p>
              <p className="mb-1 font-[family-name:var(--font-bebas)] text-3xl leading-none tracking-wide text-white">{k.value}</p>
              <p className="text-[11px] font-semibold text-[#9A9A9F]">{k.note}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Revenue by month" subtitle="Booked online vs. sold on site" className="xl:col-span-2">
            <RevenueMonthsChart months={months} />
          </Panel>

          <Panel title="Where revenue comes from" subtitle="How customers heard about us">
            {sources.length === 0 ? (
              <EmptyState>No completed visits yet.</EmptyState>
            ) : (
              <ul className="space-y-3">
                {sources.map((s) => (
                  <li key={s.label}>
                    <div className="mb-1 flex justify-between gap-2 text-[13px]">
                      <span className="truncate text-[#F0F0F0]">{s.label}</span>
                      <span className="shrink-0 text-[#C9C9CE]">
                        {formatCurrency(s.revenue)} <span className="text-[#8A8A8F]">· {s.jobs}</span>
                      </span>
                    </div>
                    <progress
                      value={s.revenue}
                      max={topSource || 1}
                      aria-label={`${s.label}: ${formatCurrency(s.revenue)}`}
                      className="block h-1.5 w-full appearance-none overflow-hidden rounded-full bg-white/[0.08] [&::-moz-progress-bar]:bg-[#2E86C1] [&::-webkit-progress-bar]:bg-white/[0.08] [&::-webkit-progress-value]:bg-[#2E86C1]"
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Month by month" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="text-[10px] uppercase tracking-[0.15em] text-[#8A8A8F]">
                <tr className="border-b border-white/[0.07]">
                  <th scope="col" className="px-4 py-2.5 font-bold">Month</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-bold">Visits</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-bold">Booked online</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-bold">Sold on site</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-bold">Revenue</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-bold">Sweeper pay</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-bold">Margin</th>
                </tr>
              </thead>
              <tbody>
                {[...months].reverse().map((m) => (
                  <tr key={m.label} className="border-b border-white/[0.07] last:border-b-0 text-[#F0F0F0]">
                    <th scope="row" className="px-4 py-2.5 font-semibold">{m.label}</th>
                    <td className="px-3 py-2.5 text-right">{m.jobs}</td>
                    <td className="px-3 py-2.5 text-right">{formatCurrency(m.booked)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCurrency(m.onSite)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">{formatCurrency(m.revenue)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCurrency(m.sweeperPay)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {m.revenue ? `${Math.round(((m.revenue - m.sweeperPay) / m.revenue) * 100)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </main>
    </>
  )
}
