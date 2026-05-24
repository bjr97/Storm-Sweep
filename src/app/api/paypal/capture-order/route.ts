import { z } from 'zod'

import {
  confirmJobPayment,
  findJobById,
  findJobByPayPalOrderId,
} from '@/lib/bookings/createJob'
import { capturePayPalOrder } from '@/lib/paypal'

const captureOrderSchema = z.object({
  orderId: z.string().min(1),
})

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    const parsed = captureOrderSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { orderId } = parsed.data

    const existingJob = await findJobByPayPalOrderId(orderId)
    if (existingJob && existingJob.payment_status !== 'unpaid') {
      return Response.json({ data: { job: existingJob } })
    }

    const capture = await capturePayPalOrder(orderId)

    if (capture.status !== 'COMPLETED') {
      return Response.json(
        { error: 'Payment not completed', code: 'PAYMENT_INCOMPLETE' },
        { status: 402 }
      )
    }

    let jobId: string | null = null

    if (capture.customId) {
      try {
        const parsed = JSON.parse(capture.customId) as { job_id?: string }
        jobId = parsed.job_id ?? capture.customId
      } catch {
        jobId = capture.customId
      }
    }

    if (!jobId) {
      return Response.json(
        { error: 'Booking reference not found on PayPal order' },
        { status: 400 }
      )
    }

    const pendingJob = await findJobById(jobId)
    if (!pendingJob) {
      return Response.json({ error: 'Booking not found' }, { status: 404 })
    }

    const job = await confirmJobPayment({
      jobId: pendingJob.id,
      paymentStatus: 'deposit_paid',
      paypalOrderId: orderId,
    })

    return Response.json({ data: { job } })
  } catch (error) {
    console.error('[paypal/capture-order]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
