import { addDays, startOfDay } from 'date-fns'

import { windowStartIso } from '@/lib/booking/timeWindows'
import { canCustomerChange, CHANGE_CUTOFF_HOURS } from '@/lib/customer/rules'
import { createServiceClient } from '@/lib/supabase/server'
import type { TimeWindow } from '@/types/database'

/** Customer self-service actions. Callers pass the verified customer id. */

export type CustomerActionError = { error: string; code: string; status: number }
const fail = (error: string, code: string, status = 409): CustomerActionError => ({ error, code, status })

async function ownJob(customerId: string, jobId: string) {
  const { data, error } = await createServiceClient().from('jobs').select('*').eq('id', jobId).eq('customer_id', customerId).maybeSingle()
  if (error) throw error
  return data
}

const tooLate = (): CustomerActionError =>
  fail(`Changes within ${CHANGE_CUTOFF_HOURS} hours of your visit need a quick call or text to the office`, 'TOO_LATE')

export async function rescheduleVisit(
  customerId: string,
  jobId: string,
  date: string,
  window: TimeWindow,
  now: Date = new Date()
): Promise<{ scheduledAt: string } | CustomerActionError> {
  const job = await ownJob(customerId, jobId)
  if (!job) return fail('Visit not found', 'NOT_FOUND', 404)
  if (!canCustomerChange(job, now)) return tooLate()
  const picked = startOfDay(new Date(`${date}T12:00:00`))
  if (picked < startOfDay(addDays(now, 1))) return fail('Pick a date at least 1 day from today', 'BAD_DATE', 400)

  const scheduledAt = windowStartIso(date, window)
  // The assigned Sweeper (if any) keeps the job; their board shows the new date
  // and lets them drop it without penalty if they can't make it.
  const { error } = await createServiceClient()
    .from('jobs')
    .update({ scheduled_at: scheduledAt, time_window: window, rescheduled_at: now.toISOString() })
    .eq('id', jobId)
    .in('status', ['pending', 'confirmed'])
  if (error) throw error
  return { scheduledAt }
}

export async function cancelVisit(customerId: string, jobId: string, now: Date = new Date()): Promise<{ refundDue: boolean } | CustomerActionError> {
  const job = await ownJob(customerId, jobId)
  if (!job) return fail('Visit not found', 'NOT_FOUND', 404)
  if (!canCustomerChange(job, now)) return tooLate()
  const refundDue = job.payment_status === 'deposit_paid' || job.payment_status === 'paid'

  const supabase = createServiceClient()
  const { data: updated, error } = await supabase
    .from('jobs')
    .update({ status: 'cancelled', cancelled_at: now.toISOString(), cancelled_by: 'customer', refund_due: refundDue })
    .eq('id', jobId)
    .in('status', ['pending', 'confirmed'])
    .select('id')
  if (error) throw error
  if (!updated?.length) return tooLate()

  // A cancelled Storm Ready visit gives the included visit back.
  if (job.membership_visit) {
    const { data: profile } = await supabase.from('profiles').select('visits_used').eq('id', customerId).maybeSingle()
    if (profile && profile.visits_used > 0) {
      await supabase.from('profiles').update({ visits_used: profile.visits_used - 1 }).eq('id', customerId)
    }
  }
  return { refundDue }
}

export async function submitReview(
  customerId: string,
  jobId: string,
  rating: number,
  body: string | null
): Promise<{ askGoogle: boolean } | CustomerActionError> {
  const job = await ownJob(customerId, jobId)
  if (!job) return fail('Visit not found', 'NOT_FOUND', 404)
  if (job.status !== 'complete') return fail('You can review a visit once it’s complete', 'NOT_COMPLETE')
  const { error } = await createServiceClient()
    .from('reviews')
    .insert({ job_id: jobId, customer_id: customerId, rating, body })
  if (error) {
    if (error.code === '23505') return fail('You already reviewed this visit — thank you!', 'ALREADY_REVIEWED')
    throw error
  }
  return { askGoogle: rating >= 4 }
}

export async function updateCustomerProfile(
  customerId: string,
  input: { full_name?: string; phone?: string; address?: string; marketing_photo_consent?: boolean }
): Promise<{ ok: true }> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('profiles').update(input).eq('id', customerId).eq('role', 'customer')
  if (error) throw error

  // Mirror the account-wide consent onto every before/after photo of theirs —
  // job_photos.customer_consent is the flag any publishing must check.
  if (input.marketing_photo_consent !== undefined) {
    const { data: jobs } = await supabase.from('jobs').select('id').eq('customer_id', customerId)
    const ids = (jobs ?? []).map((j) => j.id)
    if (ids.length > 0) {
      const { error: pErr } = await supabase
        .from('job_photos')
        .update({ customer_consent: input.marketing_photo_consent })
        .in('job_id', ids)
        .in('photo_type', ['before', 'after'])
      if (pErr) throw pErr
    }
  }
  return { ok: true }
}
