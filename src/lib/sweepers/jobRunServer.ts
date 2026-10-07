import { randomUUID } from 'node:crypto'

import { createServiceClient } from '@/lib/supabase/server'
import {
  AUTO_ITEMS,
  buildChecklist,
  completionBlockers,
  distanceMeters,
  ARRIVAL_RADIUS_M,
  ISSUE_KINDS,
  isManualItem,
  MIN_PHOTOS,
  PHOTO_ITEM_TYPE,
  upgradeName,
  upgradeQuote,
  type RunState,
  parseRecommendations,
  type MediaKind,
  type RecommendationKey,
  type SellableUpgradeId,
} from '@/lib/sweepers/jobRun'
import { rewardReferrer } from '@/lib/customer/referrals'
import { sendAdminJobIssueSms, sendJobSms } from '@/lib/twilio'
import type { Job, JobIssue, JobIssueKind, JobUpgrade, PhotoType } from '@/types/database'

/**
 * Server side of the Sweeper job run. Every function takes the caller's
 * verified sweeper id and refuses jobs not assigned to them. Uses the service
 * client: jobs RLS no longer lets Sweepers write (migration 012).
 */

export type ActionError = { error: string; code: string; status: number }
const fail = (error: string, code: string, status = 409): ActionError => ({ error, code, status })


const bucketFor = (kind: MediaKind): 'job-photos' | 'job-videos' => (kind.startsWith('video_') ? 'job-videos' : 'job-photos')

async function loadOwnJob(sweeperId: string, jobId: string): Promise<Job | ActionError> {
  const { data: job, error } = await createServiceClient().from('jobs').select('*').eq('id', jobId).maybeSingle()
  if (error) throw error
  if (!job || job.sweeper_id !== sweeperId) return fail('Job not found', 'NOT_FOUND', 404)
  return job
}

const isErr = (v: unknown): v is ActionError => typeof v === 'object' && v !== null && 'code' in v && 'status' in v

async function openIssueCount(jobId: string): Promise<number> {
  const { count, error } = await createServiceClient()
    .from('job_issues')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('status', 'open')
  if (error) throw error
  return count ?? 0
}

function bestEffort(label: string, p: Promise<unknown>): Promise<void> {
  return p.then(
    () => undefined,
    (e: unknown) => console.error(`[job-run] ${label} failed`, e)
  )
}

// ---- Geocoding (US Census — free, no key) -----------------------------------

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const body = (await res.json()) as { result?: { addressMatches?: { coordinates?: { x: number; y: number } }[] } }
    const c = body.result?.addressMatches?.[0]?.coordinates
    return c ? { lat: c.y, lng: c.x } : null
  } catch {
    return null
  }
}

// ---- Load -------------------------------------------------------------------

export type RunMedia = { id: string; kind: PhotoType; checklistItem: string | null; url: string | null; createdAt: string }

export type RunJob = {
  job: Job
  customerFirstName: string
  isMember: boolean
  media: RunMedia[]
  issues: JobIssue[]
  upgrades: JobUpgrade[]
  state: RunState
  blockers: string[]
}

export async function loadRunJob(sweeperId: string, jobId: string): Promise<RunJob | null> {
  const job = await loadOwnJob(sweeperId, jobId)
  if (isErr(job)) return null
  const supabase = createServiceClient()

  const [photosRes, issuesRes, upgradesRes, customerRes] = await Promise.all([
    supabase.from('job_photos').select('*').eq('job_id', jobId).neq('photo_type', 'booking_screen').order('created_at'),
    supabase.from('job_issues').select('*').eq('job_id', jobId).order('created_at', { ascending: false }),
    supabase.from('job_upgrades').select('*').eq('job_id', jobId).order('approved_at'),
    supabase.from('profiles').select('full_name, membership_status').eq('id', job.customer_id).maybeSingle(),
  ])
  if (photosRes.error) throw photosRes.error
  if (issuesRes.error) throw issuesRes.error
  if (upgradesRes.error) throw upgradesRes.error

  const urls = new Map<string, string>()
  for (const bucket of ['job-photos', 'job-videos'] as const) {
    const paths = photosRes.data
      .filter((p) => bucketFor(p.photo_type as MediaKind) === bucket)
      .map((p) => p.storage_path)
    if (paths.length === 0) continue
    const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 3600)
    for (const u of data ?? []) if (u.path && u.signedUrl) urls.set(u.path, u.signedUrl)
  }

  const media: RunMedia[] = photosRes.data.map((p) => ({
    id: p.id,
    kind: p.photo_type,
    checklistItem: p.checklist_item,
    url: urls.get(p.storage_path) ?? null,
    createdAt: p.created_at ?? '',
  }))

  const state = buildState(job, photosRes.data, issuesRes.data.filter((i) => i.status === 'open').length)
  return {
    job,
    customerFirstName: (customerRes.data?.full_name ?? 'Customer').split(/\s+/)[0],
    isMember: customerRes.data?.membership_status === 'active',
    media,
    issues: issuesRes.data,
    upgrades: upgradesRes.data,
    state,
    blockers: completionBlockers(state),
  }
}

