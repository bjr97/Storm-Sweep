import { z } from 'zod'

import {
  bookingPayloadSchema,
  serializeBookingMetadata,
} from '@/lib/bookings/types'
import { getAppUrl, getStripe } from '@/lib/stripe'
import { PRICING } from '@/lib/utils'

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
      unit_amount: Math.round(depositAmount * 100),
      product_data: {
        name: `Service deposit (${depositPct}%)`,
        description: description.slice(0, 500),
      },
    },
    quantity: 1,
  }
}

const checkoutSchema = z.object({
  amount: z.number().positive(),
  items: z.array(
    z.object({
      name: z.string().min(1),
      price: z.number().positive(),
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

    const stripe = getStripe()
    const appUrl = getAppUrl()
    const membershipPlan = booking.membershipPlan
    const orderSummary = items
      .map((item) =>
        item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name
      )
      .join(' · ')
    const depositLineItem = buildDepositLineItem(depositAmount, orderSummary)

    const sessionMetadata = {
      ...serializeBookingMetadata(booking),
      customer_name: customerName,
      customer_email: customerEmail,
      ...metadata,
    }

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      customer_email: customerEmail,
      line_items: [depositLineItem],
      mode: 'payment',
      success_url: `${appUrl}/book/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/book`,
      metadata: sessionMetadata,
      payment_intent_data: {
        metadata: sessionMetadata,
      },
    }

    if (membershipPlan === 'annual' && process.env.STRIPE_ANNUAL_PLAN_PRICE_ID) {
      sessionParams.mode = 'subscription'
      sessionParams.line_items = [
        {
          price: process.env.STRIPE_ANNUAL_PLAN_PRICE_ID,
          quantity: 1,
        },
        depositLineItem,
      ]
      sessionParams.subscription_data = {
        metadata: {
          ...sessionMetadata,
          membership_plan: membershipPlan,
        },
      }
    } else if (
      membershipPlan === 'monthly' &&
      process.env.STRIPE_MONTHLY_PLAN_PRICE_ID
    ) {
      sessionParams.mode = 'subscription'
      sessionParams.line_items = [
        {
          price: process.env.STRIPE_MONTHLY_PLAN_PRICE_ID,
          quantity: 1,
        },
        depositLineItem,
      ]
      sessionParams.subscription_data = {
        metadata: {
          ...sessionMetadata,
          membership_plan: membershipPlan,
        },
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
