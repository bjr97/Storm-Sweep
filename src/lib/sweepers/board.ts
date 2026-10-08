import { dayRange, localDate } from '@/lib/admin/time'
import { parseServiceAddress } from '@/lib/booking/address'
import { createServiceClient } from '@/lib/supabase/server'
import {
  autoTier,
  claimPct,
  isOnTime,
  JOB_BOARD,
  lockedPct,
  potentialPay,
  sweeperScore,
  tierVisibleAt,
  type SweeperStats,
} from '@/lib/sweepers/jobBoard'
import type { Job, ShelterSize, SweeperTier, TimeWindow } from '@/types/database'

/**
 * Server-only job board data + actions. Uses the service client (jobs RLS only
 * lets Sweepers read jobs already assigned to them), so every function here
 * takes the caller's verified sweeper id and limits what it returns:
 * open jobs show city + ZIP only until claimed.
 */

export type CrewMemberTier = {
  id: string
  name: string
  phone: string | null
  available: boolean
  tier: SweeperTier
  autoTier: SweeperTier
  override: SweeperTier | null
  score: number
  stats: SweeperStats
  /** Demo Sweeper (admin preview): sees only demo jobs, never counts toward tiers. */
  isDemo: boolean
  /** Finished onboarding (or the office waived it) — required to claim jobs. */
  trained: boolean
}

