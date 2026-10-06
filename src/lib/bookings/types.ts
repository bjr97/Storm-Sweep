import { z } from 'zod'

import type { ShelterSize } from '@/types/database'

// All amounts are integer cents. Item prices may be negative (kit credits);
// items are an order summary — payment providers only see the deposit.
export const bookingItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().int(),
  quantity: z.number().int().positive().default(1),
})

export const bookingPayloadSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10),
  address: z.string().min(1),
  scheduledAt: z.string().nullable().optional(),
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
