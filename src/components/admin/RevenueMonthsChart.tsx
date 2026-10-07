'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { EmptyState } from '@/components/admin/Panel'
import type { RevenueMonth } from '@/lib/admin/revenue'
import { formatCurrency } from '@/lib/utils'

// Validated with dataviz validate_palette.js on the #1C1C1F surface (dark):
// lightness band, chroma, CVD separation (ΔE 21.5) and contrast all pass.
// Brand wheat #D4A843 fails the lightness band for marks — use #B08A2E.
const SERIES = [
  { key: 'booked', label: 'Booked online', color: '#2E86C1' },
  { key: 'onSite', label: 'Sold on site', color: '#B08A2E' },
] as const
const SURFACE = '#1C1C1F'
const MUTED = '#8A8A8F'

const axisDollars = (cents: number): string => {
  const d = cents / 100
  return d >= 1000 ? `$${(d / 1000).toFixed(d % 1000 === 0 ? 0 : 1)}k` : `$${Math.round(d)}`
}

function ChartTooltip({ month }: { month: RevenueMonth }): React.ReactElement {
  const m = month
  const label = m.label
  return (
    <div className="rounded-lg border border-white/10 bg-[#0F0F11] px-3 py-2 text-xs text-[#F0F0F0] shadow-lg">
      <p className="mb-1 font-semibold">{label}</p>
      {SERIES.map((s) => (
        <p key={s.key} className="flex items-center gap-2">
          <span className={s.key === 'booked' ? 'size-2 rounded-sm bg-[#2E86C1]' : 'size-2 rounded-sm bg-[#B08A2E]'} aria-hidden="true" />
          {s.label}: <b>{formatCurrency(m[s.key])}</b>
        </p>
      ))}
      <p className="mt-1 border-t border-white/10 pt-1 text-[#C9C9CE]">
        Total {formatCurrency(m.revenue)} · {m.jobs} job{m.jobs === 1 ? '' : 's'}
      </p>
    </div>
  )
}

export function RevenueMonthsChart({ months }: { months: RevenueMonth[] }): React.ReactElement {
  if (months.every((m) => m.revenue === 0)) {
    return <EmptyState>No completed visits in the last 12 months yet.</EmptyState>
  }
  return (
    <figure>
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-[#C9C9CE]" aria-hidden="true">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={s.key === 'booked' ? 'size-2.5 rounded-sm bg-[#2E86C1]' : 'size-2.5 rounded-sm bg-[#B08A2E]'} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={axisDollars} tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={({ active, payload }) => {
                const month = payload?.[0]?.payload as RevenueMonth | undefined
                return active && month ? <ChartTooltip month={month} /> : null
              }}
            />
            {SERIES.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId="rev"
                fill={s.color}
                stroke={SURFACE}
                strokeWidth={2}
                radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">Completed-visit revenue by month, split into booked online and sold on site. Table follows.</figcaption>
    </figure>
  )
}
