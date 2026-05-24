'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { addDays, format } from 'date-fns'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { AddressAutocomplete } from '@/components/booking/AddressAutocomplete'
import { PaymentStep } from '@/components/booking/PaymentStep'
import { PhotoUpload, type PhotoScreenResult } from '@/components/booking/PhotoUpload'
import { ServiceSelector } from '@/components/booking/ServiceSelector'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildPaymentData, buildQuoteBookingPayload } from '@/lib/booking/payment'
import { calculateBookingPrice } from '@/lib/booking/pricing'
import {
  BOOKING_STEPS,
  REFERRAL_SOURCES,
  customerDetailsSchema,
  serviceSelectionSchema,
  type CustomerDetailsValues,
  type ServiceSelectionValues,
} from '@/lib/booking/schemas'
import { cn } from '@/lib/utils'

export type BookingInitialCustomer = {
  full_name: string
  email: string
  phone: string
  address: string
}

type BookingFormProps = {
  initialCustomer?: BookingInitialCustomer | null
  referralCode?: string | null
  isLoggedIn?: boolean
}

const DEFAULT_SERVICE: ServiceSelectionValues = {
  shelter_size: 'standard',
  deep_clean: true,
  led_package: false,
  supply_kit: 'none',
  full_package: false,
  membership: 'one_time',
}

