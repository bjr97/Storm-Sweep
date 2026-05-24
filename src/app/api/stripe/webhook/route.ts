import Stripe from 'stripe'

import {
  createJobFromBooking,
  findJobByStripeSessionId,
} from '@/lib/bookings/createJob'
import { parseBookingMetadata } from '@/lib/bookings/types'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const existingJob = await findJobByStripeSessionId(session.id)
  if (existingJob) {
    return
  }

  const metadata = session.metadata ?? {}
  const booking = parseBookingMetadata(metadata)

  if (!booking) {
    console.error('[stripe/webhook] Missing booking_data in session metadata')
    return
  }

  await createJobFromBooking({
    payload: booking,
    paymentStatus: 'deposit_paid',
    stripePaymentIntentId: session.id,
  })
}

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const metadata = subscription.metadata ?? {}
  const booking = parseBookingMetadata(metadata)
  let customerEmail: string | null =
    metadata.customer_email ?? booking?.customerEmail ?? null

  if (!customerEmail && typeof subscription.customer !== 'string') {
    const customer = subscription.customer
    if (customer && !('deleted' in customer && customer.deleted)) {
      customerEmail = customer.email ?? null
    }
  }

  if (!customerEmail) {
    console.error('[stripe/webhook] Subscription missing customer email')
    return
  }

  const supabase = createServiceClient()
  let userId: string | null = null
  let page = 1

  while (!userId) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    })
    if (error) {
      throw error
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === customerEmail.toLowerCase()
    )
    if (match) {
      userId = match.id
      break
    }

    if (data.users.length < 1000) {
      break
    }
    page += 1
  }

  if (!userId) {
    console.error('[stripe/webhook] No profile found for subscription customer')
    return
  }

  const plan =
    metadata.membership_plan === 'monthly'
      ? 'monthly'
      : metadata.membership_plan === 'annual'
        ? 'annual'
        : booking?.membershipPlan === 'monthly'
          ? 'monthly'
          : booking?.membershipPlan === 'annual'
            ? 'annual'
            : subscription.items.data[0]?.price?.recurring?.interval === 'month'
              ? 'monthly'
              : 'annual'

  await supabase
    .from('profiles')
    .update({
      membership_status: 'active',
      membership_plan: plan,
      stripe_subscription_id: subscription.id,
      stripe_customer_id:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id ?? null,
      membership_renews_at: (() => {
        const periodEnd = subscription.items.data[0]?.current_period_end
        return periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null
      })(),
    })
    .eq('id', userId)
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = createServiceClient()

  await supabase
    .from('profiles')
    .update({
      membership_status: 'cancelled',
      stripe_subscription_id: null,
      membership_renews_at: null,
    })
    .eq('stripe_subscription_id', subscription.id)
}

export async function POST(req: Request): Promise<Response> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not configured')
    return Response.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return Response.json({ error: 'Missing signature' }, { status: 400 })
    }

    const stripe = getStripe()
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error) {
      console.error('[stripe/webhook] Signature verification failed', error)
      return Response.json({ error: 'Invalid signature' }, { status: 400 })
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        )
        break
      case 'customer.subscription.created':
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        )
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        )
        break
      default:
        break
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error('[stripe/webhook]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
