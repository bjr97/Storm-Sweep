import { dayRange, formatBusinessDate, monthRange, weekRange, type Range } from '@/lib/admin/time'
import { createClient } from '@/lib/supabase/server'
import type { Job, JobStatus } from '@/types/database'

/**
 * Admin dashboard data. Runs as the signed-in admin — RLS (is_admin())
 * grants read access to every row, so no service-role key is needed.
 * All money values are integer cents.
 */

const PAID_STATUSES = ['deposit_paid', 'paid'] as const

export type DashboardKpis = {
  /** Booked visit revenue (paid/deposit-paid jobs created) this month. Excludes memberships (billed in Stripe). */
  revenueMtd: number
  /** Same metric for last month, up to the same day-of-month — for the comparison. */
  revenuePrevPeriod: number
  jobsThisWeek: number
  jobsLastWeek: number
  activeMembers: number
  /** Paying customers who are NOT active members (bought at least one visit). */
  oneTimeCustomers: number
  /** Mean list value of this month's paid jobs; null when there are none. */
  avgJobValue: number | null
  reviewAvg: number | null
  reviewCount: number
}

export type TodayJob = {
  id: string
  time: string | null
  customerName: string
  isMember: boolean
  address: string
  services: string[]
  sweeperName: string | null
  status: JobStatus
  value: number
}

export type ActivityItem = {
  id: string
  kind: 'booking' | 'complete' | 'review'
  title: string
  detail: string
  at: string
}

export type RevenueWeek = { label: string; revenue: number; jobs: number }

export type CrewMember = {
  id: string
  name: string
  jobsToday: number
  jobsThisWeek: number
  currentJob: string | null
}

export type DashboardData = {
  kpis: DashboardKpis
  todaysJobs: TodayJob[]
  activity: ActivityItem[]
  revenueWeeks: RevenueWeek[]
  crew: CrewMember[]
}

type JobRow = Pick<
  Job,
  | 'id'
  | 'customer_id'
  | 'sweeper_id'
  | 'status'
  | 'service_type'
  | 'scheduled_at'
  | 'address'
  | 'total_amount'
  | 'service_value'
  | 'payment_status'
  | 'created_at'
  | 'completed_at'
>

const JOB_COLUMNS =
  'id, customer_id, sweeper_id, status, service_type, scheduled_at, address, total_amount, service_value, payment_status, created_at, completed_at'

function within(iso: string | null, range: Range): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= range.start.getTime() && t < range.end.getTime()
}

function isPaid(job: JobRow): boolean {
  return (PAID_STATUSES as readonly string[]).includes(job.payment_status)
}

function jobValue(job: JobRow): number {
  return job.service_value ?? job.total_amount
}

function fail(label: string, error: { message: string }): never {
  console.error(`[admin/dashboard] ${label}`, error)
  throw new Error(`Failed to load ${label}`)
}

