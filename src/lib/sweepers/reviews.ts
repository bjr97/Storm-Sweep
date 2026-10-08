import { createServiceClient } from '@/lib/supabase/server'

/** A Sweeper's own customer reviews (server-only). Customer shown by first name only. */

export type SweeperReview = {
  jobId: string
  rating: number
  body: string | null
  customerFirstName: string
  visitDate: string | null
  createdAt: string
}

export type SweeperReviewSummary = {
  reviews: SweeperReview[]
  average: number | null
  count: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}

export async function getSweeperReviews(sweeperId: string, limit = 50): Promise<SweeperReviewSummary> {
  const supabase = createServiceClient()
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, scheduled_at')
    .eq('sweeper_id', sweeperId)
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })
    .limit(1000)
  if (error) throw error
  const empty: SweeperReviewSummary = { reviews: [], average: null, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
  if (jobs.length === 0) return empty

  const { data: rows, error: rErr } = await supabase
    .from('reviews')
    .select('job_id, customer_id, rating, body, created_at')
    .in('job_id', jobs.map((j) => j.id))
    .order('created_at', { ascending: false })
  if (rErr) throw rErr
  if (rows.length === 0) return empty

  const { data: people } = await supabase.from('profiles').select('id, full_name').in('id', Array.from(new Set(rows.map((r) => r.customer_id))))
  const first = new Map((people ?? []).map((p) => [p.id, (p.full_name ?? 'Customer').split(/\s+/)[0]]))
  const visit = new Map(jobs.map((j) => [j.id, j.scheduled_at]))
  const distribution = { ...empty.distribution }
  for (const r of rows) distribution[Math.min(5, Math.max(1, r.rating)) as 1 | 2 | 3 | 4 | 5] += 1

  return {
    reviews: rows.slice(0, limit).map((r) => ({
      jobId: r.job_id,
      rating: r.rating,
      body: r.body,
      customerFirstName: first.get(r.customer_id) ?? 'Customer',
      visitDate: visit.get(r.job_id) ?? null,
      createdAt: r.created_at,
    })),
    average: rows.reduce((n, r) => n + r.rating, 0) / rows.length,
    count: rows.length,
    distribution,
  }
}
