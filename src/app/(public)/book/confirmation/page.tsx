import { ConfirmationKitMessage } from '@/components/booking/ConfirmationKitMessage'
import { BookingProgressNav } from '@/components/booking/BookingProgressNav'
import Link from 'next/link'

import { CheckCircle2, MessageSquare } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  confirmJobPayment,
  findJobByPayPalOrderId,
  findJobByStripeSessionId,
} from '@/lib/bookings/createJob'
import { parseBookingMetadata, shelterSizeLabel } from '@/lib/bookings/types'
import { capturePayPalOrder } from '@/lib/paypal'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { cn, formatCurrency, PRICING } from '@/lib/utils'
import type { Job } from '@/types/database'

type ConfirmationPageProps = {
  searchParams: {
    session_id?: string
    token?: string
    quote?: string
  }
}

async function capturePayPalIfNeeded(token: string): Promise<Job | null> {
  const existingJob = await findJobByPayPalOrderId(token)
  if (existingJob && existingJob.payment_status !== 'unpaid') {
    return existingJob
  }

  try {
    const capture = await capturePayPalOrder(token)
    if (capture.status !== 'COMPLETED') {
      return existingJob
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
      return existingJob
    }

    return await confirmJobPayment({
      jobId,
      paymentStatus: 'deposit_paid',
      paypalOrderId: token,
    })
  } catch {
    return existingJob
  }
}

async function loadStripeSummary(sessionId: string): Promise<{
  job: Job | null
  fallback: {
    customerName: string
    totalAmount: number
    depositAmount: number
    address: string
    scheduledAt: string | null
    serviceTypes: string[]
    shelterSize: string
  } | null
}> {
  const existingJob = await findJobByStripeSessionId(sessionId)
  if (existingJob) {
    return { job: existingJob, fallback: null }
  }

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const booking = parseBookingMetadata(session.metadata ?? {})

    if (!booking) {
      return { job: null, fallback: null }
    }

    return {
      job: null,
      fallback: {
        customerName: booking.customerName,
        totalAmount: booking.totalAmount,
        depositAmount: Math.round(booking.totalAmount * PRICING.deposit_pct),
        address: booking.address,
        scheduledAt: booking.scheduledAt ?? null,
        serviceTypes: booking.serviceTypes,
        shelterSize: booking.shelterSize,
      },
    }
  } catch {
    return { job: null, fallback: null }
  }
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'To be scheduled'
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export default async function BookingConfirmationPage({
  searchParams,
}: ConfirmationPageProps): Promise<React.ReactElement> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isQuoteRequest = searchParams.quote === '1'

  let job: Job | null = null
  let summary: {
    customerName: string
    totalAmount: number
    depositAmount: number
    address: string
    scheduledAt: string | null
    serviceTypes: string[]
    shelterSize: string
  } | null = null

  if (searchParams.token) {
    job = await capturePayPalIfNeeded(searchParams.token)
    if (job) {
      summary = {
        customerName: 'Customer',
        totalAmount: job.total_amount,
        depositAmount: job.deposit_amount,
        address: job.address,
        scheduledAt: job.scheduled_at,
        serviceTypes: job.service_type,
        shelterSize: job.shelter_size,
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', job.customer_id)
        .maybeSingle()

      if (profile?.full_name) {
        summary.customerName = profile.full_name
      }
    }
  } else if (searchParams.session_id) {
    const stripeSummary = await loadStripeSummary(searchParams.session_id)
    job = stripeSummary.job
    summary = stripeSummary.fallback

    if (job) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', job.customer_id)
        .maybeSingle()

      summary = {
        customerName: profile?.full_name ?? 'Customer',
        totalAmount: job.total_amount,
        depositAmount: job.deposit_amount,
        address: job.address,
        scheduledAt: job.scheduled_at,
        serviceTypes: job.service_type,
        shelterSize: job.shelter_size,
      }
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <BookingProgressNav currentStep={6} />

      <div className="mb-8 text-center">
        <CheckCircle2 className="mx-auto size-14 text-sky" />
        <h1 className="mt-4 font-['Bebas_Neue'] text-4xl tracking-wide text-[var(--color-bg)]">
          {isQuoteRequest ? 'QUOTE REQUEST RECEIVED' : "YOU'RE BOOKED"}
        </h1>
        <p className="mt-2 font-['Barlow'] text-muted-foreground">
          {isQuoteRequest
            ? 'Our team will contact you shortly to finalize pricing for your X-Large shelter.'
            : 'Thank you for choosing Storm Sweep'}
        </p>
      </div>

      {summary ? (
        <Card className="mb-6 border-sky/20 bg-white">
          <CardHeader>
            <CardTitle className="font-['Bebas_Neue'] text-2xl tracking-wide">
              Booking Summary
            </CardTitle>
            <CardDescription className="font-['Barlow']">
              Confirmation for {summary.customerName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-['Barlow'] text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Service address</span>
              <span className="text-right font-medium">{summary.address}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Shelter size</span>
              <span className="font-medium">
                {shelterSizeLabel(
                  summary.shelterSize as 'small' | 'standard' | 'large' | 'xlarge'
                )}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Preferred date</span>
              <span className="font-medium">
                {formatDate(summary.scheduledAt)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Services</span>
              <ul className="mt-1 list-inside list-disc font-medium">
                {summary.serviceTypes.map((service) => (
                  <li key={service}>{service}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">
                {formatCurrency(summary.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sky">
              <span>Deposit paid</span>
              <span className="font-semibold">
                {formatCurrency(summary.depositAmount)}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 border-sky/20 bg-white">
          <CardContent className="py-8 text-center font-['Barlow'] text-muted-foreground">
            Your payment was received. Booking details will appear here shortly.
          </CardContent>
        </Card>
      )}

      <ConfirmationKitMessage serviceTypes={summary?.serviceTypes ?? []} />

      {!isQuoteRequest ? (
        <div className="mb-8 flex items-start gap-3 rounded-lg border border-sky/20 bg-sky-pale px-4 py-4 font-['Barlow'] text-sm text-[var(--color-bg)]">
          <MessageSquare className="mt-0.5 size-5 shrink-0 text-sky" />
          <p>
            You&apos;ll receive a text confirmation shortly with your visit
            details and arrival window.
          </p>
        </div>
      ) : (
        <div className="mb-8 flex items-start gap-3 rounded-lg border border-wheat/40 bg-wheat-pale px-4 py-4 font-['Barlow'] text-sm text-[var(--color-bg)]">
          <MessageSquare className="mt-0.5 size-5 shrink-0 text-wheat" />
          <p>
            You&apos;ll receive a text confirmation shortly once we&apos;ve
            reviewed your request.
          </p>
        </div>
      )}

      {!user ? (
        <div className="rounded-lg border border-wheat/40 bg-wheat-pale px-4 py-5 text-center">
          <p className="font-['Barlow'] text-sm text-[var(--color-bg)]">
            Create an account to track your visit, view photos, and manage
            future bookings.
          </p>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'mt-4 bg-sky text-[var(--color-text)] hover:opacity-90'
            )}
          >
            Create account to track your visit
          </Link>
        </div>
      ) : (
        <div className="text-center">
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
          >
            Go to your dashboard
          </Link>
        </div>
      )}
    </section>
  )
}