export async function getDashboardData(now: Date = new Date()): Promise<DashboardData> {
  const supabase = createClient()

  const today = dayRange(now)
  const thisWeek = weekRange(now)
  const lastWeek = weekRange(now, 1)
  const thisMonth = monthRange(now)
  const lastMonth = monthRange(now, 1)
  const weeks = Array.from({ length: 8 }, (_, i) => weekRange(now, 7 - i))
  const earliest = new Date(Math.min(weeks[0].start.getTime(), lastMonth.start.getTime()))

  const [bookedRes, scheduledRes, completedRes, membersRes, sweepersRes, reviewsRes] =
    await Promise.all([
      // Jobs booked in the reporting window (revenue, avg value, activity).
      supabase
        .from('jobs')
        .select(JOB_COLUMNS)
        .gte('created_at', earliest.toISOString())
        .order('created_at', { ascending: false }),
      // Jobs scheduled last week through this week (counts, today, crew).
      supabase
        .from('jobs')
        .select(JOB_COLUMNS)
        .gte('scheduled_at', lastWeek.start.toISOString())
        .lt('scheduled_at', thisWeek.end.toISOString())
        .neq('status', 'cancelled')
        .order('scheduled_at', { ascending: true }),
      supabase
        .from('jobs')
        .select(JOB_COLUMNS)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(5),
      supabase.from('profiles').select('id').eq('membership_status', 'active'),
      supabase.from('profiles').select('id, full_name').eq('role', 'sweeper').order('full_name'),
      supabase
        .from('reviews')
        .select('id, rating, created_at, customer_id')
        .order('created_at', { ascending: false })
        .limit(1000),
    ])

  if (bookedRes.error) fail('booked jobs', bookedRes.error)
  if (scheduledRes.error) fail('scheduled jobs', scheduledRes.error)
  if (completedRes.error) fail('completed jobs', completedRes.error)
  if (membersRes.error) fail('members', membersRes.error)
  if (sweepersRes.error) fail('crew', sweepersRes.error)
  if (reviewsRes.error) fail('reviews', reviewsRes.error)

  const booked: JobRow[] = bookedRes.data
  const scheduled: JobRow[] = scheduledRes.data
  const completed: JobRow[] = completedRes.data
  const reviews = reviewsRes.data
  const sweepers = sweepersRes.data

  // Names for every customer/sweeper referenced on the page, in one query.
  const profileIds = new Set<string>()
  for (const job of [...booked, ...scheduled, ...completed]) {
    profileIds.add(job.customer_id)
    if (job.sweeper_id) profileIds.add(job.sweeper_id)
  }
  for (const review of reviews.slice(0, 5)) profileIds.add(review.customer_id)

  const people = new Map<string, { name: string; isMember: boolean }>()
  if (profileIds.size > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, membership_status')
      .in('id', Array.from(profileIds))
    if (error) fail('customer names', error)
    for (const p of data) {
      people.set(p.id, { name: p.full_name ?? 'Customer', isMember: p.membership_status === 'active' })
    }
  }
  const nameOf = (id: string | null): string => (id ? people.get(id)?.name ?? 'Customer' : 'Customer')

  // ---- KPIs ----
  const elapsedInMonth = now.getTime() - thisMonth.start.getTime()
  const prevPeriod: Range = {
    start: lastMonth.start,
    end: new Date(Math.min(lastMonth.start.getTime() + elapsedInMonth, lastMonth.end.getTime())),
  }
  const paidThisMonth = booked.filter((j) => isPaid(j) && within(j.created_at, thisMonth))
  const ratings = reviews.map((r) => r.rating)

  // Customer mix: active members vs. paying one-time customers (all time).
  const memberIds = new Set(membersRes.data.map((p) => p.id))
  const { data: paidJobs, error: paidErr } = await supabase
    .from('jobs')
    .select('customer_id')
    .in('payment_status', [...PAID_STATUSES])
  if (paidErr) fail('paying customers', paidErr)
  const paidCustomerIds = Array.from(new Set(paidJobs.map((j) => j.customer_id)))

  const kpis: DashboardKpis = {
    revenueMtd: paidThisMonth.reduce((sum, j) => sum + j.total_amount, 0),
    revenuePrevPeriod: booked
      .filter((j) => isPaid(j) && within(j.created_at, prevPeriod))
      .reduce((sum, j) => sum + j.total_amount, 0),
    jobsThisWeek: scheduled.filter((j) => within(j.scheduled_at, thisWeek)).length,
    jobsLastWeek: scheduled.filter((j) => within(j.scheduled_at, lastWeek)).length,
    activeMembers: memberIds.size,
    oneTimeCustomers: paidCustomerIds.filter((id) => !memberIds.has(id)).length,
    avgJobValue:
      paidThisMonth.length > 0
        ? Math.round(paidThisMonth.reduce((sum, j) => sum + jobValue(j), 0) / paidThisMonth.length)
        : null,
    reviewAvg: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    reviewCount: ratings.length,
  }

  // ---- Today's jobs ----
  const todaysJobs: TodayJob[] = scheduled
    .filter((j) => within(j.scheduled_at, today))
    .map((j) => ({
      id: j.id,
      time: j.scheduled_at,
      customerName: nameOf(j.customer_id),
      isMember: people.get(j.customer_id)?.isMember ?? false,
      address: j.address,
      services: j.service_type,
      sweeperName: j.sweeper_id ? nameOf(j.sweeper_id) : null,
      status: j.status,
      value: jobValue(j),
    }))

  // ---- Activity feed ----
  const activity: ActivityItem[] = [
    ...booked.filter(isPaid).slice(0, 6).map(
      (j): ActivityItem => ({
        id: `b-${j.id}`,
        kind: 'booking',
        title: `${nameOf(j.customer_id)} booked ${j.service_type[0] ?? 'a sweep'}`,
        detail: j.service_type.slice(1).join(', '),
        at: j.created_at,
      })
    ),
    ...completed.map(
      (j): ActivityItem => ({
        id: `c-${j.id}`,
        kind: 'complete',
        title: `${j.sweeper_id ? nameOf(j.sweeper_id) : 'Sweeper'} completed ${nameOf(j.customer_id)}'s job`,
        detail: j.address,
        at: j.completed_at ?? j.created_at,
      })
    ),
    ...reviews.slice(0, 5).map(
      (r): ActivityItem => ({
        id: `r-${r.id}`,
        kind: 'review',
        title: `${nameOf(r.customer_id)} left a ${r.rating}-star review`,
        detail: '',
        at: r.created_at,
      })
    ),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6)

  // ---- Revenue, last 8 weeks ----
  const revenueWeeks: RevenueWeek[] = weeks.map((range) => {
    const inWeek = booked.filter((j) => isPaid(j) && within(j.created_at, range))
    return {
      label: formatBusinessDate(range.start, { month: 'short', day: 'numeric' }),
      revenue: inWeek.reduce((sum, j) => sum + j.total_amount, 0),
      jobs: inWeek.length,
    }
  })

  // ---- Crew ----
  const crew: CrewMember[] = sweepers.map((s) => {
    const mine = scheduled.filter((j) => j.sweeper_id === s.id)
    const current = mine.find((j) => j.status === 'in_progress')
    return {
      id: s.id,
      name: s.full_name ?? 'Sweeper',
      jobsToday: mine.filter((j) => within(j.scheduled_at, today)).length,
      jobsThisWeek: mine.filter((j) => within(j.scheduled_at, thisWeek)).length,
      currentJob: current ? nameOf(current.customer_id) : null,
    }
  })

  return { kpis, todaysJobs, activity, revenueWeeks, crew }
}

