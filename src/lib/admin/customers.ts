import { createServiceClient } from '@/lib/supabase/server'
import type { Job, Profile, Review } from '@/types/database'

/**
 * Admin customer directory (server-only, behind the admin layout). Uses the
 * service client to join auth emails with profiles; stats come from jobs.
 * Spend = what customers paid or owe on non-cancelled visits (cents).
 */

export const CUSTOMER_FILTERS = ['all', 'members', 'one_time', 'no_visits'] as const
export type CustomerFilter = (typeof CUSTOMER_FILTERS)[number]

export type CustomerRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  isMember: boolean
  plan: Profile['membership_plan']
  visitsUsed: number
  completed: number
  upcoming: number
  spend: number
  lastVisit: string | null
  nextVisit: string | null
  avgRating: number | null
  joined: string
}

async function emailsById(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const auth = createServiceClient().auth.admin
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await auth.listUsers({ page, perPage: 1000 })
    if (error) throw error
    for (const u of data.users) if (u.email) map.set(u.id, u.email)
    if (data.users.length < 1000) break
  }
  return map
}

type JobStat = Pick<Job, 'customer_id' | 'status' | 'total_amount' | 'scheduled_at' | 'completed_at'>

function statsFor(id: string, jobs: JobStat[], reviews: Pick<Review, 'customer_id' | 'rating'>[], now: Date) {
  const mine = jobs.filter((j) => j.customer_id === id)
  const done = mine.filter((j) => j.status === 'complete')
  const upcoming = mine
    .filter((j) => (j.status === 'pending' || j.status === 'confirmed' || j.status === 'in_progress') && j.scheduled_at && new Date(j.scheduled_at) >= new Date(now.getTime() - 86_400_000))
    .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
  const ratings = reviews.filter((r) => r.customer_id === id).map((r) => r.rating)
  return {
    completed: done.length,
    upcoming: upcoming.length,
    spend: mine.filter((j) => j.status !== 'cancelled').reduce((n, j) => n + j.total_amount, 0),
    lastVisit: done.map((j) => j.completed_at ?? '').sort().at(-1) || null,
    nextVisit: upcoming[0]?.scheduled_at ?? null,
    avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
  }
}

export async function listCustomers(
  filter: CustomerFilter,
  q: string,
  now: Date = new Date()
): Promise<{ customers: CustomerRow[]; counts: Record<CustomerFilter, number> }> {
  const supabase = createServiceClient()
  const [profilesRes, jobsRes, reviewsRes, emails] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, phone, address, membership_status, membership_plan, visits_used, created_at')
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase.from('jobs').select('customer_id, status, total_amount, scheduled_at, completed_at').limit(10000),
    supabase.from('reviews').select('customer_id, rating').limit(10000),
    emailsById(),
  ])
  if (profilesRes.error) throw profilesRes.error
  if (jobsRes.error) throw jobsRes.error
  if (reviewsRes.error) throw reviewsRes.error

  const all: CustomerRow[] = profilesRes.data.map((p) => ({
    id: p.id,
    name: p.full_name ?? 'Customer',
    email: emails.get(p.id) ?? null,
    phone: p.phone,
    address: p.address,
    isMember: p.membership_status === 'active',
    plan: p.membership_plan,
    visitsUsed: p.visits_used,
    joined: p.created_at,
    ...statsFor(p.id, jobsRes.data, reviewsRes.data, now),
  }))

  const needle = q.trim().toLowerCase()
  const digits = needle.replace(/\D/g, '')
  const matches = (c: CustomerRow): boolean =>
    !needle ||
    [c.name, c.email, c.address].some((v) => v?.toLowerCase().includes(needle)) ||
    (digits.length >= 3 && (c.phone ?? '').replace(/\D/g, '').includes(digits))

  const byFilter: Record<CustomerFilter, (c: CustomerRow) => boolean> = {
    all: () => true,
    members: (c) => c.isMember,
    one_time: (c) => !c.isMember && c.completed + c.upcoming > 0,
    no_visits: (c) => c.completed + c.upcoming === 0,
  }
  const searched = all.filter(matches)
  return {
    customers: searched.filter(byFilter[filter]),
    counts: {
      all: searched.length,
      members: searched.filter(byFilter.members).length,
      one_time: searched.filter(byFilter.one_time).length,
      no_visits: searched.filter(byFilter.no_visits).length,
    },
  }
}

export type CustomerDetail = {
  profile: Pick<
    Profile,
    'id' | 'full_name' | 'phone' | 'address' | 'membership_status' | 'membership_plan' | 'membership_renews_at' | 'visits_used' | 'membership_commitment_ends_at' | 'marketing_photo_consent' | 'created_at' | 'referral_code' | 'referral_credit' | 'sms_opt_out' | 'sms_opt_out_at'
  >
  email: string | null
  jobs: Pick<Job, 'id' | 'status' | 'scheduled_at' | 'time_window' | 'service_type' | 'total_amount' | 'payment_status' | 'referral_source' | 'membership_visit'>[]
  reviews: Pick<Review, 'job_id' | 'rating' | 'body' | 'created_at'>[]
  /** Friends this customer referred (distinct customers, non-cancelled visits). */
  friendsReferred: number
}

export async function getCustomerDetail(id: string): Promise<CustomerDetail | null> {
  const supabase = createServiceClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, address, membership_status, membership_plan, membership_renews_at, visits_used, membership_commitment_ends_at, marketing_photo_consent, created_at, role, referral_code, referral_credit, sms_opt_out, sms_opt_out_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!profile || profile.role !== 'customer') return null

  const [jobsRes, reviewsRes, authRes, referredRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, status, scheduled_at, time_window, service_type, total_amount, payment_status, referral_source, membership_visit')
      .eq('customer_id', id)
      .order('scheduled_at', { ascending: false, nullsFirst: true }),
    supabase.from('reviews').select('job_id, rating, body, created_at').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.auth.admin.getUserById(id),
    supabase.from('jobs').select('customer_id').eq('referred_by', id).neq('status', 'cancelled'),
  ])
  if (jobsRes.error) throw jobsRes.error
  const { role: _role, ...rest } = profile
  void _role
  return {
    profile: rest,
    email: authRes.data.user?.email ?? null,
    jobs: jobsRes.data,
    reviews: reviewsRes.data ?? [],
    friendsReferred: new Set((referredRes.data ?? []).map((j) => j.customer_id)).size,
  }
}
