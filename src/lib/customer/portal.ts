import { createClient, createServiceClient } from '@/lib/supabase/server'
import { canCustomerChange, CUSTOMER_PHOTO_TYPES } from '@/lib/customer/rules'
import { buildChecklist, isItemDone, type RunState } from '@/lib/sweepers/jobRun'
import type { Job, JobUpgrade, PhotoType, Profile, Review } from '@/types/database'

/**
 * Customer portal data. The signed-in user is resolved from the session here;
 * everything is filtered by customer_id. The service client is used for
 * storage signing and tables whose RLS doesn't cover customers.
 */

export async function currentCustomerId(): Promise<string | null> {
  const {
    data: { user },
  } = await createClient().auth.getUser()
  return user?.id ?? null
}

export type CustomerProfile = Pick<
  Profile,
  'id' | 'full_name' | 'phone' | 'address' | 'membership_status' | 'membership_plan' | 'membership_renews_at' | 'visits_used' | 'membership_commitment_ends_at' | 'marketing_photo_consent'
> & { email: string | null }

export async function getCustomerProfile(userId: string): Promise<CustomerProfile | null> {
  const supabase = createServiceClient()
  const [{ data: profile }, { data: auth }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, phone, address, membership_status, membership_plan, membership_renews_at, visits_used, membership_commitment_ends_at, marketing_photo_consent')
      .eq('id', userId)
      .maybeSingle(),
    supabase.auth.admin.getUserById(userId),
  ])
  if (!profile) return null
  return { ...profile, email: auth.user?.email ?? null }
}

export type CustomerVisit = Pick<
  Job,
  | 'id'
  | 'status'
  | 'scheduled_at'
  | 'time_window'
  | 'address'
  | 'shelter_size'
  | 'service_type'
  | 'total_amount'
  | 'deposit_amount'
  | 'payment_status'
  | 'sweeper_id'
  | 'en_route_at'
  | 'arrived_at'
  | 'completed_at'
  | 'membership_visit'
  | 'cancelled_at'
  | 'refund_due'
  | 'created_at'
> & { sweeperFirstName: string | null; canChange: boolean; reviewed: boolean; afterPhotoUrl: string | null }

const VISIT_COLUMNS =
  'id, status, scheduled_at, time_window, address, shelter_size, service_type, total_amount, deposit_amount, payment_status, sweeper_id, en_route_at, arrived_at, completed_at, membership_visit, cancelled_at, refund_due, created_at'

async function firstNames(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (ids.length === 0) return map
  const { data } = await createServiceClient().from('profiles').select('id, full_name').in('id', ids)
  for (const p of data ?? []) map.set(p.id, (p.full_name ?? 'Your Sweeper').split(/\s+/)[0])
  return map
}

export async function listCustomerVisits(userId: string, now: Date = new Date()): Promise<CustomerVisit[]> {
  const supabase = createServiceClient()
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select(VISIT_COLUMNS)
    .eq('customer_id', userId)
    .order('scheduled_at', { ascending: false, nullsFirst: true })
    .limit(200)
  if (error) throw error
  if (jobs.length === 0) return []

  const ids = jobs.map((j) => j.id)
  const [names, reviewsRes, photosRes] = await Promise.all([
    firstNames(Array.from(new Set(jobs.map((j) => j.sweeper_id).filter((x): x is string => Boolean(x))))),
    supabase.from('reviews').select('job_id').in('job_id', ids),
    supabase.from('job_photos').select('job_id, storage_path, created_at').eq('photo_type', 'after').in('job_id', ids).order('created_at'),
  ])
  const reviewed = new Set((reviewsRes.data ?? []).map((r) => r.job_id))
  const afterPath = new Map<string, string>()
  for (const p of photosRes.data ?? []) if (!afterPath.has(p.job_id)) afterPath.set(p.job_id, p.storage_path)
  const signed = new Map<string, string>()
  if (afterPath.size > 0) {
    const { data } = await supabase.storage.from('job-photos').createSignedUrls(Array.from(afterPath.values()), 3600)
    for (const u of data ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl)
  }

  return jobs.map((j) => ({
    ...j,
    sweeperFirstName: j.sweeper_id ? names.get(j.sweeper_id) ?? null : null,
    canChange: canCustomerChange(j, now),
    reviewed: reviewed.has(j.id),
    afterPhotoUrl: afterPath.has(j.id) ? signed.get(afterPath.get(j.id)!) ?? null : null,
  }))
}

export type ReportMedia = { id: string; kind: PhotoType; url: string | null; createdAt: string }

export type VisitReport = {
  visit: CustomerVisit
  job: Job
  media: ReportMedia[]
  checklist: { phase: number; done: number; total: number }[]
  installs: { label: string; done: boolean }[]
  upgrades: Pick<JobUpgrade, 'id' | 'name' | 'price' | 'discount' | 'approved_at'>[]
  findings: { kind: string; note: string | null; outcome: string }[]
  review: Pick<Review, 'rating' | 'body' | 'created_at'> | null
}