function buildState(
  job: Job,
  photos: { photo_type: PhotoType; checklist_item: string | null }[],
  openIssues: number
): RunState {
  const progress =
    job.checklist_progress && typeof job.checklist_progress === 'object' && !Array.isArray(job.checklist_progress)
      ? (job.checklist_progress as Record<string, string>)
      : {}
  return {
    status: job.status,
    serviceTypes: job.service_type,
    progress,
    enRouteAt: job.en_route_at,
    signedAt: job.customer_signed_at,
    photoItems: new Set(photos.map((p) => p.checklist_item).filter((x): x is string => Boolean(x))),
    photoCounts: {
      before: photos.filter((p) => p.photo_type === 'before').length,
      after: photos.filter((p) => p.photo_type === 'after').length,
    },
    openIssues,
  }
}

async function currentState(job: Job): Promise<RunState> {
  const { data: photos, error } = await createServiceClient()
    .from('job_photos')
    .select('photo_type, checklist_item')
    .eq('job_id', job.id)
  if (error) throw error
  return buildState(job, photos, await openIssueCount(job.id))
}

// ---- Status actions ---------------------------------------------------------

export async function markEnRoute(sweeperId: string, jobId: string): Promise<{ ok: true } | ActionError> {
  const job = await loadOwnJob(sweeperId, jobId)
  if (isErr(job)) return job
  if (job.status !== 'confirmed') return fail('This job has already started', 'BAD_STATUS')
  if (job.en_route_at) return { ok: true }
  const { error } = await createServiceClient().from('jobs').update({ en_route_at: new Date().toISOString() }).eq('id', jobId)
  if (error) throw error
  await bestEffort('on_the_way SMS', sendJobSms('on_the_way', jobId))
  return { ok: true }
}

export async function markArrived(
  sweeperId: string,
  jobId: string,
  position: { lat: number; lng: number; accuracy: number } | null
): Promise<{ verified: boolean | null; distanceM: number | null } | ActionError> {
  const job = await loadOwnJob(sweeperId, jobId)
  if (isErr(job)) return job
  if (job.status !== 'confirmed') return fail('This job has already started', 'BAD_STATUS')
  if (await openIssueCount(jobId)) return fail('Waiting on the office about a reported problem', 'PAUSED')

  let distanceM: number | null = null
  let verified: boolean | null = false // location denied -> unverified (flagged for admin)
  if (position) {
    const target = await geocodeAddress(job.address)
    if (target) {
      distanceM = distanceMeters(position, target)
      // Generous: allow for GPS accuracy up to 150 m on top of the radius.
      verified = distanceM <= ARRIVAL_RADIUS_M + Math.min(position.accuracy, 150)
    } else {
      verified = null // address couldn't be geocoded; coordinates kept for review
    }
  }

  const now = new Date().toISOString()
  const { data: updated, error } = await createServiceClient()
    .from('jobs')
    .update({
      status: 'in_progress',
      arrived_at: now,
      en_route_at: job.en_route_at ?? now,
      arrival_lat: position?.lat ?? null,
      arrival_lng: position?.lng ?? null,
      arrival_accuracy_m: position ? Math.round(position.accuracy) : null,
      arrival_distance_m: distanceM,
      arrival_verified: verified,
    })
    .eq('id', jobId)
    .eq('status', 'confirmed')
    .select('id')
  if (error) throw error
  if (!updated?.length) return fail('This job has already started', 'BAD_STATUS')
  return { verified, distanceM }
}

