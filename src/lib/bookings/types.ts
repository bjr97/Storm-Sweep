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
  notes: z.string().optional(),
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

export function parseBookingMetadata(
  metadata: Record<string, string>
): BookingPayload | null {
  const raw = metadata.booking_data
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    const result = bookingPayloadSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function serializeBookingMetadata(
  payload: BookingPayload
): Record<string, string> {
  return {
    booking_data: JSON.stringify(payload),
  }
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
