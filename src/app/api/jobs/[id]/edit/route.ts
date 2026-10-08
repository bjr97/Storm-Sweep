import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { SERVICE_ADDRESS_PATTERN } from '@/lib/booking/address'
import { TIME_WINDOW_VALUES, windowStartIso } from '@/lib/booking/timeWindows'
import { notifyVisitUpdated } from '@/lib/notify'
import { createServiceClient } from '@/lib/supabase/server'
import { calculateDeposit } from '@/lib/utils'
import type { JobUpdate } from '@/types/database'

/**
 * Admin edits an upcoming visit: time, size, services, price (incl. pricing
 * an X-Large quote), address, notes. In-progress/complete/cancelled jobs are
 * locked. Price can't go below a deposit that was already paid.
 */
const bodySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    window: z.enum(TIME_WINDOW_VALUES).optional(),
    shelterSize: z.enum(['small', 'standard', 'large', 'xlarge']).optional(),
    serviceTypes: z.array(z.string().trim().min(1).max(80)).min(1).max(12).optional(),
    totalAmount: z.number().int().min(0).max(10_000_000).optional(),
    /** List value Sweeper pay is based on. Defaults to the new total. */
    serviceValue: z.number().int().min(0).max(10_000_000).optional(),
    address: z.string().trim().max(250).regex(SERVICE_ADDRESS_PATTERN, 'Address needs street, city, state and ZIP').optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    notify: z.boolean().default(true),
  })
  .refine((v) => (v.date === undefined) === (v.window === undefined), { message: 'Set both a date and a window' })

const paramsSchema = z.object({ id: z.string().uuid() })

export async function PATCH(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const p = paramsSchema.safeParse(params)
    const parsed = bodySchema.safeParse(await req.json())
    if (!p.success || !parsed.success) {
      return Response.json({ error: parsed.success ? 'Invalid job' : parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }
    const b = parsed.data
    const supabase = createServiceClient()
    const { data: job } = await supabase.from('jobs').select('*').eq('id', p.data.id).maybeSingle()
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 })
    if (job.status !== 'pending' && job.status !== 'confirmed') {
      return Response.json({ error: 'Only upcoming visits can be edited', code: 'JOB_LOCKED' }, { status: 409 })
    }

    const update: JobUpdate = {}
    let timeChanged = false
    let priceChanged = false

    if (b.date && b.window) {
      const scheduledAt = windowStartIso(b.date, b.window)
      if (scheduledAt !== job.scheduled_at || b.window !== job.time_window) {
        update.scheduled_at = scheduledAt
        update.time_window = b.window
        update.rescheduled_at = new Date().toISOString() // assigned Sweeper may drop free
        timeChanged = true
      }
    }
    if (b.shelterSize) update.shelter_size = b.shelterSize
    if (b.serviceTypes) update.service_type = b.serviceTypes
    if (b.address) update.address = b.address
    if (b.notes !== undefined) update.notes = b.notes || null

    if (b.totalAmount !== undefined && b.totalAmount !== job.total_amount) {
      const depositPaid = job.payment_status === 'deposit_paid' || job.payment_status === 'paid' ? job.deposit_amount ?? 0 : 0
      if (b.totalAmount < depositPaid) {
        return Response.json(
          { error: `Price can't be lower than the deposit already paid — refund the difference first`, code: 'BELOW_DEPOSIT' },
          { status: 409 }
        )
      }
      update.total_amount = b.totalAmount
      // Unpaid bookings get a fresh 50% deposit; a paid deposit stays as-is (balance absorbs the change).
      if (job.payment_status === 'unpaid') update.deposit_amount = calculateDeposit(b.totalAmount)
      // Fully paid + price raised -> there's now a balance to collect.
      if (job.payment_status === 'paid' && b.totalAmount > job.total_amount) update.payment_status = 'deposit_paid'
      priceChanged = true
    }
    if (b.serviceValue !== undefined) update.service_value = b.serviceValue
    else if (priceChanged && !job.membership_visit) update.service_value = b.totalAmount

    if (Object.keys(update).length === 0) return Response.json({ data: { changed: false } })
    const { error } = await supabase.from('jobs').update(update).eq('id', job.id).in('status', ['pending', 'confirmed'])
    if (error) throw error

    if (b.notify && (timeChanged || priceChanged)) await notifyVisitUpdated(job.id, { timeChanged, priceChanged })
    return Response.json({ data: { changed: true, timeChanged, priceChanged } })
  } catch (error) {
    console.error('[jobs/edit]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
