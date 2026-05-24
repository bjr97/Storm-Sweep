import { z } from 'zod'

import { createJobFromBooking } from '@/lib/bookings/createJob'
import { bookingPayloadSchema } from '@/lib/bookings/types'
import { createPayPalOrder } from '@/lib/paypal'
import { createServiceClient } from '@/lib/supabase/server'
import { PRICING } from '@/lib/utils'

const createOrderSchema = z.object({
  amount: z.number().positive(),
  items: z.array(
    z.object({
      name: z.string().min(1),
      price: z.number().positive(),
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
      JSON.parse(metadata.booking_data ?? '{}')
    )

    if (!bookingResult.success) {
      return Response.json(
        { error: 'Invalid booking metadata', details: bookingResult.error.flatten() },
        { status: 400 }
      )
    }

    const booking = bookingResult.data
    const depositAmount = Math.round(booking.totalAmount * PRICING.deposit_pct)

    if (Math.abs(amount - depositAmount) > 0.01) {
      return Response.json(
        {
          error: `Deposit must be ${PRICING.deposit_pct * 100}% of total (${depositAmount})`,
          code: 'INVALID_DEPOSIT',
        },
        { status: 400 }
      )
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
