import { z } from 'zod'

import { PRICING } from '@/lib/utils'

/**
 * Referral partners (roofers, realtors, lawn services…). Pure + client-safe.
 * A referral is earned when a job booked with the partner's ?ref=CODE is
 * COMPLETED. Amount owed = completed referrals × payout − already paid.
 */

export const PARTNER_TYPES = ['roofing', 'realtor', 'lawn', 'hoa', 'inspector', 'other'] as const
export type PartnerType = (typeof PARTNER_TYPES)[number]

export const PARTNER_TYPE_LABEL: Record<PartnerType, string> = {
  roofing: 'Roofing company',
  realtor: 'Realtor',
  lawn: 'Lawn service',
  hoa: 'HOA',
  inspector: 'Home inspector',
  other: 'Other',
}

/** Default payout per completed referral, in cents. */
export function defaultPayout(type: PartnerType): number {
  if (type === 'roofing') return PRICING.referral.partner_roofing
  if (type === 'realtor') return PRICING.referral.partner_realtor
  if (type === 'lawn') return PRICING.referral.partner_lawn
  return PRICING.referral.partner_roofing
}

export const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{3,16}$/

/** "Sooner Roofing Co" -> "SOONERROOF" + 2 digits. */
export function suggestReferralCode(name: string): string {
  const letters = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'PARTNER'
  return `${letters}${Math.floor(10 + Math.random() * 90)}`
}

export const partnerInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter the business name').max(100),
  type: z.enum(PARTNER_TYPES),
  referral_code: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(REFERRAL_CODE_PATTERN, 'Code: 3–16 letters or numbers')),
  contact_name: z.string().trim().max(100).nullable(),
  contact_phone: z.string().trim().max(20).nullable(),
  /** cents */
  payout_per_referral: z.number().int().min(0).max(100_000),
  notes: z.string().trim().max(1000).nullable(),
  active: z.boolean(),
})
export type PartnerInput = z.infer<typeof partnerInputSchema>
