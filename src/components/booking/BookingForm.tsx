'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { addDays, format } from 'date-fns'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { AddressAutocomplete } from '@/components/booking/AddressAutocomplete'
import { BookingProgressNav } from '@/components/booking/BookingProgressNav'
import { persistKitConfirmationMessage } from '@/components/booking/ConfirmationKitMessage'
import { KitSelector, type KitSelection } from '@/components/booking/KitSelector'
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
  REFERRAL_SOURCES,
  customerDetailsSchema,
  serviceSelectionSchema,
  type CustomerDetailsValues,
  type ServiceSelectionValues,
} from '@/lib/booking/schemas'
import { PRICING } from '@/lib/utils'

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

type BookingMembershipPlan = 'none' | 'annual' | 'monthly' | 'annual_2yr'

type BookingState = {
  shelterSize: ServiceSelectionValues['shelter_size']
  membershipPlan: BookingMembershipPlan
  serviceTotal: number
  kitSelection: KitSelection
}

const DEFAULT_SERVICE: ServiceSelectionValues = {
  shelter_size: 'standard',
  deep_clean: true,
  led_package: false,
  supply_kit: 'none',
  full_package: false,
  membership: 'one_time',
}

const SHELTER_READY_KIT_DISCOUNT = 59

const KIT_BUNDLE_CATALOG: Record<
  NonNullable<KitSelection['selectedBundle']>,
  { name: string; price: number }
> = {
  storm_starter: { name: 'Storm Starter', price: 79 },
  family_ready: { name: 'Family Ready', price: 89 },
  pet_ready: { name: 'Pet Ready', price: 89 },
  full_house: { name: 'Full House', price: 149 },
}

const A_LA_CARTE_CATALOG: Record<string, { name: string; price: number }> = {
  shelter_ready: { name: 'Shelter Ready Kit', price: 59 },
  little_ones: { name: 'Little Ones', price: 49 },
  pets: { name: 'Pets Add-on', price: 39 },
  hygiene: { name: 'Hygiene Pack', price: 24 },
}

function mapMembershipPlan(
  membership: ServiceSelectionValues['membership']
): BookingMembershipPlan {
  if (membership === 'one_time') {
    return 'none'
  }
  return membership
}

function kitIncludesShelterReady(kitSelection: KitSelection): boolean {
  if (kitSelection.selectedBundle) {
    return true
  }
  return kitSelection.aLaCarteItems.includes('shelter_ready')
}

function buildKitLineItems(
  kitSelection: KitSelection,
  membershipPlan: BookingMembershipPlan
): { label: string; amount: number }[] {
  if (
    !kitSelection.selectedBundle &&
    kitSelection.aLaCarteItems.length === 0
  ) {
    return []
  }

  const lines: { label: string; amount: number }[] = []

  if (kitSelection.selectedBundle) {
    const bundle = KIT_BUNDLE_CATALOG[kitSelection.selectedBundle]
    lines.push({ label: bundle.name, amount: bundle.price })
  } else {
    for (const itemId of kitSelection.aLaCarteItems) {
      const item = A_LA_CARTE_CATALOG[itemId]
      if (item) {
        lines.push({ label: item.name, amount: item.price })
      }
    }
  }

  if (
    membershipPlan === 'annual_2yr' &&
    kitIncludesShelterReady(kitSelection) &&
    kitSelection.kitTotal > 0
  ) {
    lines.push({
      label: '2yr Member Kit Credit',
      amount: -SHELTER_READY_KIT_DISCOUNT,
    })
  }

  return lines
}