export async function getVisitReport(userId: string, jobId: string, now: Date = new Date()): Promise<VisitReport | null> {
  const supabase = createServiceClient()
  const { data: job, error } = await supabase.from('jobs').select('*').eq('id', jobId).eq('customer_id', userId).maybeSingle()
  if (error) throw error
  if (!job) return null

  const [photosRes, upgradesRes, issuesRes, reviewRes, names] = await Promise.all([
    supabase.from('job_photos').select('id, photo_type, storage_path, checklist_item, created_at').eq('job_id', jobId).order('created_at'),
    supabase.from('job_upgrades').select('id, name, price, discount, approved_at').eq('job_id', jobId).order('approved_at'),
    supabase.from('job_issues').select('kind, note, status, resolution_note').eq('job_id', jobId).neq('status', 'open'),
    supabase.from('reviews').select('rating, body, created_at').eq('job_id', jobId).maybeSingle(),
    firstNames(job.sweeper_id ? [job.sweeper_id] : []),
  ])
  const photos = photosRes.data ?? []
  const visible = photos.filter((p) => (CUSTOMER_PHOTO_TYPES as readonly string[]).includes(p.photo_type))

  const signed = new Map<string, string>()
  for (const bucket of ['job-photos', 'job-videos'] as const) {
    const paths = visible.filter((p) => p.photo_type.startsWith('video_') === (bucket === 'job-videos')).map((p) => p.storage_path)
    if (paths.length === 0) continue
    const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 3600)
    for (const u of data ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl)
  }

  const state: RunState = {
    status: job.status,
    serviceTypes: job.service_type,
    progress:
      job.checklist_progress && typeof job.checklist_progress === 'object' && !Array.isArray(job.checklist_progress)
        ? (job.checklist_progress as Record<string, string>)
        : {},
    enRouteAt: job.en_route_at,
    signedAt: job.customer_signed_at,
    photoItems: new Set(photos.map((p) => p.checklist_item).filter((x): x is string => Boolean(x))),
    photoCounts: { before: 0, after: 0 },
    openIssues: 0,
  }
  const items = buildChecklist(job.service_type)
  const checklist = [1, 2, 3, 4].map((phase) => {
    const inPhase = items.filter((i) => i.phase === phase)
    return { phase, done: inPhase.filter((i) => isItemDone(i, state)).length, total: inPhase.length }
  })
  const installs = items
    .filter((i) => i.id.startsWith('install_') || i.id === 'deliver_kit')
    .map((i) => ({ label: i.label.split(' — ')[0], done: isItemDone(i, state) }))

  const sweeperFirstName = job.sweeper_id ? names.get(job.sweeper_id) ?? null : null
  return {
    job,
    visit: {
      ...job,
      sweeperFirstName,
      canChange: canCustomerChange(job, now),
      reviewed: Boolean(reviewRes.data),
      afterPhotoUrl: null,
    },
    media: visible.map((p) => ({ id: p.id, kind: p.photo_type, url: signed.get(p.storage_path) ?? null, createdAt: p.created_at ?? '' })),
    checklist,
    installs,
    upgrades: upgradesRes.data ?? [],
    findings: (issuesRes.data ?? []).map((i) => ({
      kind: i.kind,
      note: i.note,
      outcome: i.status === 'continue' ? 'Checked by the office — work continued' : 'Visit ended early — the office will follow up',
    })),
    review: reviewRes.data ?? null,
  }
}

export type GalleryVisit = { jobId: string; date: string | null; before: ReportMedia[]; after: ReportMedia[] }

export async function getPhotoGallery(userId: string): Promise<GalleryVisit[]> {
  const supabase = createServiceClient()
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, scheduled_at, completed_at')
    .eq('customer_id', userId)
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })
  if (error) throw error
  if (jobs.length === 0) return []
  const { data: photos } = await supabase
    .from('job_photos')
    .select('id, job_id, photo_type, storage_path, created_at')
    .in('job_id', jobs.map((j) => j.id))
    .in('photo_type', ['before', 'after'])
    .order('created_at')
  const rows = photos ?? []
  const signed = new Map<string, string>()
  if (rows.length > 0) {
    const { data } = await supabase.storage.from('job-photos').createSignedUrls(rows.map((p) => p.storage_path), 3600)
    for (const u of data ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl)
  }
  const view = (p: (typeof rows)[number]): ReportMedia => ({ id: p.id, kind: p.photo_type, url: signed.get(p.storage_path) ?? null, createdAt: p.created_at ?? '' })
  return jobs
    .map((j) => ({
      jobId: j.id,
      date: j.completed_at ?? j.scheduled_at,
      before: rows.filter((p) => p.job_id === j.id && p.photo_type === 'before').map(view),
      after: rows.filter((p) => p.job_id === j.id && p.photo_type === 'after').map(view),
    }))
    .filter((v) => v.before.length + v.after.length > 0)
}