export async function setChecklistItem(
  sweeperId: string,
  jobId: string,
  itemId: string,
  done: boolean
): Promise<{ ok: true } | ActionError> {
  const job = await loadOwnJob(sweeperId, jobId)
  if (isErr(job)) return job
  if (job.status !== 'in_progress') return fail('Start the job first', 'BAD_STATUS')
  if (await openIssueCount(jobId)) return fail('Waiting on the office about a reported problem', 'PAUSED')
  const item = buildChecklist(job.service_type).find((i) => i.id === itemId)
  if (!item) return fail('Unknown checklist item', 'BAD_ITEM', 400)
  if (!isManualItem(itemId)) return fail('This item completes automatically', 'AUTO_ITEM', 400)

  const progress = { ...(await currentState(job)).progress }
  if (done) progress[itemId] = new Date().toISOString()
  else delete progress[itemId]
  const { error } = await createServiceClient().from('jobs').update({ checklist_progress: progress }).eq('id', jobId)
  if (error) throw error
  return { ok: true }
}

// ---- Media ------------------------------------------------------------------

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}

export async function createMediaUpload(
  sweeperId: string,
  jobId: string,
  kind: MediaKind,
  contentType: string
): Promise<{ bucket: string; path: string; token: string } | ActionError> {
  const job = await loadOwnJob(sweeperId, jobId)
  if (isErr(job)) return job
  if (job.status !== 'in_progress') return fail('Start the job before adding photos', 'BAD_STATUS')
  const isVideo = kind.startsWith('video_')
  const ext = EXT[contentType]
  if (!ext || contentType.startsWith('video/') !== isVideo) return fail('Unsupported file type', 'BAD_TYPE', 400)
  if (kind === 'signature' && contentType !== 'image/png') return fail('Unsupported file type', 'BAD_TYPE', 400)

  const bucket = bucketFor(kind)
  const path = `jobs/${jobId}/${kind}/${randomUUID()}.${ext}`
  const { data, error } = await createServiceClient().storage.from(bucket).createSignedUploadUrl(path)
  if (error) throw error
  return { bucket, path, token: data.token }
}

export async function registerMedia(
  sweeperId: string,
  jobId: string,
  kind: MediaKind,
  path: string,
  checklistItem: string | null
): Promise<{ id: string } | ActionError> {
  const job = await loadOwnJob(sweeperId, jobId)
  if (isErr(job)) return job
  if (job.status !== 'in_progress') return fail('Start the job before adding photos', 'BAD_STATUS')
  if (!path.startsWith(`jobs/${jobId}/${kind}/`) || path.includes('..')) return fail('Invalid upload', 'BAD_PATH', 400)
  if (checklistItem) {
    const expected = PHOTO_ITEM_TYPE[checklistItem]
    if (!expected || expected !== kind) return fail('That photo does not match this checklist item', 'BAD_ITEM', 400)
  }

  const supabase = createServiceClient()
  const folder = path.slice(0, path.lastIndexOf('/'))
  const name = path.slice(path.lastIndexOf('/') + 1)
  const { data: found } = await supabase.storage.from(bucketFor(kind)).list(folder, { search: name })
  if (!found?.some((f) => f.name === name)) return fail('Upload not found — try again', 'NOT_UPLOADED', 400)

  const before = await currentState(job)
  // Marketing consent follows the customer's account-wide opt-in (before/after only).
  const { data: customer } = await supabase.from('profiles').select('marketing_photo_consent').eq('id', job.customer_id).maybeSingle()
  const consent = (kind === 'before' || kind === 'after') && customer?.marketing_photo_consent === true
  const { data, error } = await supabase
    .from('job_photos')
    .insert({ job_id: jobId, photo_type: kind, storage_path: path, uploaded_by: sweeperId, checklist_item: checklistItem, customer_consent: consent })
    .select('id')
    .single()
  if (error) throw error

  // "Your shelter cleaning is underway! Before photos uploaded." — send once the before set is in.
  if (kind === 'before' && before.photoCounts.before + 1 === MIN_PHOTOS.before) {
    await bestEffort('job_started SMS', sendJobSms('job_started', jobId))
  }
  return { id: data.id }
}

