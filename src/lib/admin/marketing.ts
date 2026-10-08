import { parseServiceAddress } from '@/lib/booking/address'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Marketing queue (admin). CLAUDE.md rule: never publish content unless the
 * job_photos rows carry customer_consent = true. Consent is checked when a
 * post is drafted AND when it is marked posted (customers can withdraw it).
 * Posts never include the customer's name or street address — city only.
 */

export type ShareablePhoto = { id: string; url: string | null }
export type ShareableVisit = {
  jobId: string
  completedAt: string
  city: string
  shelterSize: string
  services: string[]
  before: ShareablePhoto[]
  after: ShareablePhoto[]
  drafted: boolean
}

export type PostRow = {
  id: string
  jobId: string | null
  platform: 'tiktok' | 'instagram' | 'facebook'
  caption: string | null
  publishedAt: string | null
  createdAt: string
  /** Consent still present on the job's before/after photos right now. */
  consentOk: boolean
}

const SIZE: Record<string, string> = { small: 'small', standard: 'standard', large: 'large', xlarge: 'extra-large' }

export function defaultCaption(city: string, shelterSize: string): string {
  return `Before ➜ after: a ${SIZE[shelterSize] ?? ''} storm shelter in ${city}, cleaned, lit and ready for storm season. 🌪️ Is yours? Book at stormsweep.com #NormanOK #StormShelter #TornadoSeason`
}

/** Jobs whose before AND after photos the customer allowed for marketing. */
export async function consentedJobIds(jobIds?: string[]): Promise<Set<string>> {
  let q = createClient().from('job_photos').select('job_id, photo_type').eq('customer_consent', true).in('photo_type', ['before', 'after'])
  if (jobIds) q = q.in('job_id', jobIds)
  const { data, error } = await q
  if (error) throw error
  const kinds = new Map<string, Set<string>>()
  for (const p of data) kinds.set(p.job_id, (kinds.get(p.job_id) ?? new Set()).add(p.photo_type))
  return new Set(Array.from(kinds.entries()).filter(([, k]) => k.has('before') && k.has('after')).map(([id]) => id))
}

export async function getMarketingQueue(): Promise<{ visits: ShareableVisit[]; posts: PostRow[] }> {
  const supabase = createClient()
  const okJobs = await consentedJobIds()
  const [postsRes, jobsRes, photosRes] = await Promise.all([
    supabase.from('social_posts').select('id, job_id, platform, caption, published_at, created_at').order('created_at', { ascending: false }).limit(200),
    okJobs.size
      ? supabase.from('jobs').select('id, completed_at, address, shelter_size, service_type').eq('is_demo', false).in('id', Array.from(okJobs)).eq('status', 'complete').order('completed_at', { ascending: false }).limit(60)
      : Promise.resolve({ data: [], error: null }),
    okJobs.size
      ? supabase.from('job_photos').select('id, job_id, photo_type, storage_path').in('job_id', Array.from(okJobs)).eq('customer_consent', true).in('photo_type', ['before', 'after'])
      : Promise.resolve({ data: [], error: null }),
  ])
  if (postsRes.error) throw postsRes.error
  if (jobsRes.error) throw jobsRes.error
  if (photosRes.error) throw photosRes.error

  const photos = photosRes.data ?? []
  const signed = new Map<string, string>()
  if (photos.length) {
    const { data } = await createServiceClient().storage.from('job-photos').createSignedUrls(photos.map((p) => p.storage_path), 3600)
    for (const u of data ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl)
  }
  const drafted = new Set(postsRes.data.map((p) => p.job_id).filter(Boolean))
  const view = (p: (typeof photos)[number]): ShareablePhoto => ({ id: p.id, url: signed.get(p.storage_path) ?? null })

  const visits: ShareableVisit[] = (jobsRes.data ?? []).map((j) => ({
    jobId: j.id,
    completedAt: j.completed_at ?? '',
    city: parseServiceAddress(j.address).city || 'Norman',
    shelterSize: j.shelter_size,
    services: j.service_type,
    before: photos.filter((p) => p.job_id === j.id && p.photo_type === 'before').map(view),
    after: photos.filter((p) => p.job_id === j.id && p.photo_type === 'after').map(view),
    drafted: drafted.has(j.id),
  }))

  const postJobIds = postsRes.data.map((p) => p.job_id).filter((x): x is string => Boolean(x))
  const stillOk = postJobIds.length ? await consentedJobIds(postJobIds) : new Set<string>()
  const posts: PostRow[] = postsRes.data.map((p) => ({
    id: p.id,
    jobId: p.job_id,
    platform: p.platform as PostRow['platform'],
    caption: p.caption,
    publishedAt: p.published_at,
    createdAt: p.created_at ?? '',
    consentOk: p.job_id ? stillOk.has(p.job_id) : false,
  }))
  return { visits, posts }
}
