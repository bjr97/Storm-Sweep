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
  const {
    customerName,
    customerEmail,
    customerPhone,
    address,
    scheduledAt,
    shelterSize,
    serviceTypes,
    notes,
    referralSource,
    totalAmount,
    membershipPlan,
    photoGrade,
    photoUrls,
    photoFlags,
  } = booking

  return {
    customerName,
    customerEmail,
    customerPhone,
    address,
    scheduledAt,
    shelterSize,
    serviceTypes,
    notes,
    referralSource,
    totalAmount,
    membershipPlan,
    photoGrade,
    photoUrls,
    photoFlags,
  }
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
    } catch {
      setError('Unable to connect to payment service')
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
    } catch {
      setError('Unable to connect to PayPal')
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
          Pay your {Math.round(PRICING.deposit_pct * 100)}% deposit now. Balance
          of {formatCurrency(balanceDue)} is due after your visit.
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
              <span>Total</span>
              <span className="font-semibold">
                {formatCurrency(booking.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sky">
              <span>
                Deposit due today ({Math.round(PRICING.deposit_pct * 100)}%)
              </span>
              <span className="font-semibold">
                {formatCurrency(booking.depositAmount)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Balance after service</span>
              <span>{formatCurrency(balanceDue)}</span>
            </div>
          </div>

          {isMembership ? (
            <div className="rounded-lg border border-wheat/40 bg-wheat-pale px-4 py-3 text-sm text-shelter">
              <p className="font-semibold text-wheat">
                Storm Ready membership included
              </p>
              <p className="mt-1 text-muted-foreground">
                Your {booking.membershipPlan === 'annual' ? 'annual' : 'monthly'}{' '}
                Storm Ready plan will be activated with this booking. Members get
                2 visits per year and 10% off upgrades.
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
