'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { EmptyState } from '@/components/admin/Panel'
import type { RevenueWeek } from '@/lib/admin/dashboard'
import { formatCurrency } from '@/lib/utils'

// Validated (dataviz validate_palette.js, dark surface #1C1C1F): #2E86C1 passes
// lightness, chroma and contrast. #5DADE2 fails the lightness band — keep it
// out of data marks.
const BAR_COLOR = '#2E86C1'
const MUTED_TEXT = '#8A8A8F'
const GRID = 'rgba(255,255,255,0.06)'

/** Cents → compact axis label: 0 → "$0", 150000 → "$1.5k". */
function axisDollars(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(dollars % 1000 === 0 ? 0 : 1)}k`
  return `$${Math.round(dollars)}`
}

export function RevenueChart({ weeks }: { weeks: RevenueWeek[] }): React.ReactElement {
  const total = weeks.reduce((sum, w) => sum + w.revenue, 0)

  if (total === 0) {
    return <EmptyState>No paid bookings in the last 8 weeks yet.</EmptyState>
  }

  return (
    <div>
      <div className="h-44" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: MUTED_TEXT, fontSize: 10, fontWeight: 600 }}
            />
            <YAxis
              tickFormatter={axisDollars}
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fill: MUTED_TEXT, fontSize: 10 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={({ active, payload }) => {
                const week = payload?.[0]?.payload as RevenueWeek | undefined
                if (!active || !week) return null
                return (
                  <div className="rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-[#F0F0F0]">Week of {week.label}</p>
                    <p className="mt-0.5 text-[#F0F0F0]">{formatCurrency(week.revenue)}</p>
                    <p className="text-[#8A8A8F]">
                      {week.jobs} paid booking{week.jobs === 1 ? '' : 's'}
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="revenue" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>Visit revenue by week, last 8 weeks</caption>
        <thead>
          <tr>
            <th scope="col">Week of</th>
            <th scope="col">Revenue</th>
            <th scope="col">Paid bookings</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.label}>
              <td>{w.label}</td>
              <td>{formatCurrency(w.revenue)}</td>
              <td>{w.jobs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
