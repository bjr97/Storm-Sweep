import { addDays, startOfDay } from 'date-fns'
import { z } from 'zod'

import type { ShelterSize } from '@/types/database'

const nameFieldSchema = z
  .string()
  .trim()
  .min(1, 'This field is required')
  .max(50, 'Must be 50 characters or less')

export function splitFullName(fullName: string): {
  first_name: string
  last_name: string
} {
  const trimmed = fullName.trim()
  if (!trimmed) {
    return { first_name: '', last_name: '' }
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: '' }
  }

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' '),
  }
}

export function formatCustomerFullName(values: {
  first_name: string
  last_name: string
}): string {
  return `${values.first_name.trim()} ${values.last_name.trim()}`.trim()
}

export const shelterSizeSchema = z.enum([
  'small',
  'standard',
  'large',
  'xlarge',
])

export const supplyKitTierSchema = z.enum([
  'none',
  'starter',
  'essential',
  'family',
  'pro',
  'elite',
])

export const membershipTypeSchema = z.enum(['one_time', 'annual', 'monthly'])

export const serviceSelectionSchema = z.object({
  shelter_size: shelterSizeSchema,
  deep_clean: z.boolean(),
  led_package: z.boolean(),
  supply_kit: supplyKitTierSchema,
  full_package: z.boolean(),
  membership: membershipTypeSchema,
})

export type ServiceSelectionValues = z.infer<typeof serviceSelectionSchema>

export const customerDetailsSchema = z.object({
  first_name: nameFieldSchema,
  last_name: nameFieldSchema,
  email: z.string().trim().email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .min(10, 'Enter a valid phone number')
    .regex(/^[\d\s()+-]+$/, 'Enter a valid phone number'),
  address: z.string().trim().min(5, 'Enter your service address'),
  preferred_date: z
    .string()
    .min(1, 'Select a preferred date')
    .refine((value) => {
      const selected = startOfDay(new Date(`${value}T12:00:00`))
      const minimum = startOfDay(addDays(new Date(), 1))
      return selected >= minimum
    }, 'Preferred date must be at least 1 day from today'),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  referral_source: z.string().min(1, 'Select how you heard about us'),
})

export type CustomerDetailsValues = z.infer<typeof customerDetailsSchema>

export const REFERRAL_SOURCES = [
  { value: 'google', label: 'Google Search' },
  { value: 'social', label: 'Facebook / Instagram' },
  { value: 'nextdoor', label: 'Nextdoor' },
  { value: 'friend', label: 'Friend or Neighbor' },
  { value: 'realtor', label: 'Realtor Referral' },
  { value: 'roofing', label: 'Roofing Company' },
  { value: 'lawn', label: 'Lawn Service' },
  { value: 'yard_sign', label: 'Yard Sign' },
  { value: 'partner', label: 'Partner Referral' },
  { value: 'other', label: 'Other' },
] as const

export const SHELTER_SIZE_OPTIONS: {
  value: ShelterSize
  label: string
  description: string
}[] = [
  {
    value: 'small',
    label: 'Small',
    description: 'Up to 4×6 ft · 1–4 people',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'Up to 6×8 ft · 4–8 people',
  },
  {
    value: 'large',
    label: 'Large',
    description: 'Up to 8×10 ft · 8–12 people',
  },
  {
    value: 'xlarge',
    label: 'X-Large',
    description: 'Custom size · quote required',
  },
]

export const BOOKING_STEPS = [
  { id: 1, label: 'Service' },
  { id: 2, label: 'Prep Kit' },
  { id: 3, label: 'Details' },
  { id: 4, label: 'Photo' },
  { id: 5, label: 'Payment' },
  { id: 6, label: 'Confirm' },
] as const
