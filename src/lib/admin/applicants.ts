import { createClient, createServiceClient } from '@/lib/supabase/server'
import { TOOL_PHOTO_REQUIREMENTS, type ToolPhotoKey } from '@/lib/sweepers/constants'
import { countUploadedTools, parseToolPhotos } from '@/lib/sweepers/utils'
import type { SweeperApplicant } from '@/types/database'

/**
 * Sweeper applicant queries for /admin/sweepers. Runs as the signed-in admin
 * (sweeper_applicants is admin-only under RLS); the service client is used only
 * to sign storage URLs for tool photos.
 */

export const APPLICANT_STATUS_FILTERS = ['pending', 'approved', 'rejected', 'all'] as const
export type ApplicantStatusFilter = (typeof APPLICANT_STATUS_FILTERS)[number]

export type ApplicantListItem = Pick<
  SweeperApplicant,
  'id' | 'full_name' | 'email' | 'phone' | 'availability' | 'has_vehicle' | 'status' | 'applied_at' | 'agreement_signed' | 'all_tools_verified'
> & { toolsUploaded: number; toolsRequired: number; readyToApprove: boolean }

export async function listApplicants(status: ApplicantStatusFilter): Promise<{
  applicants: ApplicantListItem[]
  counts: Record<ApplicantStatusFilter, number>
}> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sweeper_applicants')
    .select('id, full_name, email, phone, availability, has_vehicle, status, applied_at, agreement_signed, all_tools_verified, tool_photos')
    .order('applied_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[admin/applicants] list', error)
    throw new Error('Failed to load applicants')
  }

  const all: ApplicantListItem[] = data.map(({ tool_photos, ...a }) => ({
    ...a,
    toolsUploaded: countUploadedTools(parseToolPhotos(tool_photos)),
    toolsRequired: TOOL_PHOTO_REQUIREMENTS.length,
    readyToApprove: a.status === 'pending' && a.all_tools_verified && a.agreement_signed,
  }))

  const counts = {
    pending: all.filter((a) => a.status === 'pending').length,
    approved: all.filter((a) => a.status === 'approved').length,
    rejected: all.filter((a) => a.status === 'rejected').length,
    all: all.length,
  }

  return { applicants: status === 'all' ? all : all.filter((a) => a.status === status), counts }
}

export type ToolPhotoView = { key: ToolPhotoKey; label: string; hint: string; url: string | null; uploaded: boolean }

export type ApplicantDetail = {
  applicant: SweeperApplicant
  tools: ToolPhotoView[]
  readyToApprove: boolean
  blockers: string[]
  /** Signed (1 hour) link to the signed agreement PDF, if any. */
  agreementUrl: string | null
}

export async function getApplicant(id: string): Promise<ApplicantDetail | null> {
  const supabase = createClient()
  const { data: applicant, error } = await supabase
    .from('sweeper_applicants')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.error('[admin/applicants] get', error)
    throw new Error('Failed to load applicant')
  }
  if (!applicant) return null

  const photos = parseToolPhotos(applicant.tool_photos)
  const paths = TOOL_PHOTO_REQUIREMENTS.map((t) => photos[t.key]).filter((p): p is string => Boolean(p))
  const signed = new Map<string, string>()
  if (paths.length > 0) {
    const { data: urls } = await createServiceClient().storage.from('applicant-tools').createSignedUrls(paths, 3600)
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl)
  }

  const tools: ToolPhotoView[] = TOOL_PHOTO_REQUIREMENTS.map((t) => ({
    ...t,
    uploaded: Boolean(photos[t.key]),
    url: photos[t.key] ? signed.get(photos[t.key]) ?? null : null,
  }))

  const blockers: string[] = []
  if (applicant.status !== 'pending') blockers.push(`Already ${applicant.status}`)
  if (!applicant.all_tools_verified) {
    blockers.push(`Tool photos incomplete (${tools.filter((t) => t.uploaded).length}/${tools.length})`)
  }
  if (!applicant.agreement_signed) blockers.push('IC agreement not signed yet')

  let agreementUrl: string | null = null
  const agreementPath = applicant.agreement_pdf_path
  if (agreementPath) {
    if (/^https?:\/\//.test(agreementPath)) {
      agreementUrl = agreementPath // legacy DocuSeal document URL
    } else {
      const { data } = await createServiceClient().storage.from('agreements').createSignedUrl(agreementPath, 3600)
      agreementUrl = data?.signedUrl ?? null
    }
  }

  return { applicant, tools, readyToApprove: blockers.length === 0, blockers, agreementUrl }
}
