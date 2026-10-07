import { z } from 'zod'

import { SERVICE_ADDRESS_PATTERN } from '@/lib/booking/address'
import { serviceSelectionSchema } from '@/lib/booking/schemas'
import { TIME_WINDOW_VALUES } from '@/lib/booking/timeWindows'
import { PREP_KIT_BUNDLES, PREP_KIT_ITEMS, type PrepKitBundleId, type PrepKitItemId } from '@/lib/utils'
import type { ShelterSize } from '@/types/database'

// All amounts are integer cents. Item prices may be negative (kit credits);
// items are an order summary — payment providers only see the deposit.
export const bookingItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().int(),
  quantity: z.number().int().positive().default(1),
})

const isBundleId = (v: unknown): v is PrepKitBundleId => PREP_KIT_BUNDLES.some((b) => b.id === v)
const isItemId = (v: unknown): v is PrepKitItemId => PREP_KIT_ITEMS.some((i) => i.id === v)

export const bookingSelectionSchema = z.object({
  service: serviceSelectionSchema,
  kit: z
    .object({
      selectedBundle: z.custom<PrepKitBundleId>(isBundleId).nullable(),
      aLaCarteItems: z.array(z.custom<PrepKitItemId>(isItemId)).max(20),
    })
    .nullable(),
  /** Friend's invite code (?invite=) — verified server-side. */
  inviteCode: z.string().trim().max(24).optional(),
  /** Spend the signed-in customer's referral credit. */
  useCredit: z.boolean().optional(),
})
export type BookingSelection = z.infer<typeof bookingSelectionSchema>

export const bookingPayloadSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10),
  /** "Street, City, ST 12345" — built from the required street/city/state/ZIP fields. */
  address: z.string().trim().max(250).regex(SERVICE_ADDRESS_PATTERN, 'Address must include street, city, state and ZIP'),
  scheduledAt: z.string().nullable().optional(),
  /** Customer's arrival window; scheduledAt is the window's start. */
  timeWindow: z.enum(TIME_WINDOW_VALUES).optional(),
  shelterSize: z.enum(['small', 'standard', 'large', 'xlarge']),
  serviceTypes: z.array(z.string()).min(1),
  notes: z.string().max(2000).optional(),
  referralSource: z.string().optional(),
  /** What the customer pays for this visit. Excludes the membership; can be 0 for a member clean. */
  totalAmount: z.number().int().nonnegative(),
  /** List value of the services delivered, before membership coverage — basis for sweeper pay. */
  serviceValue: z.number().int().nonnegative().optional(),
  /** Clean is covered by Storm Ready (counts toward visits_used). */
  membershipVisit: z.boolean().default(false),
  membershipPlan: z.enum(['none', 'annual', 'monthly']).default('none'),
  photoGrade: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
  photoFlags: z.array(z.string()).optional(),
  /** What the customer chose. The server re-prices from this and ignores client amounts. */
  selection: bookingSelectionSchema.optional(),
  // Set by the server (repriceBooking) only — never trusted from the browser.
  referredBy: z.string().uuid().optional(),
  referralDiscount: z.number().int().nonnegative().optional(),
  creditApplied: z.number().int().nonnegative().optional(),
})

export type BookingPayload = z.infer<typeof bookingPayloadSchema>
export type BookingItem = z.infer<typeof bookingItemSchema>

export type BookingPaymentData = BookingPayload & {
  items: BookingItem[]
  depositAmount: number
}

// Stripe metadata: max 50 keys, 500 characters per value. The booking JSON
// (name, address, notes, photo paths…) easily exceeds 500, so it is split
// across booking_data_0..N with the count in booking_data_parts.
const METADATA_CHUNK_SIZE = 490
// Leave headroom under Stripe's 50-key limit for customer_name, membership_plan, etc.
const METADATA_MAX_CHUNKS = 40

/** Reassembles the booking JSON from metadata. Returns null if absent/invalid JSON. */
export function readBookingMetadataJson(metadata: Record<string, string>): unknown {
  let raw: string | undefined
  const parts = Number(metadata.booking_data_parts)

  if (Number.isInteger(parts) && parts > 0) {
    const chunks: string[] = []
    for (let i = 0; i < parts; i++) {
      const chunk = metadata[`booking_data_${i}`]
      if (chunk === undefined) return null
      chunks.push(chunk)
    }
    raw = chunks.join('')
  } else {
    raw = metadata.booking_data // legacy single-key format
  }

  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export function parseBookingMetadata(
  metadata: Record<string, string>
): BookingPayload | null {
  const result = bookingPayloadSchema.safeParse(readBookingMetadataJson(metadata))
  return result.success ? result.data : null
}

export function serializeBookingMetadata(
  payload: BookingPayload
): Record<string, string> {
  // Split by code point so a chunk never ends mid-emoji/surrogate pair.
  const codePoints = Array.from(JSON.stringify(payload))
  const chunkCount = Math.max(1, Math.ceil(codePoints.length / METADATA_CHUNK_SIZE))

  if (chunkCount > METADATA_MAX_CHUNKS) {
    throw new Error('Booking details are too long — please shorten your notes')
  }

  const metadata: Record<string, string> = { booking_data_parts: String(chunkCount) }
  for (let i = 0; i < chunkCount; i++) {
    metadata[`booking_data_${i}`] = codePoints
      .slice(i * METADATA_CHUNK_SIZE, (i + 1) * METADATA_CHUNK_SIZE)
      .join('')
  }
  return metadata
}

export function shelterSizeLabel(size: ShelterSize): string {
  const labels: Record<ShelterSize, string> = {
    small: 'Small shelter',
    standard: 'Standard shelter',
    large: 'Large shelter',
    xlarge: 'Extra-large shelter',
  }
  return labels[size]
}
