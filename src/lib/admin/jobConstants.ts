import type { JobStatus } from '@/types/database'

// Shared by server queries and client components — keep free of server imports.

export const JOB_STATUS_FILTERS = ['all', 'pending', 'confirmed', 'in_progress', 'complete', 'cancelled'] as const
export type JobStatusFilter = (typeof JOB_STATUS_FILTERS)[number]

export const JOB_WHEN_FILTERS = ['upcoming', 'past', 'all'] as const
export type JobWhenFilter = (typeof JOB_WHEN_FILTERS)[number]

export const JOB_LIST_LIMIT = 100

/** Statuses an admin may set by hand. in_progress/complete are Sweeper actions
 * (completion requires photos, checklist and customer signature). */
export const ADMIN_SETTABLE_STATUSES = ['pending', 'confirmed', 'cancelled'] as const satisfies readonly JobStatus[]
