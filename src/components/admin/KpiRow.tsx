import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'

import type { DashboardKpis } from '@/lib/admin/dashboard'
import { cn, formatCurrency } from '@/lib/utils'

type Trend = 'up' | 'down' | 'neutral'
type Kpi = { label: string; value: string; delta: string; trend: Trend; accent: string }

function compare(current: number, previous: number, unit: (n: number) => string, period: string): { delta: string; trend: Trend } {
  if (current === previous) {
    return { delta: current === 0 ? 'Nothing yet' : `Same as ${period}`, trend: 'neutral' }
  }
  if (previous === 0) {
    return { delta: `Up from ${unit(0)} ${period}`, trend: 'up' }
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  return {
    delta: `${pct > 0 ? '+' : ''}${pct}% vs ${period}`,
    trend: pct >= 0 ? 'up' : 'down',
  }
}

function buildKpis(kpis: DashboardKpis): Kpi[] {
  const revenue = compare(kpis.revenueMtd, kpis.revenuePrevPeriod, formatCurrency, 'last month')
  const jobDiff = kpis.jobsThisWeek - kpis.jobsLastWeek

  return [
    {
      label: 'Visit revenue · MTD',
      value: formatCurrency(kpis.revenueMtd),
      ...revenue,
      accent: 'before:bg-sky',
    },
    {
      label: 'Jobs · this week',
      value: String(kpis.jobsThisWeek),
      delta:
        jobDiff === 0
          ? kpis.jobsThisWeek === 0
            ? 'Nothing scheduled'
            : 'Same as last week'
          : `${jobDiff > 0 ? '+' : ''}${jobDiff} vs last week`,
      trend: jobDiff > 0 ? 'up' : jobDiff < 0 ? 'down' : 'neutral',
      accent: 'before:bg-wheat',
    },
    {
      label: 'Active members',
      value: String(kpis.activeMembers),
      delta: 'Storm Ready · billed in Stripe',
      trend: 'neutral',
      accent: 'before:bg-[#27AE60]',
    },
    {
      label: 'Avg job value',
      value: kpis.avgJobValue === null ? '—' : formatCurrency(kpis.avgJobValue),
      delta: kpis.avgJobValue === null ? 'No paid jobs this month' : "This month's paid jobs",
      trend: 'neutral',
      accent: 'before:bg-[#E67E22]',
    },
    {
      label: 'Review score',
      value: kpis.reviewAvg === null ? '—' : `${kpis.reviewAvg.toFixed(1)}★`,
      delta:
        kpis.reviewCount === 0
          ? 'No reviews yet'
          : `${kpis.reviewCount} review${kpis.reviewCount === 1 ? '' : 's'}`,
      trend: 'neutral',
      accent: 'before:bg-[#8E44AD]',
    },
  ]
}

const TREND_STYLE: Record<Trend, { icon: typeof ArrowUpRight; className: string }> = {
  up: { icon: ArrowUpRight, className: 'text-[#2ECC71]' },
  down: { icon: ArrowDownRight, className: 'text-[#F1948A]' },
  neutral: { icon: ArrowRight, className: 'text-[#8A8A8F]' },
}

export function KpiRow({ kpis }: { kpis: DashboardKpis }): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-5">
      {buildKpis(kpis).map((kpi) => {
        const trend = TREND_STYLE[kpi.trend]
        return (
          <div
            key={kpi.label}
            className={cn(
              'relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#1C1C1F] px-4 pb-3.5 pt-4',
              'before:absolute before:inset-x-0 before:top-0 before:h-0.5',
              kpi.accent
            )}
          >
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A8A8F]">
              {kpi.label}
            </p>
            <p className="mb-1.5 font-[family-name:var(--font-bebas)] text-4xl leading-none tracking-wide text-white">
              {kpi.value}
            </p>
            <p className={cn('flex items-center gap-1 text-[11px] font-semibold', trend.className)}>
              <trend.icon className="size-3.5 shrink-0" aria-hidden="true" />
              {kpi.delta}
            </p>
          </div>
        )
      })}
    </div>
  )
}
