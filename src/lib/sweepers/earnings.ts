import { yearRange, type Range } from '@/lib/admin/time'
import { parseServiceAddress } from '@/lib/booking/address'
import { createServiceClient } from '@/lib/supabase/server'
import { calculateSweeperPay, lockedPct, type PayBreakdown } from '@/lib/sweepers/jobBoard'

/**
 * Sweeper earnings from completed jobs (server-only). Pay is always computed
 * with calculateSweeperPay() — the same math the job screen shows — so
 * history, YTD (1099) totals and the job screen can never disagree.
 * "Earned" = job complete; payouts are not tracked in the app yet.
 */

export const IRS_1099_THRESHOLD_CENTS = 60_000

export type JobEarning = {
  jobId: string
  completedAt: string
  scheduledAt: string | null
  customerFirstName: string
  area: string
  services: string[]
  upgradesSold: number
  videoBonus: boolean
  viaClaim: boolean
  pay: PayBreakdown
  /** Included in a recorded payout. */
  paid: boolean
}

export type CompletedJobRow = {
  id: string
  sweeper_id: string | null
  customer_id: string
  address: string
  service_type: string[]
  service_value: number | null
  total_amount: number
  scheduled_at: string | null
  completed_at: string | null
  assigned_via: string | null
  claimed_at: string | null
  claim_visible_at: string | null
  referral_source: string | null
  partner_id: string | null
  payout_id: string | null
  payout_amount: number | null
}

async function completedJobs(range: Range, sweeperId?: string): Promise<CompletedJobRow[]> {
  let query = createServiceClient()
    .from('jobs')
    .select('id, sweeper_id, customer_id, address, service_type, service_value, total_amount, scheduled_at, completed_at, assigned_via, claimed_at, claim_visible_at, referral_source, partner_id, payout_id, payout_amount')
    .eq('status', 'complete')
    .not('sweeper_id', 'is', null)
    .gte('completed_at', range.start.toISOString())
    .lt('completed_at', range.end.toISOString())
    .order('completed_at', { ascending: false })
  if (sweeperId) query = query.eq('sweeper_id', sweeperId)
  const { data, error } = await query
  if (error) throw error
  return data
}

async function payFor(rows: CompletedJobRow[]): Promise<Map<string, { pay: PayBreakdown; upgrades: number; video: boolean }>> {
  const result = new Map<string, { pay: PayBreakdown; upgrades: number; video: boolean }>()
  if (rows.length === 0) return result
  const supabase = createServiceClient()
  const ids = rows.map((r) => r.id)
  const [upRes, vidRes] = await Promise.all([
    supabase.from('job_upgrades').select('job_id, sold_by').in('job_id', ids),
    supabase.from('job_photos').select('job_id, photo_type').in('job_id', ids).in('photo_type', ['video_before', 'video_after']),
  ])
  if (upRes.error) throw upRes.error
  if (vidRes.error) throw vidRes.error

  for (const r of rows) {
    const upgrades = upRes.data.filter((u) => u.job_id === r.id && u.sold_by === r.sweeper_id).length
    const kinds = new Set(vidRes.data.filter((v) => v.job_id === r.id).map((v) => v.photo_type))
    const video = kinds.has('video_before') && kinds.has('video_after')
    result.set(r.id, {
      upgrades,
      video,
      pay: calculateSweeperPay({
        serviceValue: r.service_value ?? r.total_amount,
        pct: lockedPct(r),
        scheduledAt: r.scheduled_at ? new Date(r.scheduled_at) : null,
        completedAt: r.completed_at ? new Date(r.completed_at) : null,
        upgradesSold: upgrades,
        videoBonus: video,
      }),
    })
  }
  return result
}

export async function getSweeperEarnings(sweeperId: string, range: Range): Promise<JobEarning[]> {
  const rows = await completedJobs(range, sweeperId)
  if (rows.length === 0) return []
  const pays = await payFor(rows)
  const { data: people } = await createServiceClient()
    .from('profiles')
    .select('id, full_name')
    .in('id', Array.from(new Set(rows.map((r) => r.customer_id))))
  const first = new Map((people ?? []).map((p) => [p.id, (p.full_name ?? 'Customer').split(/\s+/)[0]]))

  return rows.map((r) => {
    const p = pays.get(r.id)!
    const addr = parseServiceAddress(r.address)
    return {
      jobId: r.id,
      completedAt: r.completed_at!,
      scheduledAt: r.scheduled_at,
      customerFirstName: first.get(r.customer_id) ?? 'Customer',
      area: addr.city ? `${addr.city} ${addr.zip}`.trim() : r.address,
      services: r.service_type,
      upgradesSold: p.upgrades,
      videoBonus: p.video,
      viaClaim: r.assigned_via === 'claim',
      pay: p.pay,
      paid: Boolean(r.payout_id),
    }
  })
}

export function summarize(jobs: JobEarning[]): { total: number; count: number; average: number } {
  const total = jobs.reduce((sum, j) => sum + j.pay.total, 0)
  return { total, count: jobs.length, average: jobs.length ? Math.round(total / jobs.length) : 0 }
}

/** Calendar-year earnings per Sweeper (1099-NEC prep). */
export async function getCrewYearTotals(now: Date = new Date()): Promise<Map<string, number>> {
  const rows = await completedJobs(yearRange(now))
  const pays = await payFor(rows)
  const totals = new Map<string, number>()
  for (const r of rows) {
    if (!r.sweeper_id) continue
    totals.set(r.sweeper_id, (totals.get(r.sweeper_id) ?? 0) + (pays.get(r.id)?.pay.total ?? 0))
  }
  return totals
}

/** Completed jobs in a range with their Sweeper pay (admin revenue / margin). */
export async function getCompletedJobPay(range: Range): Promise<{ row: CompletedJobRow; pay: PayBreakdown }[]> {
  const rows = await completedJobs(range)
  const pays = await payFor(rows)
  return rows.map((row) => ({ row, pay: pays.get(row.id)!.pay }))
}
