import { z } from 'zod'

import { ADMIN_SETTABLE_STATUSES } from '@/lib/admin/jobConstants'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'
import { notifyCancelled } from '@/lib/notify'
import { formatJobDate, renderSmsTemplate, sendSms } from '@/lib/twilio'
import type { JobClaimEventInsert, JobUpdate } from '@/types/database'

// Admin job updates. Sweeper updates (checklist, en route, start, complete)
// will live here too once the Sweeper app (Phase 2.1–2.2) is built.
const patchSchema = z
  .object({
    sweeperId: z.string().uuid().nullable().optional(),
    status: z.enum(ADMIN_SETTABLE_STATUSES).optional(),
    approvePhoto: z.literal(true).optional(),
    /** Admin refunded a cancelled visit's deposit outside the app. */
    markRefunded: z.literal(true).optional(),
  })
  .refine((v) => v.sweeperId !== undefined || v.status !== undefined || v.approvePhoto !== undefined || v.markRefunded !== undefined, {
    message: 'Nothing to update',
  })

const paramsSchema = z.object({ id: z.string().uuid() })

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) {
      return Response.json({ error: 'Not authorized' }, { status: auth.status })
    }

    const parsedParams = paramsSchema.safeParse(params)
    const parsed = patchSchema.safeParse(await req.json())
    if (!parsedParams.success || !parsed.success) {
      return Response.json(
        { error: 'Invalid input', details: parsed.success ? undefined : parsed.error.flatten() },
        { status: 400 }
      )
    }
    const jobId = parsedParams.data.id
    const input = parsed.data

    const supabase = createClient()
    const { data: job, error: loadError } = await supabase
      .from('jobs')
      .select('id, status, sweeper_id, customer_id, address, scheduled_at, photo_approved, refund_due, payment_status')
      .eq('id', jobId)
      .maybeSingle()

    if (loadError) throw loadError
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 })

    if (job.status === 'complete' || job.status === 'in_progress') {
      return Response.json(
        { error: 'Jobs in progress or complete can only be changed by the Sweeper', code: 'JOB_LOCKED' },
        { status: 409 }
      )
    }

    const update: JobUpdate = {}

    if (input.markRefunded) {
      if (!job.refund_due) {
        return Response.json({ error: 'No refund is due on this job', code: 'NO_REFUND_DUE' }, { status: 409 })
      }
      update.refund_due = false
      update.payment_status = 'refunded'
    }

    if (input.approvePhoto) {
      update.photo_approved = true
      update.admin_reviewed_at = new Date().toISOString()
    }

    if (input.status) {
      const photoOk = job.photo_approved || input.approvePhoto === true
      if (input.status === 'confirmed' && !photoOk) {
        // Junk policy: flagged shelter photos (grade C/D/F) need admin review first.
        return Response.json(
          { error: 'Review and approve the shelter photo before confirming', code: 'PHOTO_REVIEW_REQUIRED' },
          { status: 409 }
        )
      }
      update.status = input.status
      if (input.status === 'cancelled' && job.status !== 'cancelled') {
        update.cancelled_at = new Date().toISOString()
        update.cancelled_by = 'admin'
        update.refund_due = job.payment_status === 'deposit_paid' || job.payment_status === 'paid'
      }
    }

    let sweeperProfile: { full_name: string | null; phone: string | null } | null = null
    if (input.sweeperId !== undefined) {
      if (input.sweeperId !== null) {
        const { data: sweeper } = await supabase
          .from('profiles')
          .select('role, full_name, phone')
          .eq('id', input.sweeperId)
          .maybeSingle()
        if (sweeper?.role !== 'sweeper') {
          return Response.json({ error: 'That person is not a Sweeper' }, { status: 400 })
        }
        sweeperProfile = sweeper
        if (input.sweeperId !== job.sweeper_id) {
          // Manual assignment: base pay rate (no claim-speed clock).
          update.assigned_via = 'admin'
          update.claimed_at = new Date().toISOString()
          update.claim_visible_at = null
          update.claimed_tier = null
        }
      }
      // Unassigning (null) puts a confirmed job back on the board — DB trigger.
      update.sweeper_id = input.sweeperId
    }

    const { data: updated, error: updateError } = await supabase
      .from('jobs')
      .update(update)
      .eq('id', jobId)
      .select()
      .single()
    if (updateError) throw updateError

    // Claim history (admin changes never count against a Sweeper's score).
    if (input.sweeperId !== undefined && input.sweeperId !== job.sweeper_id) {
      const events: JobClaimEventInsert[] = []
      if (job.sweeper_id) events.push({ job_id: jobId, sweeper_id: job.sweeper_id, event: 'admin_unassign' })
      if (input.sweeperId) events.push({ job_id: jobId, sweeper_id: input.sweeperId, event: 'admin_assign' })
      const { error: eventError } = await supabase.from('job_claim_events').insert(events)
      if (eventError) console.error('[jobs/patch] claim event', eventError)
    }

    // Text a newly assigned Sweeper. Best-effort: the assignment stands even if SMS fails.
    if (input.sweeperId && input.sweeperId !== job.sweeper_id && sweeperProfile?.phone) {
      try {
        const { data: customer } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', job.customer_id)
          .maybeSingle()
        await sendSms({
          to: sweeperProfile.phone,
          trigger: 'sweeper_job_assigned',
          profileId: input.sweeperId,
          jobId,
          body: renderSmsTemplate('sweeper_job_assigned', {
            name: sweeperProfile.full_name?.split(' ')[0] ?? 'there',
            customerName: customer?.full_name ?? 'a customer',
            address: job.address,
            date: formatJobDate(job.scheduled_at),
          }),
        })
      } catch (smsError) {
        console.error('[jobs/patch] sweeper_job_assigned SMS failed', smsError)
      }
    }

    if (input.status === 'cancelled' && job.status !== 'cancelled') {
      await notifyCancelled(jobId, 'admin')
    }

    return Response.json({ data: updated })
  } catch (error) {
    console.error('[jobs/patch]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