export async function deleteMedia(sweeperId: string, jobId: string, mediaId: string): Promise<{ ok: true } | ActionError> {
  const job = await loadOwnJob(sweeperId, jobId)
  if (isErr(job)) return job
  if (job.status !== 'in_progress') return fail('This job is locked', 'BAD_STATUS')
  const supabase = createServiceClient()
  const { data: photo } = await supabase.from('job_photos').select('id, photo_type, storage_path').eq('id', mediaId).eq('job_id', jobId).maybeSingle()
  if (!photo || photo.photo_type === 'signature') return fail('Photo not found', 'NOT_FOUND', 404)
  await supabase.from('job_photos').delete().eq('id', mediaId)
  await supabase.storage.from(bucketFor(photo.photo_type as MediaKind)).remove([photo.storage_path])
  return { ok: true }
}

// ---- Hazards ----------------------------------------------------------------

export async function reportIssue(
  sweeperId: string,
  jobId: string,
  input: { kind: JobIssueKind; note: string | null; photoPath: string | null }
): Promise<{ id: string } | ActionError> {
  const job = await loadOwnJob(sweeperId, jobId)
  if (isErr(job)) return job
  if (job.status !== 'in_progress' && job.status !== 'confirmed') return fail('This job is locked', 'BAD_STATUS')
  if (input.photoPath && !input.photoPath.startsWith(`jobs/${jobId}/issue/`)) return fail('Invalid photo', 'BAD_PATH', 400)

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('job_issues')
    .insert({ job_id: jobId, reported_by: sweeperId, kind: input.kind, note: input.note, photo_path: input.photoPath })
    .select('id')
    .single()
  if (error) throw error

  const { data: me } = await supabase.from('profiles').select('full_name').eq('id', sweeperId).maybeSingle()
  const label = ISSUE_KINDS.find((k) => k.value === input.kind)?.label ?? input.kind
  await bestEffort(
    'admin issue SMS',
    sendAdminJobIssueSms({
      jobId,
      address: job.address,
      issue: input.note ? `${label} — ${input.note.slice(0, 80)}` : label,
      sweeperName: me?.full_name ?? 'A Sweeper',
    })
  )
  return { id: data.id }
}

/** Admin decision on a reported problem. end_visit cancels the job (refunds handled manually). */
export async function resolveIssue(
  adminId: string,
  jobId: string,
  issueId: string,
  decision: 'continue' | 'end_visit',
  note: string | null
): Promise<{ ok: true } | ActionError> {
  const supabase = createServiceClient()
  const { data: updated, error } = await supabase
    .from('job_issues')
    .update({ status: decision, resolution_note: note, resolved_by: adminId, resolved_at: new Date().toISOString() })
    .eq('id', issueId)
    .eq('job_id', jobId)
    .eq('status', 'open')
    .select('id')
  if (error) throw error
  if (!updated?.length) return fail('This problem was already resolved', 'ALREADY_RESOLVED')

  if (decision === 'end_visit') {
    const { error: jobErr } = await supabase
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId)
      .in('status', ['confirmed', 'in_progress'])
    if (jobErr) throw jobErr
  }
  return { ok: true }
}

// ---- On-site upgrades -------------------------------------------------------

export async function sellUpgrade(
  sweeperId: string,
  jobId: string,
  addonId: SellableUpgradeId,
  initials: string
): Promise<{ id: string; price: number } | ActionError> {
  const job = await loadOwnJob(sweeperId, jobId)
  if (isErr(job)) return job
  if (job.status !== 'in_progress') return fail('Start the job first', 'BAD_STATUS')
  const name = upgradeName(addonId)
  const alreadyHas =
    job.service_type.some((s) => s.startsWith(name)) ||
    (addonId === 'led_package' && job.service_type.some((s) => s.startsWith('Full Package')))
  if (alreadyHas) return fail(`${name} is already on this job`, 'DUPLICATE')

  const supabase = createServiceClient()
  const { data: customer } = await supabase.from('profiles').select('membership_status').eq('id', job.customer_id).maybeSingle()
  const quote = upgradeQuote(addonId, job.shelter_size, customer?.membership_status === 'active')
  if (!quote) return fail('X-Large shelters need a quote — report it to the office instead', 'QUOTE_REQUIRED')

  const { data: row, error } = await supabase
    .from('job_upgrades')
    .insert({
      job_id: jobId,
      addon_id: addonId,
      name,
      list_price: quote.listPrice,
      discount: quote.discount,
      price: quote.price,
      sold_by: sweeperId,
      customer_initials: initials,
    })
    .select('id')
    .single()
  if (error) throw error

  // Customer pays the (discounted) price on the balance; Sweeper % uses list value.
  const { error: jobErr } = await supabase
    .from('jobs')
    .update({
      service_type: [...job.service_type, name],
      total_amount: job.total_amount + quote.price,
      service_value: (job.service_value ?? job.total_amount) + quote.listPrice,
    })
    .eq('id', jobId)
  if (jobErr) {
    await supabase.from('job_upgrades').delete().eq('id', row.id)
    throw jobErr
  }
  return { id: row.id, price: quote.price }
}