export async function getCrewTiers(now: Date = new Date()): Promise<{
  crew: Map<string, CrewMemberTier>
  populated: Set<SweeperTier>
}> {
  const supabase = createServiceClient()
  const { data: sweepers, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, sweeper_tier_override, sweeper_available, is_demo, training_completed_at, training_waived')
    .eq('role', 'sweeper')
  if (error) throw error

  const ids = sweepers.map((s) => s.id)
  const stats = new Map<string, SweeperStats>(
    ids.map((id) => [id, { completedJobs: 0, onTimeJobs: 0, ratingSum: 0, ratingCount: 0, lateDrops90d: 0 }])
  )

  if (ids.length > 0) {
    const since = new Date(now.getTime() - 90 * 86_400_000).toISOString()
    const [jobsRes, dropsRes] = await Promise.all([
      supabase.from('jobs').select('id, sweeper_id, scheduled_at, completed_at').eq('status', 'complete').in('sweeper_id', ids),
      supabase.from('job_claim_events').select('sweeper_id').eq('event', 'late_drop').gte('created_at', since).in('sweeper_id', ids),
    ])
    if (jobsRes.error) throw jobsRes.error
    if (dropsRes.error) throw dropsRes.error

    const jobOwner = new Map<string, string>()
    for (const j of jobsRes.data) {
      const st = j.sweeper_id ? stats.get(j.sweeper_id) : undefined
      if (!st || !j.sweeper_id) continue
      jobOwner.set(j.id, j.sweeper_id)
      st.completedJobs += 1
      if (j.scheduled_at && j.completed_at && isOnTime(new Date(j.scheduled_at), new Date(j.completed_at))) st.onTimeJobs += 1
    }
    for (const d of dropsRes.data) {
      const st = stats.get(d.sweeper_id)
      if (st) st.lateDrops90d += 1
    }
    if (jobOwner.size > 0) {
      const { data: reviews, error: rErr } = await supabase
        .from('reviews')
        .select('job_id, rating')
        .in('job_id', Array.from(jobOwner.keys()))
      if (rErr) throw rErr
      for (const r of reviews) {
        const owner = jobOwner.get(r.job_id)
        const st = owner ? stats.get(owner) : undefined
        if (st) {
          st.ratingSum += r.rating
          st.ratingCount += 1
        }
      }
    }
  }

  const crew = new Map<string, CrewMemberTier>()
  const populated = new Set<SweeperTier>()
  for (const s of sweepers) {
    const st = stats.get(s.id)!
    const auto = autoTier(st)
    const tier = s.sweeper_tier_override ?? auto
    if (!s.is_demo) populated.add(tier)
    crew.set(s.id, {
      id: s.id,
      name: s.full_name ?? 'Sweeper',
      phone: s.phone,
      available: s.sweeper_available,
      tier,
      autoTier: auto,
      override: s.sweeper_tier_override,
      score: sweeperScore(st),
      stats: st,
      isDemo: s.is_demo,
      trained: Boolean(s.training_completed_at) || s.training_waived,
    })
  }
  return { crew, populated }
}

const BOARD_COLUMNS =
  'id, scheduled_at, time_window, address, shelter_size, service_type, service_value, total_amount, board_opened_at, status, sweeper_id, notes, customer_id, claimed_at, claim_visible_at, assigned_via, rescheduled_at, is_demo'

type BoardRow = Pick<
  Job,
  | 'id'
  | 'scheduled_at'
  | 'time_window'
  | 'address'
  | 'shelter_size'
  | 'service_type'
  | 'service_value'
  | 'total_amount'
  | 'board_opened_at'
  | 'status'
  | 'sweeper_id'
  | 'notes'
  | 'customer_id'
  | 'claimed_at'
  | 'claim_visible_at'
  | 'assigned_via'
  | 'rescheduled_at'
>

export type OpenJob = {
  id: string
  scheduledAt: string | null
  timeWindow: TimeWindow | null
  area: string
  shelterSize: ShelterSize
  services: string[]
  serviceValue: number
  visibleAt: string
  /** Speed % if claimed right now. */
  pct: number
  /** Sweeper already holds MAX_JOBS_PER_DAY jobs that day. */
  dayFull: boolean
}

export type MyJob = {
  id: string
  scheduledAt: string | null
  timeWindow: TimeWindow | null
  address: string
  customerFirstName: string
  shelterSize: ShelterSize
  services: string[]
  notes: string | null
  status: Job['status']
  serviceValue: number
  /** Locked-in speed % (null for admin assignments — base rate applies). */
  pct: number
  lateDropIfDroppedNow: boolean
  /** Customer moved the date after this Sweeper took the job — drop is free. */
  rescheduledByCustomer: boolean
}

export type SweeperBoard = {
  me: CrewMemberTier
  open: OpenJob[]
  /** Jobs on the board that open to this Sweeper's tier later. */
  upcoming: { count: number; nextAt: string | null }
  mine: MyJob[]
  /** Today (business day): scheduled jobs, completed, and estimated pay if all finish on time. */
  today: { jobs: number; done: number; estimated: number }
}

const valueOf = (j: Pick<Job, 'service_value' | 'total_amount'>): number => j.service_value ?? j.total_amount

const dayKey = (iso: string): string => {
  const d = localDate(new Date(iso))
  return `${d.year}-${d.month}-${d.day}`
}

function area(address: string): string {
  const p = parseServiceAddress(address)
  return p.city ? `${p.city}, ${p.state} ${p.zip}`.trim() : 'Norman area'
}

export async function getSweeperBoard(sweeperId: string, now: Date = new Date()): Promise<SweeperBoard | null> {
  const supabase = createServiceClient()
  const { crew, populated } = await getCrewTiers(now)
  const me = crew.get(sweeperId)
  if (!me) return null

  const today = dayRange(now).start.toISOString()
  const [openRes, mineRes] = await Promise.all([
    supabase
      .from('jobs')
      .select(BOARD_COLUMNS)
      .eq('status', 'confirmed')
      .is('sweeper_id', null)
      .not('board_opened_at', 'is', null)
      .eq('is_demo', me.isDemo)
      .gte('scheduled_at', today)
      .order('scheduled_at', { ascending: true })
      .limit(200),
    supabase
      .from('jobs')
      .select(BOARD_COLUMNS)
      .eq('sweeper_id', sweeperId)
      .neq('status', 'cancelled')
      .gte('scheduled_at', today)
      .order('scheduled_at', { ascending: true }),
  ])
  if (openRes.error) throw openRes.error
  if (mineRes.error) throw mineRes.error
  const openRows: BoardRow[] = openRes.data
  const mineRows: BoardRow[] = mineRes.data

  const perDay = new Map<string, number>()
  for (const j of mineRows) if (j.scheduled_at) perDay.set(dayKey(j.scheduled_at), (perDay.get(dayKey(j.scheduled_at)) ?? 0) + 1)

  const open: OpenJob[] = []
  let laterCount = 0
  let nextAt: Date | null = null
  for (const j of openRows) {
    const visibleAt = me.isDemo ? new Date(j.board_opened_at!) : tierVisibleAt(new Date(j.board_opened_at!), me.tier, populated)
    if (visibleAt > now) {
      laterCount += 1
      if (!nextAt || visibleAt < nextAt) nextAt = visibleAt
      continue
    }
    open.push({
      id: j.id,
      scheduledAt: j.scheduled_at,
      timeWindow: j.time_window,
      area: area(j.address),
      shelterSize: j.shelter_size,
      services: j.service_type,
      serviceValue: valueOf(j),
      visibleAt: visibleAt.toISOString(),
      pct: claimPct(now.getTime() - visibleAt.getTime()),
      dayFull: j.scheduled_at ? (perDay.get(dayKey(j.scheduled_at)) ?? 0) >= JOB_BOARD.MAX_JOBS_PER_DAY : false,
    })
  }

  const active = mineRows.filter((j) => j.status === 'confirmed' || j.status === 'in_progress')
  const names = new Map<string, string>()
  if (active.length > 0) {
    const { data: customers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', Array.from(new Set(active.map((j) => j.customer_id))))
    for (const c of customers ?? []) names.set(c.id, (c.full_name ?? 'Customer').split(/\s+/)[0])
  }

  const mine: MyJob[] = active.map((j) => ({
    id: j.id,
    scheduledAt: j.scheduled_at,
    timeWindow: j.time_window,
    address: j.address,
    customerFirstName: names.get(j.customer_id) ?? 'Customer',
    shelterSize: j.shelter_size,
    services: j.service_type,
    notes: j.notes,
    status: j.status,
    serviceValue: valueOf(j),
    pct: lockedPct(j),
    rescheduledByCustomer: Boolean(j.rescheduled_at && j.claimed_at && new Date(j.rescheduled_at) > new Date(j.claimed_at)),
    lateDropIfDroppedNow:
      !(j.rescheduled_at && j.claimed_at && new Date(j.rescheduled_at) > new Date(j.claimed_at)) &&
      (j.scheduled_at ? new Date(j.scheduled_at).getTime() - now.getTime() < JOB_BOARD.FREE_DROP_HOURS * 3_600_000 : false),
  }))

  const todayRange = dayRange(now)
  const todays = mineRows.filter(
    (j) => j.scheduled_at && new Date(j.scheduled_at) >= todayRange.start && new Date(j.scheduled_at) < todayRange.end
  )
  const todayStats = {
    jobs: todays.length,
    done: todays.filter((j) => j.status === 'complete').length,
    estimated: todays.reduce((n, j) => n + potentialPay(valueOf(j), lockedPct(j)), 0),
  }

  return { me, open, upcoming: { count: laterCount, nextAt: nextAt?.toISOString() ?? null }, mine, today: todayStats }
}

// ---- Actions ----------------------------------------------------------------

export type BoardActionError = { error: string; code: string; status: number }

export async function claimJob(
  sweeperId: string,
  jobId: string,
  now: Date = new Date()
): Promise<{ pct: number } | BoardActionError> {
  const supabase = createServiceClient()
  const { data: job, error } = await supabase.from('jobs').select(BOARD_COLUMNS).eq('id', jobId).maybeSingle()
  if (error) throw error
  if (!job) return { error: 'Job not found', code: 'NOT_FOUND', status: 404 }
  if (job.status !== 'confirmed' || job.sweeper_id || !job.board_opened_at) {
    return { error: 'Another Sweeper already claimed this job', code: 'TAKEN', status: 409 }
  }
  if (!job.scheduled_at || new Date(job.scheduled_at) < dayRange(now).start) {
    return { error: 'This job is no longer available', code: 'EXPIRED', status: 409 }
  }

  const { crew, populated } = await getCrewTiers(now)
  const me = crew.get(sweeperId)
  if (!me) return { error: 'Only active Sweepers can claim jobs', code: 'NOT_SWEEPER', status: 403 }
  if (me.isDemo !== job.is_demo) return { error: 'Job not found', code: 'NOT_FOUND', status: 404 }
  if (!me.trained) return { error: 'Finish your training (Training tab) before claiming jobs', code: 'TRAINING_REQUIRED', status: 403 }
  const visibleAt = me.isDemo ? new Date(job.board_opened_at) : tierVisibleAt(new Date(job.board_opened_at), me.tier, populated)
  if (visibleAt > now) {
    return { error: 'This job is not open to your tier yet', code: 'NOT_YET', status: 403 }
  }

  const { start, end } = dayRange(new Date(job.scheduled_at))
  const { count, error: cErr } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('sweeper_id', sweeperId)
    .neq('status', 'cancelled')
    .gte('scheduled_at', start.toISOString())
    .lt('scheduled_at', end.toISOString())
  if (cErr) throw cErr
  if ((count ?? 0) >= JOB_BOARD.MAX_JOBS_PER_DAY) {
    return {
      error: `You already have ${JOB_BOARD.MAX_JOBS_PER_DAY} jobs that day`,
      code: 'DAILY_LIMIT',
      status: 409,
    }
  }

  // Conditional update — if two Sweepers tap at once, exactly one wins.
  const { data: won, error: uErr } = await supabase
    .from('jobs')
    .update({
      sweeper_id: sweeperId,
      claimed_at: now.toISOString(),
      assigned_via: 'claim',
      claim_visible_at: visibleAt.toISOString(),
      claimed_tier: me.tier,
    })
    .eq('id', jobId)
    .is('sweeper_id', null)
    .eq('status', 'confirmed')
    .select('id')
  if (uErr) throw uErr
  if (!won?.length) return { error: 'Another Sweeper already claimed this job', code: 'TAKEN', status: 409 }

  await supabase.from('job_claim_events').insert({ job_id: jobId, sweeper_id: sweeperId, event: 'claim' })
  return { pct: claimPct(now.getTime() - visibleAt.getTime()) }
}

export async function dropJob(
  sweeperId: string,
  jobId: string,
  now: Date = new Date()
): Promise<{ late: boolean } | BoardActionError> {
  const supabase = createServiceClient()
  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, sweeper_id, status, scheduled_at, rescheduled_at, claimed_at')
    .eq('id', jobId)
    .maybeSingle()
  if (error) throw error
  if (!job || job.sweeper_id !== sweeperId) return { error: 'Job not found', code: 'NOT_FOUND', status: 404 }
  if (job.status !== 'confirmed') {
    return { error: 'Jobs already started or finished can’t be dropped — contact the office', code: 'LOCKED', status: 409 }
  }

  // A customer reschedule after the claim makes any drop free.
  const movedByCustomer = Boolean(job.rescheduled_at && job.claimed_at && new Date(job.rescheduled_at) > new Date(job.claimed_at))
  const late =
    !movedByCustomer &&
    (job.scheduled_at
      ? new Date(job.scheduled_at).getTime() - now.getTime() < JOB_BOARD.FREE_DROP_HOURS * 3_600_000
      : false)

  // Trigger re-opens the job on the board (fresh drip) when sweeper_id clears.
  const { data: dropped, error: uErr } = await supabase
    .from('jobs')
    .update({ sweeper_id: null })
    .eq('id', jobId)
    .eq('sweeper_id', sweeperId)
    .eq('status', 'confirmed')
    .select('id')
  if (uErr) throw uErr
  if (!dropped?.length) return { error: 'Job not found', code: 'NOT_FOUND', status: 404 }

  await supabase
    .from('job_claim_events')
    .insert({ job_id: jobId, sweeper_id: sweeperId, event: late ? 'late_drop' : 'drop' })
  return { late }
}
