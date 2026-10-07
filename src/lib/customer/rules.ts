import type { Job } from '@/types/database'

/**
 * Customer portal rules — pure, safe on server and client.
 * Customers can reschedule or cancel online until CHANGE_CUTOFF_HOURS before
 * the visit; inside that they contact the office.
 */
export const CHANGE_CUTOFF_HOURS = 48

export function canCustomerChange(job: Pick<Job, 'status' | 'scheduled_at'>, now: Date = new Date()): boolean {
  if (job.status !== 'pending' && job.status !== 'confirmed') return false
  if (!job.scheduled_at) return true
  return new Date(job.scheduled_at).getTime() - now.getTime() >= CHANGE_CUTOFF_HOURS * 3_600_000
}

export type VisitStep = { key: string; label: string; done: boolean }

/** Progress tracker shown on the dashboard / report. */
export function visitSteps(
  job: Pick<Job, 'status' | 'sweeper_id' | 'en_route_at' | 'arrived_at' | 'completed_at'>
): VisitStep[] {
  const confirmed = job.status !== 'pending'
  return [
    { key: 'booked', label: 'Booked', done: true },
    { key: 'confirmed', label: 'Confirmed', done: confirmed },
    { key: 'assigned', label: 'Sweeper assigned', done: Boolean(job.sweeper_id) },
    { key: 'on_way', label: 'On the way', done: Boolean(job.en_route_at) },
    { key: 'cleaning', label: 'Cleaning', done: Boolean(job.arrived_at) },
    { key: 'complete', label: 'Complete', done: job.status === 'complete' },
  ]
}

export const CUSTOMER_STATUS_LABEL: Record<Job['status'], string> = {
  pending: 'Booked — being reviewed',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  complete: 'Complete',
  cancelled: 'Cancelled',
}

/** Photo types a customer sees in their report / gallery. */
export const CUSTOMER_PHOTO_TYPES = ['before', 'after', 'inspection', 'video_before', 'video_after'] as const
