import { createJobFromBooking } from '@/lib/bookings/createJob'
import { isRepriceError, repriceBooking } from '@/lib/bookings/reprice'
import { bookingPayloadSchema } from '@/lib/bookings/types'

/**
 * Bookings that skip online payment — and only those:
 *   - X-Large custom-quote requests (priced later by the office)
 *   - Storm Ready members booking an included clean with nothing to pay
 * Anything with a balance must go through Stripe/PayPal checkout.
 * Prices are recomputed server-side; client amounts are ignored.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const parsed = bookingPayloadSchema.safeParse(await req.json())
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const repriced = await repriceBooking(parsed.data)
    if (isRepriceError(repriced)) {
      return Response.json({ error: repriced.error, code: repriced.code }, { status: repriced.status })
    }
    const booking = repriced.payload
    const isQuote = booking.shelterSize === 'xlarge'
    const isIncludedMemberVisit =
      booking.membershipVisit && booking.membershipPlan === 'none' && booking.totalAmount === 0

    if (!isQuote && !isIncludedMemberVisit) {
      return Response.json(
        { error: 'This booking needs a deposit — please pay at checkout', code: 'PAYMENT_REQUIRED' },
        { status: 400 }
      )
    }

    const job = await createJobFromBooking({
      payload: booking,
      // Nothing is owed on an included member visit; quotes are priced later.
      paymentStatus: isIncludedMemberVisit ? 'paid' : 'unpaid',
      sendSms: isIncludedMemberVisit,
    })

    return Response.json({
      data: { job },
      message: isIncludedMemberVisit ? 'Your included visit is booked' : 'Quote request received',
    })
  } catch (error) {
    console.error('[bookings]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
