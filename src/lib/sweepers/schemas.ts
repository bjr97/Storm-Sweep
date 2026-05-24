import { z } from 'zod'

import { TOOL_PHOTO_KEYS } from '@/lib/sweepers/constants'

export const sweeperApplySchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  phone: z
    .string()
    .min(10, 'Enter a valid phone number')
    .regex(/^[\d\s()+-]+$/, 'Enter a valid phone number'),
  availability: z.enum(['weekdays', 'weekends', 'both']),
  has_vehicle: z.boolean(),
  experience_notes: z.string().max(2000).optional(),
  heard_about: z.string().min(1, 'Please tell us how you heard about us'),
})

export type SweeperApplyInput = z.infer<typeof sweeperApplySchema>

export const sweeperApplicantIdSchema = z.object({
  applicantId: z.string().uuid(),
})

export const sweeperToolUploadSchema = z.object({
  applicantId: z.string().uuid(),
  toolKey: z.enum(TOOL_PHOTO_KEYS),
})

export const sweeperApproveSchema = z.object({
  applicantId: z.string().uuid(),
})

export const sweeperRejectSchema = z.object({
  applicantId: z.string().uuid(),
  adminNotes: z.string().max(1000).optional(),
})