export async function removeUpgrade(sweeperId: string, jobId: string, upgradeId: string): Promise<{ ok: true } | ActionError> {
  const job = await loadOwnJob(sweeperId, jobId)
  if (isErr(job)) return job
  if (job.status !== 'in_progress') return fail('This job is locked', 'BAD_STATUS')
  const supabase = createServiceClient()
  const { data: up } = await supabase.from('job_upgrades').select('*').eq('id', upgradeId).eq('job_id', jobId).maybeSingle()
  if (!up) return fail('Upgrade not found', 'NOT_FOUND', 404)

  const idx = job.service_type.lastIndexOf(up.name)
  const services = idx >= 0 ? [...job.service_type.slice(0, idx), ...job.service_type.slice(idx + 1)] : job.service_type
  const { error } = await supabase
    .from('jobs')
    .update({
      service_type: services,
      total_amount: job.total_amount - up.price,
      service_value: (job.service_value ?? job.total_amount) - up.list_price,
    })
    .eq('id', jobId)
  if (error) throw error
  await supabase.from('job_upgrades').delete().eq('id', upgradeId)
  return { ok: true }
}

// ---- Signature + completion -------------------------------------------------

export async function recordSignature(
  sweeperId: string,
  jobId: string,
  name: string,
  path: string
): Promise<{ ok: true } | ActionError> {
  const reg = await registerMedia(sweeperId, jobId, 'signature', path, null)
  if (isErr(reg)) return reg
  const { error } = await createServiceClient()
    .from('jobs')
    .update({ customer_signed_at: new Date().toISOString(), customer_signature_name: name })
    .eq('id', jobId)
  if (error) throw error
  return { ok: true }
}

export async function completeJob(sweeperId: string, jobId: string): Promise<{ completedAt: string } | ActionError> {
  const job = await loadOwnJob(sweeperId, jobId)
  if (isErr(job)) return job
  const blockers = completionBlockers(await currentState(job))
  if (blockers.length > 0) return { error: `Not ready: ${blockers.join(' · ')}`, code: 'NOT_READY', status: 409 }

  const completedAt = new Date().toISOString()
  const progress = { ...(await currentState(job)).progress, [AUTO_ITEMS.complete]: completedAt }
  const { data: done, error } = await createServiceClient()
    .from('jobs')
    .update({ status: 'complete', completed_at: completedAt, checklist_progress: progress })
    .eq('id', jobId)
    .eq('status', 'in_progress')
    .select('id')
  if (error) throw error
  if (!done?.length) return fail('This job is no longer in progress', 'BAD_STATUS')

  await bestEffort('job_complete SMS', sendJobSms('job_complete', jobId))
  // Friend's first visit done -> the inviter earns their referral credit (once).
  await bestEffort('referral reward', rewardReferrer(jobId))
  return { completedAt }
}

export async function setRecommendation(
  sweeperId: string,
  jobId: string,
  key: RecommendationKey,
  on: boolean,
  note: string | null
): Promise<{ ok: true } | ActionError> {
  const job = await loadOwnJob(sweeperId, jobId)
  if (isErr(job)) return job
  if (job.status !== 'in_progress') return fail('Start the job first', 'BAD_STATUS')
  const flags = parseRecommendations(job.upgrade_flags)
  if (on) flags[key] = { note, at: new Date().toISOString() }
  else delete flags[key]
  const { error } = await createServiceClient().from('jobs').update({ upgrade_flags: flags }).eq('id', jobId)
  if (error) throw error
  return { ok: true }
}