export function BookingForm({
  initialCustomer,
  referralCode,
  isLoggedIn = false,
}: BookingFormProps): React.ReactElement {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [bookingId] = useState(() => crypto.randomUUID())
  const [quoteSubmitting, setQuoteSubmitting] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [serviceSelection, setServiceSelection] =
    useState<ServiceSelectionValues>(DEFAULT_SERVICE)
  const [photoResult, setPhotoResult] = useState<PhotoScreenResult | null>(null)

  const minDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const defaultReferral = referralCode
    ? `partner:${referralCode}`
    : ''

  const serviceForm = useForm<ServiceSelectionValues>({
    resolver: zodResolver(serviceSelectionSchema),
    defaultValues: DEFAULT_SERVICE,
    mode: 'onChange',
  })

  const customerForm = useForm<CustomerDetailsValues>({
    resolver: zodResolver(customerDetailsSchema),
    defaultValues: {
      full_name: initialCustomer?.full_name ?? '',
      email: initialCustomer?.email ?? '',
      phone: initialCustomer?.phone ?? '',
      address: initialCustomer?.address ?? '',
      preferred_date: '',
      notes: '',
      referral_source: defaultReferral || '',
    },
  })

  const customerValues = customerForm.watch()

  const pricing = useMemo(
    () => calculateBookingPrice(serviceSelection),
    [serviceSelection]
  )

  const paymentData = useMemo(
    () =>
      buildPaymentData(serviceSelection, customerValues, pricing, photoResult),
    [serviceSelection, customerValues, pricing, photoResult]
  )

  async function goToNextStep(): Promise<void> {
    if (currentStep === 1) {
      serviceForm.reset(serviceSelection)
      const valid = await serviceForm.trigger()
      if (!valid) return
      setCurrentStep(2)
      return
    }

    if (currentStep === 2) {
      const valid = await customerForm.trigger()
      if (!valid) return
      setCurrentStep(3)
      return
    }

    if (currentStep === 3) {
      setCurrentStep(4)
    }
  }

  async function submitQuoteRequest(): Promise<void> {
    setQuoteError(null)
    const serviceValid = await serviceForm.trigger()
    const customerValid = await customerForm.trigger()
    if (!serviceValid || !customerValid) {
      return
    }

    setQuoteSubmitting(true)
    try {
      const bookingPayload = buildQuoteBookingPayload(
        serviceSelection,
        customerValues,
        photoResult
      )

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        setQuoteError(result.error ?? 'Unable to submit quote request')
        return
      }

      router.push('/book/confirmation?quote=1')
    } catch {
      setQuoteError('Unable to submit quote request')
    } finally {
      setQuoteSubmitting(false)
    }
  }

  function goToPreviousStep(): void {
    setCurrentStep((step) => Math.max(1, step - 1))
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <nav aria-label="Booking progress" className="mb-8">
        <ol className="flex items-center justify-between gap-2">
          {BOOKING_STEPS.map((step, index) => {
            const isComplete = currentStep > step.id
            const isCurrent = currentStep === step.id
            return (
              <li key={step.id} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full items-center">
                  {index > 0 ? (
                    <div
                      className={cn(
                        'h-0.5 flex-1',
                        isComplete || isCurrent ? 'bg-sky-DEFAULT' : 'bg-border'
                      )}
                    />
                  ) : (
                    <div className="flex-1" />
                  )}
                  <div
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                      isComplete
                        ? 'border-sky-DEFAULT bg-sky-DEFAULT text-white'
                        : isCurrent
                          ? 'border-sky-DEFAULT bg-white text-sky-DEFAULT'
                          : 'border-border bg-white text-muted-foreground'
                    )}
                  >
                    {isComplete ? <Check className="size-4" /> : step.id}
                  </div>
                  {index < BOOKING_STEPS.length - 1 ? (
                    <div
                      className={cn(
                        'h-0.5 flex-1',
                        currentStep > step.id ? 'bg-sky-DEFAULT' : 'bg-border'
                      )}
                    />
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
                <span
                  className={cn(
                    'hidden text-xs font-medium sm:block',
                    isCurrent ? 'text-sky-DEFAULT' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </li>
            )
          })}
        </ol>
      </nav>

      <Card className="border-border/60 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-shelter">
            {currentStep === 1 && 'BOOK YOUR SWEEP'}
            {currentStep === 2 && 'YOUR DETAILS'}
            {currentStep === 3 && 'SHELTER PHOTO'}
            {currentStep === 4 && 'PAYMENT'}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Select your shelter size and services.'}
            {currentStep === 2 && 'Tell us where and when to arrive.'}
            {currentStep === 3 && 'Help your Sweeper arrive prepared.'}
            {currentStep === 4 && 'Secure your spot with a 50% deposit.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep === 1 ? (
            <ServiceSelector
              values={serviceSelection}
              onChange={(values) => {
                setServiceSelection(values)
                serviceForm.reset(values)
              }}
            />
          ) : null}

          {currentStep === 2 ? (
            <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
              {isLoggedIn ? (
                <p className="rounded-lg bg-sky-pale px-3 py-2 text-sm text-sky-dark">
                  Signed in — your details were pre-filled from your account.
                </p>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input
                    id="full_name"
                    className="h-10 bg-white"
                    aria-invalid={Boolean(customerForm.formState.errors.full_name)}
                    {...customerForm.register('full_name')}
                  />
                  {customerForm.formState.errors.full_name ? (
                    <p className="text-sm text-tornado">
                      {customerForm.formState.errors.full_name.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="h-10 bg-white"
                    aria-invalid={Boolean(customerForm.formState.errors.email)}
                    {...customerForm.register('email')}
                  />
                  {customerForm.formState.errors.email ? (
                    <p className="text-sm text-tornado">
                      {customerForm.formState.errors.email.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    className="h-10 bg-white"
                    placeholder="(405) 555-0123"
                    aria-invalid={Boolean(customerForm.formState.errors.phone)}
                    {...customerForm.register('phone')}
                  />
                  {customerForm.formState.errors.phone ? (
                    <p className="text-sm text-tornado">
                      {customerForm.formState.errors.phone.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Service address</Label>
                  <AddressAutocomplete
                    id="address"
                    value={customerForm.watch('address')}
                    onChange={(value) =>
                      customerForm.setValue('address', value, { shouldValidate: true })
                    }
                    onBlur={() => void customerForm.trigger('address')}
                    invalid={Boolean(customerForm.formState.errors.address)}
                  />
                  {customerForm.formState.errors.address ? (
                    <p className="text-sm text-tornado">
                      {customerForm.formState.errors.address.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferred_date">Preferred date</Label>
                  <Input
                    id="preferred_date"
                    type="date"
                    min={minDate}
                    className="h-10 bg-white"
                    aria-invalid={Boolean(customerForm.formState.errors.preferred_date)}
                    {...customerForm.register('preferred_date')}
                  />
                  {customerForm.formState.errors.preferred_date ? (
                    <p className="text-sm text-tornado">
                      {customerForm.formState.errors.preferred_date.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referral_source">How did you hear about us?</Label>
                  <select
                    id="referral_source"
                    className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    aria-invalid={Boolean(customerForm.formState.errors.referral_source)}
                    {...customerForm.register('referral_source')}
                  >
                    <option value="">Select one…</option>
                    {referralCode ? (
                      <option value={`partner:${referralCode}`}>
                        Partner referral ({referralCode})
                      </option>
                    ) : null}
                    {REFERRAL_SOURCES.map((source) => (
                      <option key={source.value} value={source.value}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                  {customerForm.formState.errors.referral_source ? (
                    <p className="text-sm text-tornado">
                      {customerForm.formState.errors.referral_source.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <textarea
                    id="notes"
                    rows={3}
                    placeholder="Gate codes, dogs, access instructions…"
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    {...customerForm.register('notes')}
                  />
                  {customerForm.formState.errors.notes ? (
                    <p className="text-sm text-tornado">
                      {customerForm.formState.errors.notes.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </form>
          ) : null}

          {currentStep === 3 ? (
            <PhotoUpload bookingId={bookingId} onResult={setPhotoResult} />
          ) : null}

          {currentStep === 4 ? (
            paymentData ? (
              <PaymentStep booking={paymentData} onBack={goToPreviousStep} />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  X-Large shelters require a custom quote. Our team will contact you after you
                  submit your details to finalize pricing and schedule your visit.
                </p>
                {quoteError ? (
                  <p className="rounded-lg border border-tornado/30 bg-tornado/5 px-4 py-3 text-sm text-tornado">
                    {quoteError}
                  </p>
                ) : null}
                <Button
                  type="button"
                  onClick={() => void submitQuoteRequest()}
                  disabled={quoteSubmitting}
                  className="bg-sky-DEFAULT text-white hover:bg-sky-dark"
                >
                  {quoteSubmitting ? 'Submitting…' : 'Submit quote request'}
                </Button>
              </div>
            )
          ) : null}

          {!(currentStep === 4 && paymentData) ? (
            <div className="flex items-center justify-between border-t border-border pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
                disabled={currentStep === 1}
                className="gap-2"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>

              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={() => void goToNextStep()}
                  className="gap-2 bg-sky-DEFAULT text-white hover:bg-sky-dark"
                >
                  Continue
                  <ArrowRight className="size-4" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
