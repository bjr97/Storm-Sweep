import { getHardwareAddon, hardwareAddonPrice, HARDWARE_ADDON_IDS, type HardwareAddonId } from '@/lib/booking/addons'
import { CHECKLIST_ITEMS, PRICING, roundCents, type ChecklistItem } from '@/lib/utils'
import type { JobIssueKind, PhotoType, ShelterSize } from '@/types/database'

/**
 * Sweeper job-run rules (Phase 2.2) — pure, safe on server and client.
 * Completion requires (CLAUDE.md rule 1): status in_progress, every required
 * checklist item done, ≥2 before + ≥2 after photos, customer signature,
 * and no open hazard report.
 */

export const MIN_PHOTOS = { before: 2, after: 2 } as const
/** Arrival counts as on site within this distance of the geocoded address. */
export const ARRIVAL_RADIUS_M = 300
export const MAX_VIDEO_SECONDS = 60
/** Supabase's default per-file upload limit. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024

export const PHASE_LABEL: Record<number, string> = { 1: 'Arrive', 2: 'Clean', 3: 'Inspect & install', 4: 'Wrap up' }

/** Checklist items satisfied by uploading a photo, and the photo type they create. */
export const PHOTO_ITEM_TYPE: Record<string, Extract<PhotoType, 'before' | 'after' | 'inspection'>> = {
  arrive_02: 'before',
  arrive_03: 'before',
  inspect_06: 'inspection',
  wrap_01: 'after',
  wrap_02: 'after',
}

/** Checked by the app, not by hand. */
export const AUTO_ITEMS = {
  enRoute: 'arrive_01',
  signature: 'wrap_06',
  complete: 'wrap_07',
} as const

export const ISSUE_KINDS: readonly { value: JobIssueKind; label: string }[] = [
  { value: 'standing_water', label: 'Standing water' },
  { value: 'structural', label: 'Structural damage' },
  { value: 'mold', label: 'Heavy mold' },
  { value: 'pests', label: 'Pests / animals' },
  { value: 'access', label: "Can't access shelter" },
  { value: 'other', label: 'Something else' },
]

// ---- Sellable upgrades ------------------------------------------------------

export const SELLABLE_UPGRADE_IDS = ['led_package', ...HARDWARE_ADDON_IDS] as const
export type SellableUpgradeId = (typeof SELLABLE_UPGRADE_IDS)[number]

export function upgradeName(id: SellableUpgradeId): string {
  return id === 'led_package' ? 'LED Package' : getHardwareAddon(id as HardwareAddonId).name
}

/** Price for an on-site sale; null when it needs a quote (X-Large carpet). Members get 10% off. */
export function upgradeQuote(
  id: SellableUpgradeId,
  size: ShelterSize,
  isMember: boolean
): { listPrice: number; discount: number; price: number } | null {
  const listPrice = id === 'led_package' ? PRICING.addons.led_package : hardwareAddonPrice(id, size)
  if (listPrice === null) return null
  const discount = isMember ? -roundCents(listPrice * PRICING.member_upgrade_discount_pct) : 0
  return { listPrice, discount, price: listPrice + discount }
}

// ---- Checklist --------------------------------------------------------------

/** Install / delivery tasks for whatever was booked or sold, matched by job.service_type names. */
export function addonTasks(serviceTypes: readonly string[]): ChecklistItem[] {
  const has = (re: RegExp): boolean => serviceTypes.some((s) => re.test(s))
  const tasks: ChecklistItem[] = []
  if (has(/^(LED Package|Full Package)/)) tasks.push({ id: 'install_led', phase: 3, label: 'Install LED lighting — test it with the customer', required: true })
  if (has(/^Interior Handle/)) tasks.push({ id: 'install_handle', phase: 3, label: 'Install interior handle — test from inside', required: true })
  if (has(/^Hinge \/ Roller/)) tasks.push({ id: 'install_hinge', phase: 3, label: 'Service hinges or door rollers/track — open/close fully', required: true })
  if (has(/^Shelter Carpet/)) tasks.push({ id: 'install_carpet', phase: 3, label: 'Cut carpet to fit and secure the backing', required: true })
  if (has(/^(Prep Kit|Full Package)/)) tasks.push({ id: 'deliver_kit', phase: 3, label: 'Place prep kit in shelter — show customer', required: true })
  return tasks
}

export function buildChecklist(serviceTypes: readonly string[]): ChecklistItem[] {
  const extra = addonTasks(serviceTypes)
  const lastInspect = CHECKLIST_ITEMS.map((i) => i.phase).lastIndexOf(3)
  return [...CHECKLIST_ITEMS.slice(0, lastInspect + 1), ...extra, ...CHECKLIST_ITEMS.slice(lastInspect + 1)]
}

export type RunState = {
  status: string
  serviceTypes: readonly string[]
  progress: Record<string, string>
  enRouteAt: string | null
  signedAt: string | null
  photoItems: ReadonlySet<string>
  photoCounts: { before: number; after: number }
  openIssues: number
}

export function isItemDone(item: ChecklistItem, s: RunState): boolean {
  if (item.id === AUTO_ITEMS.enRoute) return Boolean(s.enRouteAt)
  if (item.id === AUTO_ITEMS.signature) return Boolean(s.signedAt)
  if (item.id === AUTO_ITEMS.complete) return s.status === 'complete'
  if (PHOTO_ITEM_TYPE[item.id]) return s.photoItems.has(item.id)
  return Boolean(s.progress[item.id])
}

/** Items a Sweeper ticks by hand (not photo/auto items). */
export function isManualItem(id: string): boolean {
  return !PHOTO_ITEM_TYPE[id] && !Object.values(AUTO_ITEMS).includes(id as never)
}

export function completionBlockers(s: RunState): string[] {
  const blockers: string[] = []
  if (s.status !== 'in_progress') blockers.push('Tap “Arrived — start job” first')
  if (s.openIssues > 0) blockers.push('Waiting on the office about a reported problem')
  if (s.photoCounts.before < MIN_PHOTOS.before) blockers.push(`Before photos ${s.photoCounts.before}/${MIN_PHOTOS.before}`)
  if (s.photoCounts.after < MIN_PHOTOS.after) blockers.push(`After photos ${s.photoCounts.after}/${MIN_PHOTOS.after}`)
  if (!s.signedAt) blockers.push('Customer signature')
  const missing = buildChecklist(s.serviceTypes).filter(
    (i) => i.required && i.id !== AUTO_ITEMS.complete && i.id !== AUTO_ITEMS.signature && !isItemDone(i, s)
  )
  if (missing.length > 0) blockers.push(`${missing.length} required checklist item${missing.length === 1 ? '' : 's'}`)
  return blockers
}

// ---- Geo --------------------------------------------------------------------

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000
  const rad = (d: number): number => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

export const MEDIA_KINDS = ['before', 'after', 'inspection', 'issue', 'upgrade', 'signature', 'video_before', 'video_after'] as const
export type MediaKind = (typeof MEDIA_KINDS)[number]
