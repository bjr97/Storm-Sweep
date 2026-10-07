import { JOB_LIST_LIMIT, type JobStatusFilter, type JobWhenFilter } from '@/lib/admin/jobConstants'
import { dayRange, localDate, localMidnight } from '@/lib/admin/time'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildChecklist, completionBlockers, isItemDone, type RunState } from '@/lib/sweepers/jobRun'
import type { Job, JobIssue, JobPhoto, JobUpgrade, PhotoType } from '@/types/database'

/**
 * Admin job queries. Run as the signed-in admin (RLS is_admin()). The service
 * client is used only for things RLS can't reach: auth emails and signed
 * storage URLs — callers must already be verified admins (admin layout).
 */

export type PersonSummary = { id: string; name: string; phone: string | null; isMember: boolean }

export type JobListItem = Pick<
  Job,
  'id' | 'status' | 'service_type' | 'scheduled_at' | 'time_window' | 'address' | 'total_amount' | 'service_value' | 'payment_status' | 'photo_grade' | 'photo_approved' | 'sweeper_id' | 'created_at'
> & { customer: PersonSummary; sweeperName: string | null }


const LIST_COLUMNS =
  'id, customer_id, sweeper_id, status, service_type, scheduled_at, time_window, address, total_amount, service_value, payment_status, photo_grade, photo_approved, created_at'

/** Strip characters that have meaning in PostgREST filter strings. */
function sanitizeSearch(q: string): string {
  return q.replace(/[,()*%\\:]/g, ' ').trim().slice(0, 80)
}

async function loadPeople(ids: string[]): Promise<Map<string, PersonSummary>> {
  const people = new Map<string, PersonSummary>()
  if (ids.length === 0) return people
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, membership_status')
    .in('id', ids)
  if (error) {
    console.error('[admin/jobs] loadPeople', error)
    throw new Error('Failed to load customers')
  }
  for (const p of data) {
    people.set(p.id, {
      id: p.id,
      name: p.full_name ?? 'Customer',
      phone: p.phone,
      isMember: p.membership_status === 'active',
    })
  }
  return people
}

type ListRow = Pick<Job, 'customer_id'> & Omit<JobListItem, 'customer' | 'sweeperName'>

async function withPeople(rows: ListRow[]): Promise<JobListItem[]> {
  const ids = new Set<string>()
  for (const r of rows) {
    ids.add(r.customer_id)
    if (r.sweeper_id) ids.add(r.sweeper_id)
  }
  const people = await loadPeople(Array.from(ids))
  return rows.map(({ customer_id, ...rest }) => ({
    ...rest,
    customer: people.get(customer_id) ?? { id: customer_id, name: 'Customer', phone: null, isMember: false },
    sweeperName: rest.sweeper_id ? people.get(rest.sweeper_id)?.name ?? 'Sweeper' : null,
  }))
}

