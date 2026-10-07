'use client'

import { CreditCard, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  serializeBookingMetadata,
  type BookingPayload,
  type BookingPaymentData,
} from '@/lib/bookings/types'
import { formatCurrency, PRICING } from '@/lib/utils'

type PaymentStepProps = {
  booking: BookingPaymentData
}

function toBookingPayload(booking: BookingPaymentData): BookingPayload {
  // Everything except the display-only summary. The server re-prices from
  // `selection`; amounts here are only used to detect a stale page.
  const { items: _items, depositAmount: _deposit, ...payload } = booking
  void _items
  void _deposit
  return payload
}

export function PaymentStep({
  booking,
}: PaymentStepProps): React.ReactElement {
  const [error, setError] = useState<string | null>(null)
  const [loadingMethod, setLoadingMethod] = useState<'stripe' | 'paypal' | null>(
    null
  )

  const balanceDue = booking.totalAmount - booking.depositAmount
  const isMembership = booking.membershipPlan !== 'none'
  const membershipPrice =
    booking.membershipPlan === 'annual'
      ? PRICING.membership.annual
      : booking.membershipPlan === 'monthly'
        ? PRICING.membership.monthly
        : 0
  const dueToday = membershipPrice + booking.depositAmount
  /** Existing member, clean covered, no paid add-ons — nothing to charge. */
  const freeMemberVisit = booking.depositAmount === 0 && booking.membershipPlan === 'none' && booking.membershipVisit
  const [confirming, setConfirming] = useState(false)

  async function handleConfirmIncludedVisit(): Promise<void> {
    setError(null)
    setConfirming(true)
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toBookingPayload(booking)),
      })
      const result = (await response.json()) as { error?: string; data?: { job?: { id: string } } }
      if (!response.ok || !result.data?.job) {
        setError(result.error ?? 'Unable to book your visit')
        return
      }
      window.location.href = `/history/${result.data.job.id}`
    } catch {
      setError('Unable to reach the server — please try again')
    } finally {
      setConfirming(false)
    }
  }

  if (freeMemberVisit) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-['Bebas_Neue'] text-3xl tracking-wide text-shelter">CONFIRM YOUR VISIT</h2>
          <p className="mt-1 font-['Barlow'] text-muted-foreground">
            This visit is included in your Storm Ready membership — nothing to pay today.
          </p>
        </div>
        <Card className="border-wheat/40 bg-white">
          <CardContent className="space-y-2 pt-6 font-['Barlow'] text-sm">
            {booking.items.map((item) => (
              <div key={`${item.name}-${item.price}`} className="flex justify-between">
                <span>{item.name}</span>
                <span className="font-medium">{formatCurrency(item.price)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        {error ? (
          <p className="rounded-lg border border-tornado/30 bg-tornado/5 px-4 py-3 text-sm text-tornado">{error}</p>
        ) : null}
        <Button
          type="button"
          className="w-full bg-sky text-white hover:bg-sky-dark"
          onClick={() => void handleConfirmIncludedVisit()}
          disabled={confirming}
        >
          {confirming ? <Loader2 className="mr-2 animate-spin" /> : null}
          Confirm my included visit
        </Button>
      </div>
    )
  }

  async function handleStripeCheckout(): Promise<void> {
    setError(null)
    setLoadingMethod('stripe')

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: booking.depositAmount,
          items: booking.items,
          customerEmail: booking.customerEmail,
          customerName: booking.customerName,
          metadata: serializeBookingMetadata(toBookingPayload(booking)),
        }),
      })

      const result = (await response.json()) as {
        url?: string
        error?: string
      }

      if (!response.ok) {
        setError(result.error ?? 'Unable to start card checkout')
        return
      }

      const checkoutUrl = result.url
      if (!checkoutUrl) {
        setError('Checkout URL missing — please try again')
        return
      }

      window.location.href = checkoutUrl
    } catch (err) {
      setError(err instanceof Error && err.message.includes('too long') ? err.message : 'Unable to connect to payment service')
    } finally {
      setLoadingMethod(null)
    }
  }

  async function handlePayPalCheckout(): Promise<void> {
    if (isMembership) {
      setError('Storm Ready memberships must be purchased with card')
      return
    }

    setError(null)
    setLoadingMethod('paypal')

    try {
      const response = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: booking.depositAmount,
          items: booking.items,
          metadata: serializeBookingMetadata(toBookingPayload(booking)),
        }),
      })

      const result = (await response.json()) as {
        data?: { approvalUrl?: string }
        error?: string
      }

      if (!response.ok) {
        setError(result.error ?? 'Unable to start PayPal checkout')
        return
      }

      const approvalUrl = result.data?.approvalUrl
      if (!approvalUrl) {
        setError('PayPal approval URL missing — please try again')
        return
      }

      window.location.href = approvalUrl
    } catch (err) {
      setError(err instanceof Error && err.message.includes('too long') ? err.message : 'Unable to connect to PayPal')
    } finally {
      setLoadingMethod(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-['Bebas_Neue'] text-3xl tracking-wide text-shelter">
          PAYMENT
        </h2>
        <p className="mt-1 font-['Barlow'] text-muted-foreground">
          {booking.totalAmount === 0
            ? `${formatCurrency(dueToday)} today for your membership — this visit is covered.`
            : `${formatCurrency(dueToday)} due today. Balance of ${formatCurrency(balanceDue)} is due after your visit.`}
        </p>
      </div>

      <Card className="border-sky/20 bg-white">
        <CardHeader>
          <CardTitle className="font-['Bebas_Neue'] text-2xl tracking-wide">
            Order Summary
          </CardTitle>
          <CardDescription className="font-['Barlow']">
            Review your selections before paying
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 font-['Barlow']">
          <ul className="space-y-2">
            {booking.items.map((item) => (
              <li
                key={`${item.name}-${item.price}`}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {item.name}
                  {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                </span>
                <span className="font-medium">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span>Visit total</span>
              <span className="font-semibold">
                {formatCurrency(booking.totalAmount)}
              </span>
            </div>
            {isMembership ? (
              <div className="flex justify-between">
                <span>
                  {booking.membershipPlan === 'annual'
                    ? 'Storm Ready Annual (billed yearly)'
                    : 'Storm Ready Monthly (first month)'}
                </span>
                <span className="font-semibold">{formatCurrency(membershipPrice)}</span>
              </div>
            ) : null}
            {booking.depositAmount > 0 ? (
              <div className="flex justify-between">
                <span>
                  Visit deposit ({Math.round(PRICING.deposit_pct * 100)}%)
                </span>
                <span className="font-semibold">
                  {formatCurrency(booking.depositAmount)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between text-sky">
              <span className="font-semibold">Due today</span>
              <span className="font-semibold">{formatCurrency(dueToday)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Balance after service</span>
              <span>{formatCurrency(balanceDue)}</span>
            </div>
          </div>

          {isMembership ? (
            <div className="rounded-lg border border-wheat/40 bg-wheat-pale px-4 py-3 text-sm text-shelter">
              <p className="font-semibold text-wheat">
                Storm Ready membership
              </p>
              <p className="mt-1 text-muted-foreground">
                Includes {PRICING.membership.visits_per_year} cleanings a year —
                today&apos;s visit is #1 — plus 10% off upgrades.
                {booking.membershipPlan === 'monthly'
                  ? ` Monthly is a ${PRICING.membership.monthly_commitment_months}-month commitment (${formatCurrency(PRICING.membership.monthly)}/mo).`
                  : ''}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded-lg border border-tornado/30 bg-tornado/5 px-4 py-3 text-sm text-tornado">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          className="flex-1 bg-sky text-white hover:bg-sky-dark"
          onClick={handleStripeCheckout}
          disabled={loadingMethod !== null}
        >
          {loadingMethod === 'stripe' ? (
            <Loader2 className="mr-2 animate-spin" />
          ) : (
            <CreditCard className="mr-2" />
          )}
          Pay with Card
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-[#0070BA] text-[#0070BA] hover:bg-[#0070BA]/5"
          onClick={handlePayPalCheckout}
          disabled={loadingMethod !== null || isMembership}
        >
          {loadingMethod === 'paypal' ? (
            <Loader2 className="mr-2 animate-spin" />
          ) : null}
          Pay with PayPal
        </Button>
      </div>
    </div>
  )
}
