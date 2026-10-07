import { z } from 'zod'

import { createJobFromBooking } from '@/lib/bookings/createJob'
import { isRepriceError, repriceBooking } from '@/lib/bookings/reprice'
import { bookingPayloadSchema, readBookingMetadataJson } from '@/lib/bookings/types'
import { createPayPalOrder } from '@/lib/paypal'
import { createServiceClient } from '@/lib/supabase/server'
import { PRICING } from '@/lib/utils'

const createOrderSchema = z.object({
  amount: z.number().int().positive(), // deposit, cents
  items: z.array(
    z.object({
      name: z.string().min(1),
      price: z.number().int(), // cents; negative for credits
      quantity: z.number().int().positive().default(1),
    })
  ),
  metadata: z.record(z.string(), z.string()),
})

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    const parsed = createOrderSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { amount, metadata } = parsed.data

    const bookingResult = bookingPayloadSchema.safeParse(
      readBookingMetadataJson(metadata)
    )

    if (!bookingResult.success) {
      return Response.json(
        { error: 'Invalid booking metadata', details: bookingResult.error.flatten() },
        { status: 400 }
      )
    }

    // Server-side pricing — client amounts are ignored.
    const repriced = await repriceBooking(bookingResult.data)
    if (isRepriceError(repriced)) {
      return Response.json({ error: repriced.error, code: repriced.code }, { status: repriced.status })
    }
    const booking = repriced.payload
    const depositAmount = repriced.depositAmount

    if (amount !== depositAmount) {
      return Response.json(
        { error: 'Prices were updated — please go back one step and review your total', code: 'PRICE_CHANGED' },
        { status: 409 }
      )
    }
    if (depositAmount <= 0) {
      return Response.json({ error: 'Nothing to charge for this booking', code: 'EMPTY_CHECKOUT' }, { status: 400 })
    }

    if (booking.membershipPlan !== 'none') {
      return Response.json(
        {
          error: 'Storm Ready memberships must be purchased with card via Stripe',
          code: 'MEMBERSHIP_STRIPE_ONLY',
        },
        { status: 400 }
      )
    }

    const pendingJob = await createJobFromBooking({
      payload: booking,
      paymentStatus: 'unpaid',
      sendSms: false,
    })

    const order = await createPayPalOrder({
      amount: depositAmount,
      items: [
        {
          name: `Service deposit (${Math.round(PRICING.deposit_pct * 100)}%)`,
          unit_amount: depositAmount,
          quantity: 1,
        },
      ],
      metadata: { job_id: pendingJob.id },
    })

    const supabase = createServiceClient()
    await supabase
      .from('jobs')
      .update({ paypal_order_id: order.orderId })
      .eq('id', pendingJob.id)

    return Response.json({
      data: {
        orderId: order.orderId,
        approvalUrl: order.approvalUrl,
      },
    })
  } catch (error) {
    console.error('[paypal/create-order]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
