import { z } from 'zod'

import { getUserIdByEmail } from '@/lib/auth/users'
import { requireRole } from '@/lib/auth/requireRole'
import { addressPartsSchema, formatServiceAddress } from '@/lib/booking/address'
import { priceBooking } from '@/lib/booking/quote'
import { serviceSelectionSchema } from '@/lib/booking/schemas'
import { TIME_WINDOW_VALUES, windowStartIso } from '@/lib/booking/timeWindows'
import { createJobFromBooking } from '@/lib/bookings/createJob'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Office phone booking. Prices are computed here with priceBooking() (never
 * taken from the form). Existing Storm Ready members get their included visit
 * when they have one left. The job is created confirmed, so it goes straight
 * onto the Sweeper job board.
 */
const bodySchema = addressPartsSchema.extend({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10).regex(/^[\d\s()+-]+$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  window: z.enum(TIME_WINDOW_VALUES),
  service: serviceSelectionSchema.omit({ membership: true }),
  useIncludedVisit: z.boolean(),
  payment: z.enum(['unpaid', 'deposit_paid', 'paid']),
  referralSource: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
  notifyCustomer: z.boolean(),
})

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }
    const b = parsed.data

    // Membership comes from the database, not the form.
    let member: { visitsUsed: number } | null = null
    if (b.useIncludedVisit) {
      const id = await getUserIdByEmail(b.email)
      const { data: p } = id
        ? await createServiceClient().from('profiles').select('membership_status, visits_used').eq('id', id).maybeSingle()
        : { data: null }
      if (p?.membership_status !== 'active') {
        return Response.json({ error: 'No active Storm Ready membership for that email', code: 'NOT_A_MEMBER' }, { status: 409 })
      }
      member = { visitsUsed: p.visits_used }
    }
    const service = { ...b.service, membership: member ? ('member' as const) : ('one_time' as const) }
    const quote = priceBooking(service, null, member)
    const total = quote.breakdown.total ?? 0
    // Nothing owed (covered member clean) counts as paid so the visit is recorded.
    const paymentStatus = total === 0 && !quote.breakdown.isQuoteRequired ? 'paid' : b.payment

    const job = await createJobFromBooking({
      payload: {
        customerName: `${b.firstName} ${b.lastName}`,
        customerEmail: b.email,
        customerPhone: b.phone,
        address: formatServiceAddress(b),
        scheduledAt: windowStartIso(b.date, b.window),
        timeWindow: b.window,
        shelterSize: service.shelter_size,
        serviceTypes: quote.serviceTypes,
        notes: b.notes || undefined,
        referralSource: b.referralSource || 'phone',
        totalAmount: total,
        serviceValue: quote.breakdown.isQuoteRequired ? undefined : quote.serviceValue,
        membershipVisit: quote.membershipVisit,
        membershipPlan: 'none',
      },
      paymentStatus,
      sendSms: b.notifyCustomer,
      confirmUnpaid: b.notifyCustomer,
    })

    // Entered by the office: confirmed right away (no photo screening) -> job board.
    // X-Large quotes stay pending until the office prices them.
    const { data: confirmed, error } = await createServiceClient()
      .from('jobs')
      .update({ status: quote.breakdown.isQuoteRequired ? 'pending' : 'confirmed', photo_approved: true })
      .eq('id', job.id)
      .select('id, total_amount, status, board_opened_at')
      .single()
    if (error) throw error
    return Response.json({ data: confirmed, message: 'Booking created' })
  } catch (error) {
    console.error('[admin/jobs]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
