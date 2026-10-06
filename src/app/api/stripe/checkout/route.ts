import { z } from 'zod'

import {
  bookingPayloadSchema,
  serializeBookingMetadata,
} from '@/lib/bookings/types'
import { getAppUrl, getStripe } from '@/lib/stripe'
import { calculateDeposit, formatCurrency, PRICING } from '@/lib/utils'

function buildDepositLineItem(
  depositAmount: number,
  description: string
): {
  price_data: {
    currency: 'usd'
    unit_amount: number
    product_data: { name: string; description?: string }
  }
  quantity: number
} {
  const depositPct = Math.round(PRICING.deposit_pct * 100)
  return {
    price_data: {
      currency: 'usd',
      unit_amount: depositAmount, // already cents
      product_data: {
        name: `Service deposit (${depositPct}%)`,
        description: description.slice(0, 500),
      },
    },
    quantity: 1,
  }
}

const checkoutSchema = z.object({
  amount: z.number().int().nonnegative(), // visit deposit, cents (0 for a covered member clean)
  items: z.array(
    z.object({
      name: z.string().min(1),
      price: z.number().int(), // cents; negative for credits
      quantity: z.number().int().positive().default(1),
    })
  ),
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  metadata: z.record(z.string(), z.string()),
})

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    const parsed = checkoutSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { amount, items, customerEmail, customerName, metadata } =
      parsed.data

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
    const depositAmount = calculateDeposit(booking.totalAmount)

    if (amount !== depositAmount) {
      return Response.json(
        {
          error: `Deposit must be ${PRICING.deposit_pct * 100}% of total (${depositAmount})`,
          code: 'INVALID_DEPOSIT',
        },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const appUrl = getAppUrl()
    const membershipPlan = booking.membershipPlan
    const orderSummary = items
      .map((item) =>
        item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name
      )
      .join(' · ')
    // A member clean with no add-ons has no visit deposit — only the subscription.
    const depositLineItems =
      depositAmount > 0 ? [buildDepositLineItem(depositAmount, orderSummary)] : []

    const sessionMetadata = {
      ...serializeBookingMetadata(booking),
      customer_name: customerName,
      customer_email: customerEmail,
      ...metadata,
    }

    const baseParams = {
      customer_email: customerEmail,
      success_url: `${appUrl}/book/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/book`,
      metadata: sessionMetadata,
    }

    let sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0]

    if (membershipPlan === 'none') {
      if (depositLineItems.length === 0) {
        return Response.json(
          { error: 'Nothing to charge for this booking', code: 'EMPTY_CHECKOUT' },
          { status: 400 }
        )
      }
      sessionParams = {
        ...baseParams,
        mode: 'payment',
        line_items: depositLineItems,
        payment_intent_data: { metadata: sessionMetadata },
      }
    } else {
      // The membership is billed ONLY here, as a subscription. It is not part of
      // booking.totalAmount, so the visit deposit never includes it.
      const priceId =
        membershipPlan === 'annual'
          ? process.env.STRIPE_ANNUAL_PLAN_PRICE_ID
          : process.env.STRIPE_MONTHLY_PLAN_PRICE_ID

      if (!priceId) {
        // Never fall back to a plain payment: the clean is membership-covered,
        // so that would give it away without starting the subscription.
        console.error(`[stripe/checkout] Missing Stripe price ID for ${membershipPlan} plan`)
        return Response.json(
          { error: 'Memberships are temporarily unavailable', code: 'MEMBERSHIP_NOT_CONFIGURED' },
          { status: 503 }
        )
      }

      const isMonthly = membershipPlan === 'monthly'
      const commitmentMessage = `Storm Ready Monthly is a ${PRICING.membership.monthly_commitment_months}-month commitment at ${formatCurrency(PRICING.membership.monthly)}/month.`

      sessionParams = {
        ...baseParams,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }, ...depositLineItems],
        subscription_data: {
          metadata: {
            ...sessionMetadata,
            membership_plan: membershipPlan,
            ...(isMonthly
              ? { commitment_months: String(PRICING.membership.monthly_commitment_months) }
              : {}),
          },
        },
        ...(isMonthly ? { custom_text: { submit: { message: commitmentMessage } } } : {}),
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    if (!session.url) {
      return Response.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    return Response.json({ url: session.url })
  } catch (error) {
    console.error('[stripe/checkout]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
