import { formatBusinessDate, localDate, localMidnight, monthRange, type Range } from '@/lib/admin/time'
import { REFERRAL_SOURCES } from '@/lib/booking/schemas'
import { createServiceClient } from '@/lib/supabase/server'
import { getCompletedJobPay } from '@/lib/sweepers/earnings'

/**
 * Revenue report (admin, server-only). Basis: COMPLETED visits by completion
 * month, so revenue and Sweeper pay line up for margin. Memberships billed as
 * Stripe subscriptions are not included. All amounts in cents.
 */

export type RevenueMonth = {
  label: string
  /** Visit revenue booked online (total minus on-site upgrade sales). */
  booked: number
  /** Upgrades sold on site by Sweepers. */
  onSite: number
  revenue: number
  sweeperPay: number
  jobs: number
}

export type SourceRow = { label: string; revenue: number; jobs: number }

export type RevenueReport = {
  months: RevenueMonth[]
  totals: { revenue: number; sweeperPay: number; margin: number; marginPct: number | null; jobs: number; avgJob: number | null; onSite: number }
  sources: SourceRow[]
}

const SOURCE_LABEL = new Map<string, string>(REFERRAL_SOURCES.map((s) => [s.value, s.label]))

export async function getRevenueReport(now: Date = new Date(), monthCount = 12): Promise<RevenueReport> {
  const t = localDate(now)
  const range: Range = { start: localMidnight(t.year, t.month - (monthCount - 1), 1), end: monthRange(now).end }
  const completed = await getCompletedJobPay(range)

  const supabase = createServiceClient()
  const ids = completed.map((c) => c.row.id)
  const partnerIds = Array.from(new Set(completed.map((c) => c.row.partner_id).filter((x): x is string => Boolean(x))))
  const [upRes, partnerRes] = await Promise.all([
    ids.length ? supabase.from('job_upgrades').select('job_id, price').in('job_id', ids) : Promise.resolve({ data: [], error: null }),
    partnerIds.length ? supabase.from('partners').select('id, name').in('id', partnerIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (upRes.error) throw upRes.error
  const onSiteByJob = new Map<string, number>()
  for (const u of upRes.data ?? []) onSiteByJob.set(u.job_id, (onSiteByJob.get(u.job_id) ?? 0) + u.price)
  const partnerName = new Map((partnerRes.data ?? []).map((p) => [p.id, p.name]))

  const months: RevenueMonth[] = Array.from({ length: monthCount }, (_, i) => {
    const start = localMidnight(t.year, t.month - (monthCount - 1) + i, 1)
    return { label: formatBusinessDate(start, { month: 'short', year: '2-digit' }), booked: 0, onSite: 0, revenue: 0, sweeperPay: 0, jobs: 0 }
  })
  const monthIndex = (iso: string): number => {
    const d = localDate(new Date(iso))
    return (d.year - t.year) * 12 + (d.month - t.month) + (monthCount - 1)
  }

  const sources = new Map<string, SourceRow>()
  for (const { row, pay } of completed) {
    const i = monthIndex(row.completed_at!)
    if (i < 0 || i >= monthCount) continue
    const onSite = onSiteByJob.get(row.id) ?? 0
    const m = months[i]
    m.onSite += onSite
    m.booked += row.total_amount - onSite
    m.revenue += row.total_amount
    m.sweeperPay += pay.total
    m.jobs += 1

    const label = row.partner_id
      ? `Partner: ${partnerName.get(row.partner_id) ?? 'Unknown'}`
      : SOURCE_LABEL.get(row.referral_source ?? '') ?? (row.referral_source ? row.referral_source : 'Not specified')
    const s = sources.get(label) ?? { label, revenue: 0, jobs: 0 }
    s.revenue += row.total_amount
    s.jobs += 1
    sources.set(label, s)
  }

  const revenue = months.reduce((n, m) => n + m.revenue, 0)
  const sweeperPay = months.reduce((n, m) => n + m.sweeperPay, 0)
  const jobs = months.reduce((n, m) => n + m.jobs, 0)
  return {
    months,
    totals: {
      revenue,
      sweeperPay,
      margin: revenue - sweeperPay,
      marginPct: revenue > 0 ? Math.round(((revenue - sweeperPay) / revenue) * 100) : null,
      jobs,
      avgJob: jobs ? Math.round(revenue / jobs) : null,
      onSite: months.reduce((n, m) => n + m.onSite, 0),
    },
    sources: Array.from(sources.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
  }
}