export type PausedJob = { jobId: string; kind: string; note: string | null; reportedAt: string; address: string }

/** Jobs a Sweeper paused with a problem report — waiting on an admin decision. */
export async function getPausedJobs(): Promise<PausedJob[]> {
  const supabase = createClient()
  const { data: issues, error } = await supabase
    .from('job_issues')
    .select('job_id, kind, note, created_at')
    .eq('status', 'open')
    .order('created_at')
  if (error) fail('paused jobs', error)
  if (issues.length === 0) return []
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, address')
    .in('id', Array.from(new Set(issues.map((i) => i.job_id))))
  if (jobsError) fail('paused job addresses', jobsError)
  const address = new Map(jobs.map((j) => [j.id, j.address]))
  return issues.map((i) => ({ jobId: i.job_id, kind: i.kind, note: i.note, reportedAt: i.created_at, address: address.get(i.job_id) ?? '' }))
}

export type RefundDue = { jobId: string; customerName: string; amount: number; cancelledAt: string | null }

/** Cancelled visits whose deposit still needs refunding (manual until Stripe is live). */
export async function getRefundsDue(): Promise<RefundDue[]> {
  const supabase = createClient()
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, customer_id, deposit_amount, cancelled_at')
    .eq('refund_due', true)
    .order('cancelled_at')
  if (error) fail('refunds due', error)
  if (jobs.length === 0) return []
  const { data: people } = await supabase.from('profiles').select('id, full_name').in('id', jobs.map((j) => j.customer_id))
  const name = new Map((people ?? []).map((p) => [p.id, p.full_name ?? 'Customer']))
  return jobs.map((j) => ({ jobId: j.id, customerName: name.get(j.customer_id) ?? 'Customer', amount: j.deposit_amount ?? 0, cancelledAt: j.cancelled_at }))
}

export type InboundText = { id: string; from: string; name: string | null; body: string; keyword: string | null; at: string }

/** Latest texts customers sent in (replies, STOP/START, questions). */
export async function getRecentInboundTexts(limit = 5): Promise<InboundText[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sms_inbound')
    .select('id, from_phone, body, keyword, created_at, profile_id')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) fail('inbound texts', error)
  const ids = Array.from(new Set(data.map((d) => d.profile_id).filter((x): x is string => Boolean(x))))
  const { data: people } = ids.length ? await supabase.from('profiles').select('id, full_name').in('id', ids) : { data: [] }
  const name = new Map((people ?? []).map((p) => [p.id, p.full_name]))
  return data.map((d) => ({ id: d.id, from: d.from_phone, name: d.profile_id ? name.get(d.profile_id) ?? null : null, body: d.body, keyword: d.keyword, at: d.created_at }))
}

export type QuoteToPrice = { jobId: string; customerName: string; requestedFor: string | null; createdAt: string }

/** X-Large quote requests still waiting for a price. */
export async function getQuotesToPrice(): Promise<QuoteToPrice[]> {
  const supabase = createClient()
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, customer_id, scheduled_at, created_at')
    .eq('status', 'pending')
    .eq('shelter_size', 'xlarge')
    .eq('total_amount', 0)
    .order('created_at')
  if (error) fail('quotes to price', error)
  if (jobs.length === 0) return []
  const { data: people } = await supabase.from('profiles').select('id, full_name').in('id', jobs.map((j) => j.customer_id))
  const name = new Map((people ?? []).map((p) => [p.id, p.full_name ?? 'Customer']))
  return jobs.map((j) => ({ jobId: j.id, customerName: name.get(j.customer_id) ?? 'Customer', requestedFor: j.scheduled_at, createdAt: j.created_at }))
}