export async function listJobs(filters: {
  status: JobStatusFilter
  when: JobWhenFilter
  q: string
}): Promise<{ jobs: JobListItem[]; truncated: boolean }> {
  const supabase = createClient()
  const todayStart = dayRange().start.toISOString()
  let query = supabase.from('jobs').select(LIST_COLUMNS)

  if (filters.status !== 'all') query = query.eq('status', filters.status)
  if (filters.when === 'upcoming') {
    // Unscheduled (quote) jobs count as upcoming so they never get lost.
    query = query.or(`scheduled_at.gte.${todayStart},scheduled_at.is.null`)
  } else if (filters.when === 'past') {
    query = query.lt('scheduled_at', todayStart)
  }

  const q = sanitizeSearch(filters.q)
  if (q) {
    const { data: matches, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('full_name', `%${q}%`)
      .limit(200)
    if (error) throw new Error('Failed to search customers')
    const ids = matches.map((m) => m.id)
    query = ids.length
      ? query.or(`address.ilike.%${q}%,customer_id.in.(${ids.join(',')})`)
      : query.ilike('address', `%${q}%`)
  }

  const { data, error } = await query
    .order('scheduled_at', { ascending: filters.when !== 'past', nullsFirst: false })
    .limit(JOB_LIST_LIMIT + 1)

  if (error) {
    console.error('[admin/jobs] listJobs', error)
    throw new Error('Failed to load jobs')
  }

  const truncated = data.length > JOB_LIST_LIMIT
  return { jobs: await withPeople(data.slice(0, JOB_LIST_LIMIT)), truncated }
}

export type SweeperOption = { id: string; name: string }

export async function listSweepers(): Promise<SweeperOption[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, sweeper_available')
    .eq('role', 'sweeper')
    .order('full_name')
  if (error) throw new Error('Failed to load sweepers')
  // Off-duty Sweepers stay assignable but are labeled so the admin can tell.
  return data.map((s) => ({ id: s.id, name: s.sweeper_available ? s.full_name ?? 'Sweeper' : `${s.full_name ?? 'Sweeper'} (off)` }))
}

// ---------- Schedule ----------

export type ScheduleDay = {
  /** Local midnight (America/Chicago) as a UTC instant. */
  date: Date
  /** YYYY-MM-DD in business time — stable key / URL value. */
  key: string
  inMonth: boolean
  isToday: boolean
  jobs: JobListItem[]
}

export type ScheduleMonth = {
  /** First of the displayed month (local midnight). */
  month: Date
  /** Calendar rows, Monday-first, padded with days from adjacent months. */
  weeks: ScheduleDay[][]
}

function dayKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Month grid for /admin/schedule. `monthOffset` 0 = current month, -1 = last month. */
export async function getScheduleMonth(monthOffset: number, now: Date = new Date()): Promise<ScheduleMonth> {
  const today = localDate(now)
  const first = localMidnight(today.year, today.month + monthOffset, 1)
  const f = localDate(first)
  const daysInMonth = localDate(localMidnight(f.year, f.month + 1, 0)).day
  const leading = (f.weekday + 6) % 7 // days before the 1st to reach Monday
  const cells = Math.ceil((leading + daysInMonth) / 7) * 7

  const gridStart = localMidnight(f.year, f.month, 1 - leading)
  const gridEnd = localMidnight(f.year, f.month, 1 - leading + cells)

  const supabase = createClient()
  const { data, error } = await supabase
    .from('jobs')
    .select(LIST_COLUMNS)
    .gte('scheduled_at', gridStart.toISOString())
    .lt('scheduled_at', gridEnd.toISOString())
    .order('scheduled_at', { ascending: true })
  if (error) {
    console.error('[admin/jobs] getScheduleMonth', error)
    throw new Error('Failed to load schedule')
  }
  const jobs = await withPeople(data)
  const todayStart = dayRange(now).start.getTime()

  const days: ScheduleDay[] = Array.from({ length: cells }, (_, i) => {
    const start = localMidnight(f.year, f.month, 1 - leading + i)
    const end = localMidnight(f.year, f.month, 2 - leading + i)
    const ld = localDate(start)
    return {
      date: start,
      key: dayKey(ld.year, ld.month, ld.day),
      inMonth: ld.month === f.month,
      isToday: start.getTime() === todayStart,
      jobs: jobs.filter((j) => {
        const t = j.scheduled_at ? new Date(j.scheduled_at).getTime() : NaN
        return t >= start.getTime() && t < end.getTime()
      }),
    }
  })

  return {
    month: first,
    weeks: Array.from({ length: cells / 7 }, (_, w) => days.slice(w * 7, w * 7 + 7)),
  }
}

// ---------- Detail ----------

export type JobPhotoView = { id: string; type: PhotoType | 'booking_screen'; url: string | null; consent: boolean; createdAt: string }

export type JobDetail = {
  job: Job
  customer: PersonSummary & { email: string | null; address: string | null; visitsUsed: number }
  sweeperName: string | null
  partnerName: string | null
  checklist: { id: string; phase: number; label: string; required: boolean; done: boolean }[]
  photos: JobPhotoView[]
  issues: JobIssue[]
  upgrades: JobUpgrade[]
  blockers: string[]
}

export async function getJobDetail(id: string): Promise<JobDetail | null> {
  const supabase = createClient()
  const { data: job, error } = await supabase.from('jobs').select('*').eq('id', id).maybeSingle()
  if (error) {
    console.error('[admin/jobs] getJobDetail', error)
    throw new Error('Failed to load job')
  }
  if (!job) return null

  const [profileRes, sweeperRes, partnerRes, photosRes, issuesRes, upgradesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, phone, address, membership_status, visits_used')
      .eq('id', job.customer_id)
      .maybeSingle(),
    job.sweeper_id
      ? supabase.from('profiles').select('full_name').eq('id', job.sweeper_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    job.partner_id
      ? supabase.from('partners').select('name').eq('id', job.partner_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('job_photos').select('*').eq('job_id', id).order('created_at'),
    supabase.from('job_issues').select('*').eq('job_id', id).order('created_at', { ascending: false }),
    // Service client: reads don't depend on the job_upgrades RLS policy (page is admin-gated).
    createServiceClient().from('job_upgrades').select('*').eq('job_id', id).order('approved_at'),
  ])

  const service = createServiceClient()
  const { data: authUser } = await service.auth.admin.getUserById(job.customer_id)

  // Signed URLs (1 hour) for job photos + the booking-screen photo(s).
  const photoRows: JobPhoto[] = photosRes.data ?? []
  const isVideo = (p: JobPhoto): boolean => p.photo_type.startsWith('video_')
  const signed = new Map<string, string>()
  for (const [bucket, paths] of [
    ['job-photos', [...photoRows.filter((p) => !isVideo(p)).map((p) => p.storage_path), ...job.photo_urls]],
    ['job-videos', photoRows.filter(isVideo).map((p) => p.storage_path)],
  ] as const) {
    if (paths.length === 0) continue
    const { data: urls } = await service.storage.from(bucket).createSignedUrls([...paths], 3600)
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl)
  }

  const issues: JobIssue[] = issuesRes.data ?? []
  const runState: RunState = {
    status: job.status,
    serviceTypes: job.service_type,
    progress:
      job.checklist_progress && typeof job.checklist_progress === 'object' && !Array.isArray(job.checklist_progress)
        ? (job.checklist_progress as Record<string, string>)
        : {},
    enRouteAt: job.en_route_at,
    signedAt: job.customer_signed_at,
    photoItems: new Set(photoRows.map((p) => p.checklist_item).filter((x): x is string => Boolean(x))),
    photoCounts: {
      before: photoRows.filter((p) => p.photo_type === 'before').length,
      after: photoRows.filter((p) => p.photo_type === 'after').length,
    },
    openIssues: issues.filter((i) => i.status === 'open').length,
  }
  const profile = profileRes.data

  return {
    job,
    customer: {
      id: job.customer_id,
      name: profile?.full_name ?? 'Customer',
      phone: profile?.phone ?? null,
      isMember: profile?.membership_status === 'active',
      email: authUser.user?.email ?? null,
      address: profile?.address ?? null,
      visitsUsed: profile?.visits_used ?? 0,
    },
    sweeperName: sweeperRes.data?.full_name ?? (job.sweeper_id ? 'Sweeper' : null),
    partnerName: partnerRes.data?.name ?? null,
    checklist: buildChecklist(job.service_type).map((item) => ({ ...item, done: isItemDone(item, runState) })),
    photos: [
      ...job.photo_urls.map((path, i) => ({
        id: `booking-${i}`,
        type: 'booking_screen' as const,
        url: signed.get(path) ?? null,
        consent: false,
        createdAt: job.created_at,
      })),
      ...photoRows.map((p) => ({
        id: p.id,
        type: p.photo_type,
        url: signed.get(p.storage_path) ?? null,
        consent: p.customer_consent,
        createdAt: p.created_at,
      })),
    ],
    issues,
    upgrades: upgradesRes.data ?? [],
    blockers: job.status === 'in_progress' ? completionBlockers(runState) : [],
  }
}

