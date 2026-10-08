import { createClient } from '@/lib/supabase/server'

/** Admin review inbox. "Needs follow-up" = 3 stars or fewer, not yet followed up. */

export const REVIEW_FILTERS = ['all', 'follow_up', 'happy'] as const
export type ReviewFilter = (typeof REVIEW_FILTERS)[number]
export const FOLLOW_UP_MAX_RATING = 3

export type ReviewRow = {
  id: string
  jobId: string
  customerId: string
  customerName: string
  sweeperName: string | null
  rating: number
  body: string | null
  createdAt: string
  adminNote: string | null
  followedUpAt: string | null
  needsFollowUp: boolean
}

export async function listReviews(filter: ReviewFilter): Promise<{
  reviews: ReviewRow[]
  counts: Record<ReviewFilter, number>
  average: number | null
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('id, job_id, customer_id, rating, body, created_at, admin_note, followed_up_at')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw error

  const jobIds = data.map((r) => r.job_id)
  const { data: jobs } = jobIds.length ? await supabase.from('jobs').select('id, sweeper_id').in('id', jobIds) : { data: [] }
  const sweeperOf = new Map((jobs ?? []).map((j) => [j.id, j.sweeper_id]))
  const peopleIds = Array.from(new Set([...data.map((r) => r.customer_id), ...(jobs ?? []).map((j) => j.sweeper_id).filter((x): x is string => Boolean(x))]))
  const { data: people } = peopleIds.length ? await supabase.from('profiles').select('id, full_name').in('id', peopleIds) : { data: [] }
  const name = new Map((people ?? []).map((p) => [p.id, p.full_name ?? 'Unknown']))

  const all: ReviewRow[] = data.map((r) => {
    const sweeperId = sweeperOf.get(r.job_id) ?? null
    return {
      id: r.id,
      jobId: r.job_id,
      customerId: r.customer_id,
      customerName: name.get(r.customer_id) ?? 'Customer',
      sweeperName: sweeperId ? name.get(sweeperId) ?? null : null,
      rating: r.rating,
      body: r.body,
      createdAt: r.created_at ?? '',
      adminNote: r.admin_note,
      followedUpAt: r.followed_up_at,
      needsFollowUp: r.rating <= FOLLOW_UP_MAX_RATING && !r.followed_up_at,
    }
  })
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>
  for (const r of all) distribution[r.rating as 1 | 2 | 3 | 4 | 5] += 1
  const counts = { all: all.length, follow_up: all.filter((r) => r.needsFollowUp).length, happy: all.filter((r) => r.rating >= 4).length }
  const filtered = filter === 'follow_up' ? all.filter((r) => r.needsFollowUp) : filter === 'happy' ? all.filter((r) => r.rating >= 4) : all
  return {
    reviews: filtered,
    counts,
    average: all.length ? all.reduce((n, r) => n + r.rating, 0) / all.length : null,
    distribution,
  }
}