const STEP_TITLES: Record<number, { title: string; description: string }> = {
  1: {
    title: 'BOOK YOUR SWEEP',
    description: 'Select your shelter size and services.',
  },
  2: {
    title: 'PREP YOUR SHELTER',
    description: 'Add a prep kit — your Sweeper installs it during the same visit.',
  },
  3: {
    title: 'YOUR DETAILS',
    description: 'Tell us where and when to arrive.',
  },
  4: {
    title: 'SHELTER PHOTO',
    description: 'Help your Sweeper arrive prepared.',
  },
  5: {
    title: 'PAYMENT',
    description: 'Secure your spot with a 50% deposit.',
  },
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
  const [kitSelection, setKitSelection] = useState<KitSelection>({
    selectedBundle: null,
    aLaCarteItems: [],
    ageSelector: null,
    petSizeSelector: null,
    kitTotal: 0,
  })
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

  const bookingState = useMemo<BookingState>(() => {
    const basePricing = calculateBookingPrice({
      ...serviceSelection,
      supply_kit: 'none',
    })

    return {
      shelterSize: serviceSelection.shelter_size,
      membershipPlan: mapMembershipPlan(serviceSelection.membership),
      serviceTotal: basePricing.serviceSubtotal ?? 0,
      kitSelection,
    }
  }, [serviceSelection, kitSelection])

  const pricing = useMemo(() => {
    const base = calculateBookingPrice({
      ...serviceSelection,
      supply_kit: 'none',
    })

    if (base.isQuoteRequired || base.total === null || kitSelection.kitTotal <= 0) {
      return base
    }

    const kitLines = buildKitLineItems(
      kitSelection,
      bookingState.membershipPlan
    )
    const total = base.total + kitSelection.kitTotal

    return {
      ...base,
      addonsPrice: base.addonsPrice + kitSelection.kitTotal,
      serviceSubtotal: (base.serviceSubtotal ?? 0) + kitSelection.kitTotal,
      total,
      deposit: Math.round(total * PRICING.deposit_pct),
      lineItems: [...base.lineItems, ...kitLines],
    }
  }, [serviceSelection, kitSelection, bookingState.membershipPlan])

  const paymentData = useMemo(
    () =>
      buildPaymentData(
        serviceSelection,
        customerValues,
        pricing,
        photoResult,
        kitSelection
      ),
    [serviceSelection, customerValues, pricing, photoResult, kitSelection]
  )

  useEffect(() => {
    persistKitConfirmationMessage(kitSelection)
  }, [kitSelection])

  async function goToNextStep(): Promise<void> {
    if (currentStep === 1) {
      serviceForm.reset(serviceSelection)
      const valid = await serviceForm.trigger()
      if (!valid) return
      setCurrentStep(2)
      return
    }

    if (currentStep === 2) {
      return
    }

    if (currentStep === 3) {
      const valid = await customerForm.trigger()
      if (!valid) return
      setCurrentStep(4)
      return
    }

    if (currentStep === 4) {
      setCurrentStep(5)
    }
  }

  async function submitQuoteRequest(): Promise<void> {
    setQuoteError(null)
    const serviceValid = await serviceForm.trigger()
    const customerValid = await customerForm.trigger()
    if (!serviceValid || !customerValid) {
      return
    }

    persistKitConfirmationMessage(kitSelection)

    setQuoteSubmitting(true)
    try {
      const bookingPayload = buildQuoteBookingPayload(
        serviceSelection,
        customerValues,
        photoResult,
        kitSelection
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

  function renderStep(): React.ReactElement | null {
    switch (currentStep) {
      case 1:
        return (
          <ServiceSelector
            values={serviceSelection}
            onChange={(values) => {
              setServiceSelection(values)
              serviceForm.reset(values)
            }}
          />
        )

      case 2:
        return (
          <KitSelector
            shelterSize={bookingState.shelterSize}
            membershipPlan={bookingState.membershipPlan}
            serviceTotal={bookingState.serviceTotal}
            onSelect={(selection) => setKitSelection(selection)}
            onSkip={() => setCurrentStep(3)}
            onContinue={() => setCurrentStep(3)}
          />
        )

      case 3:
        return (
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
        )

      case 4:
        return <PhotoUpload bookingId={bookingId} onResult={setPhotoResult} />

      case 5:
        return paymentData ? (
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

      default:
        return null
    }
  }

  const stepMeta = STEP_TITLES[currentStep]

  return (
    <div className="mx-auto w-full max-w-3xl">
      <BookingProgressNav currentStep={currentStep} />

      <Card className="border-border/60 bg-white shadow-sm">
        {stepMeta ? (
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-shelter">
              {stepMeta.title}
            </CardTitle>
            <CardDescription>{stepMeta.description}</CardDescription>
          </CardHeader>
        ) : null}

        <CardContent className="space-y-6">
          {renderStep()}

          {!(currentStep === 5 && paymentData) && currentStep !== 2 ? (
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

              {currentStep < 5 ? (
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
