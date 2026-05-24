import { createJobFromBooking } from '@/lib/bookings/createJob'
import { bookingPayloadSchema } from '@/lib/bookings/types'

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    const parsed = bookingPayloadSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const job = await createJobFromBooking({
      payload: parsed.data,
      paymentStatus: 'unpaid',
      sendSms: false,
    })

    return Response.json({
      data: { job },
      message: 'Booking created — complete payment to confirm',
    })
  } catch (error) {
    console.error('[bookings]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
