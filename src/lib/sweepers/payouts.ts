import { yearRange } from '@/lib/admin/time'
import { createServiceClient } from '@/lib/supabase/server'
import { getCompletedJobPay } from '@/lib/sweepers/earnings'
import type { PayoutMethod } from '@/types/database'

export { PAYOUT_METHODS } from '@/lib/sweepers/payoutMethods'

/**
 * Sweeper payouts (server-only, admin). Pay per job comes from the shared
 * earnings math; a payout records money actually sent and snapshots each
 * job's pay (jobs.payout_amount) so history never changes later.
 * 1099-NEC totals are payments made in the calendar year (paid_at).
 */


const ALL_TIME = { start: new Date('2024-01-01T00:00:00Z'), end: new Date('2100-01-01T00:00:00Z') }

export type OwedJob = { id: string; completedAt: string; pay: number }
export type CrewBalance = { sweeperId: string; name: string; owed: number; jobs: OwedJob[]; paidThisYear: number; lastPaidAt: string | null; w9OnFile: boolean }

export async function getCrewBalances(now: Date = new Date()): Promise<CrewBalance[]> {
  const supabase = createServiceClient()
  const [completed, sweepersRes, payoutsRes] = await Promise.all([
    getCompletedJobPay(ALL_TIME),
    supabase.from('profiles').select('id, full_name, w9_received_at').eq('role', 'sweeper').order('full_name'),
    supabase.from('sweeper_payouts').select('sweeper_id, amount, paid_at').order('paid_at', { ascending: false }),
  ])
  if (sweepersRes.error) throw sweepersRes.error
  if (payoutsRes.error) throw payoutsRes.error
  const year = yearRange(now)

  return sweepersRes.data.map((s) => {
    const jobs = completed
      .filter((c) => c.row.sweeper_id === s.id && !c.row.payout_id)
      .map((c) => ({ id: c.row.id, completedAt: c.row.completed_at ?? '', pay: c.pay.total }))
    const mine = payoutsRes.data.filter((p) => p.sweeper_id === s.id)
    return {
      sweeperId: s.id,
      name: s.full_name ?? 'Sweeper',
      owed: jobs.reduce((n, j) => n + j.pay, 0),
      jobs,
      paidThisYear: mine.filter((p) => new Date(p.paid_at) >= year.start && new Date(p.paid_at) < year.end).reduce((n, p) => n + p.amount, 0),
      lastPaidAt: mine[0]?.paid_at ?? null,
      w9OnFile: Boolean(s.w9_received_at),
    }
  })
}

export type PayoutError = { error: string; code: string; status: number }

/** Pay a Sweeper for all of their completed, unpaid jobs. */
export async function recordPayout(
  adminId: string,
  sweeperId: string,
  input: { method: PayoutMethod; reference: string | null; note: string | null }
): Promise<{ id: string; amount: number; jobCount: number } | PayoutError> {
  const balance = (await getCrewBalances()).find((b) => b.sweeperId === sweeperId)
  if (!balance) return { error: 'Sweeper not found', code: 'NOT_FOUND', status: 404 }
  if (balance.jobs.length === 0) return { error: 'Nothing is owed to this Sweeper', code: 'NOTHING_OWED', status: 409 }

  const supabase = createServiceClient()
  const { data: payout, error } = await supabase
    .from('sweeper_payouts')
    .insert({ sweeper_id: sweeperId, amount: balance.owed, job_count: balance.jobs.length, method: input.method, reference: input.reference, note: input.note, created_by: adminId })
    .select('id')
    .single()
  if (error) throw error

  // Claim each job for this payout; if another payout got one first, undo.
  const claimed: string[] = []
  for (const job of balance.jobs) {
    const { data } = await supabase
      .from('jobs')
      .update({ payout_id: payout.id, payout_amount: job.pay })
      .eq('id', job.id)
      .is('payout_id', null)
      .select('id')
    if (data?.length) claimed.push(job.id)
  }
  if (claimed.length !== balance.jobs.length) {
    if (claimed.length) await supabase.from('jobs').update({ payout_id: null, payout_amount: null }).in('id', claimed)
    await supabase.from('sweeper_payouts').delete().eq('id', payout.id)
    return { error: 'Balance changed while saving — refresh and try again', code: 'CONFLICT', status: 409 }
  }
  return { id: payout.id, amount: balance.owed, jobCount: claimed.length }
}

export type PayoutRow = { id: string; sweeperName: string; amount: number; jobCount: number; method: PayoutMethod; reference: string | null; paidAt: string }

export async function listPayouts(limit = 50): Promise<PayoutRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('sweeper_payouts').select('*').order('paid_at', { ascending: false }).limit(limit)
  if (error) throw error
  const ids = Array.from(new Set(data.map((p) => p.sweeper_id)))
  const { data: people } = ids.length ? await supabase.from('profiles').select('id, full_name').in('id', ids) : { data: [] }
  const name = new Map((people ?? []).map((p) => [p.id, p.full_name ?? 'Sweeper']))
  return data.map((p) => ({ id: p.id, sweeperName: name.get(p.sweeper_id) ?? 'Sweeper', amount: p.amount, jobCount: p.job_count, method: p.method, reference: p.reference, paidAt: p.paid_at }))
}

/** Rows for the 1099-NEC summary: payments made in `year` (business calendar). */
export async function tenNinetyNineRows(year: number): Promise<{ name: string; email: string; phone: string; w9: boolean; total: number; payouts: number }[]> {
  const supabase = createServiceClient()
  const range = yearRange(new Date(Date.UTC(year, 6, 1)))
  const { data, error } = await supabase
    .from('sweeper_payouts')
    .select('sweeper_id, amount')
    .gte('paid_at', range.start.toISOString())
    .lt('paid_at', range.end.toISOString())
  if (error) throw error
  const totals = new Map<string, { total: number; payouts: number }>()
  for (const p of data) {
    const t = totals.get(p.sweeper_id) ?? { total: 0, payouts: 0 }
    totals.set(p.sweeper_id, { total: t.total + p.amount, payouts: t.payouts + 1 })
  }
  const rows = await Promise.all(
    Array.from(totals.entries()).map(async ([id, t]) => {
      const [{ data: prof }, { data: auth }] = await Promise.all([
        supabase.from('profiles').select('full_name, phone, w9_received_at').eq('id', id).maybeSingle(),
        supabase.auth.admin.getUserById(id),
      ])
      return { name: prof?.full_name ?? 'Sweeper', email: auth.user?.email ?? '', phone: prof?.phone ?? '', w9: Boolean(prof?.w9_received_at), ...t }
    })
  )
  return rows.sort((a, b) => b.total - a.total)
}
