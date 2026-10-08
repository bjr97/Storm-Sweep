'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { addDays, format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { AddressAutocomplete } from '@/components/booking/AddressAutocomplete'
import { BookingFooter } from '@/components/booking/BookingFooter'
import { BookingProgressNav } from '@/components/booking/BookingProgressNav'
import { persistKitConfirmationMessage } from '@/components/booking/ConfirmationKitMessage'
import { canProceedWithKit, KitSelector, type KitSelection } from '@/components/booking/KitSelector'
import { PaymentStep } from '@/components/booking/PaymentStep'
import { PromoCodeField } from '@/components/booking/PromoCodeField'
import { PhotoUpload, type PhotoScreenResult } from '@/components/booking/PhotoUpload'
import { ServiceSelector } from '@/components/booking/ServiceSelector'
import { WaitlistOffer } from '@/components/booking/WaitlistOffer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseServiceAddress } from '@/lib/booking/address'
import { buildPaymentData, buildQuoteBookingPayload } from '@/lib/booking/payment'
import { calculateBookingPrice } from '@/lib/booking/pricing'
import { priceBooking, type PromoRule } from '@/lib/booking/quote'
import { TIME_WINDOWS } from '@/lib/booking/timeWindows'
import {
  BOOKING_STEPS,
  REFERRAL_SOURCES,
  customerDetailsSchema,
  serviceSelectionSchema,
  splitFullName,
  type CustomerDetailsValues,
  type ServiceSelectionValues,
} from '@/lib/booking/schemas'
import { cn, formatCurrency, PRICING } from '@/lib/utils'

export type BookingInitialCustomer = {
  full_name: string
  email: string
  phone: string
  address: string
  /** Signed-in customer's saved social photo choice. */
  marketing_photo_consent?: boolean
}

type BookingFormProps = {
  initialCustomer?: BookingInitialCustomer | null
  referralCode?: string | null
  isLoggedIn?: boolean
  /** Active Storm Ready member booking another visit. */
  member?: { visitsUsed: number } | null
  /** Friend's invite code from /book?invite=CODE. */
  inviteCode?: string | null
  /** Signed-in customer's referral credit balance (cents). */
  credit?: number
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
  full_package: false,
  hardware_addons: [],
  membership: 'one_time',
}

function mapMembershipPlan(
  membership: ServiceSelectionValues['membership']
): BookingMembershipPlan {
  if (membership === 'one_time') {
    return 'none'
  }
  // Existing members: no new plan, but kits still get the member discount.
  if (membership === 'member') {
    return 'annual'
  }
  return membership
}

/** Loose check before asking the server whether an invite applies to this email. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  member = null,
  inviteCode = null,
  credit = 0,
}: BookingFormProps): React.ReactElement {
  const initialService: ServiceSelectionValues = { ...DEFAULT_SERVICE, membership: member ? 'member' : 'one_time' }
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [bookingId] = useState(() => crypto.randomUUID())
  const [quoteSubmitting, setQuoteSubmitting] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [serviceSelection, setServiceSelection] =
    useState<ServiceSelectionValues>(initialService)
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
    defaultValues: initialService,
    mode: 'onChange',
  })

  const defaultCustomerNames = splitFullName(initialCustomer?.full_name ?? '')
  const defaultAddress = parseServiceAddress(initialCustomer?.address)

  const customerForm = useForm<CustomerDetailsValues>({
    resolver: zodResolver(customerDetailsSchema),
    defaultValues: {
      first_name: defaultCustomerNames.first_name,
      last_name: defaultCustomerNames.last_name,
      email: initialCustomer?.email ?? '',
      phone: initialCustomer?.phone ?? '',
      address: defaultAddress.address,
      city: defaultAddress.city,
      state: defaultAddress.state,
      zip: defaultAddress.zip,
      preferred_date: '',
      notes: '',
      referral_source: defaultReferral || '',
      photo_consent: initialCustomer?.marketing_photo_consent ?? true,
    },
    mode: 'onTouched',
  })

  const {
    register,
    control,
    watch,
    trigger,
    setValue,
    formState: { errors: customerErrors, submitCount },
  } = customerForm

  const customerValues = watch()

  // Service area: out-of-area ZIPs get a waitlist offer instead of continuing (checkout re-checks).
  const [outOfArea, setOutOfArea] = useState<string | null>(null)
  async function inServiceArea(): Promise<boolean> {
    const zip = customerValues.zip?.trim() ?? ''
    try {
      const res = await fetch(`/api/service-area?zip=${encodeURIComponent(zip)}`)
      const json = (await res.json()) as { data?: { served: boolean } }
      if (json.data && !json.data.served) {
        setOutOfArea(zip)
        document.getElementById('zip')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return false
      }
    } catch {
      // Can't check right now: let them continue; checkout enforces the area.
    }
    setOutOfArea(null)
    return true
  }

  const bookingState = useMemo<BookingState>(() => {
    const basePricing = calculateBookingPrice({ ...serviceSelection }, member)

    return {
      shelterSize: serviceSelection.shelter_size,
      membershipPlan: mapMembershipPlan(serviceSelection.membership),
      serviceTotal: basePricing.serviceSubtotal ?? 0,
      kitSelection,
    }
  }, [serviceSelection, kitSelection, member])

  // Friend invite: checked against the email once it's entered (checkout re-checks).
  const [invite, setInvite] = useState<{ status: 'none' | 'checking' | 'valid' | 'invalid'; reason?: string }>(
    () => ({ status: inviteCode ? 'checking' : 'none' })
  )
  const bookingEmail = customerValues.email?.trim() ?? ''
  useEffect(() => {
    if (!inviteCode) return
    if (!EMAIL_PATTERN.test(bookingEmail)) {
      setInvite({ status: 'checking' })
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void fetch(`/api/referrals/validate?code=${encodeURIComponent(inviteCode)}&email=${encodeURIComponent(bookingEmail)}`, { signal: controller.signal })
        .then((r) => r.json() as Promise<{ data?: { valid: boolean; reason?: string } }>)
        .then((r) => setInvite(r.data?.valid ? { status: 'valid' } : { status: 'invalid', reason: r.data?.reason }))
        .catch(() => undefined)
    }, 400)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [inviteCode, bookingEmail])
  // Promo code (Payment step). Never stacked with a friend invite; checkout re-checks it.
  const [promo, setPromo] = useState<PromoRule | null>(null)
  const referral = useMemo(
    () => ({
      inviteCode: invite.status === 'valid' ? inviteCode : null,
      credit,
      promo: invite.status === 'valid' ? null : promo,
    }),
    [invite.status, inviteCode, credit, promo]
  )

  // Same function the server re-runs at checkout (src/lib/booking/quote.ts).
  const pricing = useMemo(
    () => priceBooking(serviceSelection, kitSelection, member, {
        friendDiscount: Boolean(referral.inviteCode),
        credit: referral.credit,
        promo: referral.promo,
      }).breakdown,
    [serviceSelection, kitSelection, member, referral]
  )

  const paymentData = useMemo(
    () => buildPaymentData(serviceSelection, customerValues, photoResult, kitSelection, member, referral),
    [serviceSelection, customerValues, photoResult, kitSelection, member, referral]
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
      if (!canProceedWithKit(kitSelection)) {
        return
      }
      setCurrentStep(3)
      return
    }

    if (currentStep === 3) {
      const valid = await trigger()
      if (!valid) {
        const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]')
        firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        firstInvalid?.focus()
        return
      }
      if (!(await inServiceArea())) return
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
    const customerValid = await trigger()
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
            member={member}
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
            includedBundle={serviceSelection.full_package ? PRICING.full_package_kit : null}
            onSelect={setKitSelection}
            onSkip={() => setCurrentStep(3)}
          />
        )

      case 3:
        return (
          <div className="space-y-4">
            {isLoggedIn ? (
              <p className="rounded-lg bg-sky-pale px-3 py-2 text-sm text-sky-dark">
                Signed in — your details were pre-filled from your account.
              </p>
            ) : null}

            {submitCount > 0 && Object.keys(customerErrors).length > 0 ? (
              <p className="rounded-lg border border-tornado/30 bg-tornado/5 px-4 py-3 text-sm text-tornado">
                Please fix the highlighted fields below to continue.
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  autoComplete="given-name"
                  className="h-10 bg-white"
                  aria-invalid={Boolean(customerErrors.first_name)}
                  {...register('first_name')}
                />
                {customerErrors.first_name ? (
                  <p className="text-sm text-tornado">{customerErrors.first_name.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  autoComplete="family-name"
                  className="h-10 bg-white"
                  aria-invalid={Boolean(customerErrors.last_name)}
                  {...register('last_name')}
                />
                {customerErrors.last_name ? (
                  <p className="text-sm text-tornado">{customerErrors.last_name.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="h-10 bg-white"
                  aria-invalid={Boolean(customerErrors.email)}
                  {...register('email')}
                />
                {customerErrors.email ? (
                  <p className="text-sm text-tornado">{customerErrors.email.message}</p>
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
                  aria-invalid={Boolean(customerErrors.phone)}
                  {...register('phone')}
                />
                {customerErrors.phone ? (
                  <p className="text-sm text-tornado">{customerErrors.phone.message}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  We&apos;ll text visit confirmations, reminders and &ldquo;on the way&rdquo; alerts. Msg &amp; data rates may apply. Reply STOP to opt out.
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Street address</Label>
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <AddressAutocomplete
                      id="address"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      invalid={Boolean(customerErrors.address)}
                      onPlace={(parts) => {
                        for (const key of ['city', 'state', 'zip'] as const) {
                          const value = parts[key]
                          if (value) setValue(key, value, { shouldValidate: true, shouldDirty: true })
                        }
                      }}
                    />
                  )}
                />
                {customerErrors.address ? (
                  <p className="text-sm text-tornado">{customerErrors.address.message}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-[1fr_90px_130px]">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    autoComplete="address-level2"
                    aria-invalid={Boolean(customerErrors.city)}
                    className={cn('h-10 bg-white', customerErrors.city && 'border-tornado')}
                    {...register('city')}
                  />
                  {customerErrors.city ? <p className="text-sm text-tornado">{customerErrors.city.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    autoComplete="address-level1"
                    maxLength={2}
                    aria-invalid={Boolean(customerErrors.state)}
                    className={cn('h-10 bg-white uppercase', customerErrors.state && 'border-tornado')}
                    {...register('state')}
                  />
                  {customerErrors.state ? <p className="text-sm text-tornado">{customerErrors.state.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP code</Label>
                  <Input
                    id="zip"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    maxLength={10}
                    aria-invalid={Boolean(customerErrors.zip)}
                    className={cn('h-10 bg-white', customerErrors.zip && 'border-tornado')}
                    {...register('zip')}
                  />
                  {customerErrors.zip ? <p className="text-sm text-tornado">{customerErrors.zip.message}</p> : null}
                </div>
              </div>
              {outOfArea && outOfArea === customerValues.zip?.trim() ? (
                <WaitlistOffer
                  zip={outOfArea}
                  name={`${customerValues.first_name ?? ''} ${customerValues.last_name ?? ''}`.trim()}
                  email={customerValues.email ?? ''}
                  phone={customerValues.phone ?? ''}
                  address={customerValues.address ?? ''}
                />
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="preferred_date">Preferred date</Label>
                <Input
                  id="preferred_date"
                  type="date"
                  min={minDate}
                  className="h-10 bg-white"
                  aria-invalid={Boolean(customerErrors.preferred_date)}
                  {...register('preferred_date')}
                />
                {customerErrors.preferred_date ? (
                  <p className="text-sm text-tornado">
                    {customerErrors.preferred_date.message}
                  </p>
                ) : null}
              </div>

              <fieldset className="space-y-2 sm:col-span-2">
                <legend className="text-sm font-medium leading-none">Arrival window</legend>
                <Controller
                  name="time_window"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-5">
                      {TIME_WINDOWS.map((w) => {
                        const selected = field.value === w.value
                        return (
                          <label
                            key={w.value}
                            className={cn(
                              'flex cursor-pointer flex-col rounded-lg border px-3 py-2 text-left transition-colors focus-within:ring-2 focus-within:ring-sky/40',
                              selected ? 'border-sky bg-sky-pale ring-1 ring-sky' : 'border-border bg-white hover:border-sky/50',
                              w.value === 'flexible' && 'col-span-2 sm:col-span-1'
                            )}
                          >
                            <input
                              type="radio"
                              name={field.name}
                              value={w.value}
                              checked={selected}
                              onChange={() => field.onChange(w.value)}
                              onBlur={field.onBlur}
                              className="sr-only"
                            />
                            <span className="text-sm font-semibold text-shelter">{w.label}</span>
                            <span className="text-xs text-muted-foreground">{w.hours}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Your Sweeper arrives within this window. Flexible bookings are the easiest to fill quickly.
                </p>
                {customerErrors.time_window ? (
                  <p className="text-sm text-tornado">{customerErrors.time_window.message}</p>
                ) : null}
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="referral_source">How did you hear about us?</Label>
                <select
                  id="referral_source"
                  className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-invalid={Boolean(customerErrors.referral_source)}
                  {...register('referral_source')}
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
                {customerErrors.referral_source ? (
                  <p className="text-sm text-tornado">
                    {customerErrors.referral_source.message}
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
                  {...register('notes')}
                />
                {customerErrors.notes ? (
                  <p className="text-sm text-tornado">{customerErrors.notes.message}</p>
                ) : null}
              </div>

              <label className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-[#F7F7F4] px-3 py-3 text-sm text-shelter sm:col-span-2">
                <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-sky" defaultChecked={initialCustomer?.marketing_photo_consent ?? true} {...register('photo_consent')} />
                <span>
                  Storm Sweep may share before &amp; after photos of my shelter on social media.
                  <span className="block text-xs text-muted-foreground">
                    Photos never show your name or street address. You can turn this off anytime in your account.
                  </span>
                </span>
              </label>
            </div>
          </div>
        )

      case 4:
        return <PhotoUpload bookingId={bookingId} onResult={setPhotoResult} />

      case 5:
        return paymentData ? (
          <div className="space-y-5">
            {paymentData.totalAmount > 0 || referral.promo ? (
              <PromoCodeField
                email={bookingEmail}
                withInvite={Boolean(referral.inviteCode)}
                applied={referral.promo}
                saved={-(pricing.lineItems.find((l) => l.label.startsWith('Promo code'))?.amount ?? 0)}
                onChange={setPromo}
              />
            ) : null}
            <PaymentStep booking={paymentData} />
          </div>
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
          </div>
        )

      default:
        return null
    }
  }

  const stepMeta = STEP_TITLES[currentStep]
  const isQuoteStep = currentStep === 5 && !paymentData
  const footerContinueDisabled =
    (currentStep === 2 && !canProceedWithKit(kitSelection)) ||
    (isQuoteStep && quoteSubmitting)

  function handleFooterContinue(): void {
    if (currentStep === 3) {
      void customerForm.handleSubmit(async () => {
        if (!(await inServiceArea())) return
        setCurrentStep(4)
      })()
      return
    }

    if (isQuoteStep) {
      void submitQuoteRequest()
      return
    }
    void goToNextStep()
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <BookingProgressNav currentStep={currentStep} />

      {inviteCode && invite.status !== 'none' ? (
        <p
          role="status"
          className={cn(
            'mb-4 rounded-lg px-4 py-3 text-sm',
            invite.status === 'invalid' ? 'bg-black/5 text-[#4A4A50]' : 'bg-[#27AE60]/10 text-[#1E7D46]'
          )}
        >
          {invite.status === 'valid'
            ? `🎉 Friend invite applied — ${formatCurrency(PRICING.referral.customer_credit)} off your first visit.`
            : invite.status === 'invalid'
              ? `${invite.reason ?? 'This invite can’t be used'} — no discount applied.`
              : `You were invited by a friend: ${formatCurrency(PRICING.referral.customer_credit)} off your first visit once you enter your email.`}
        </p>
      ) : null}
      {credit > 0 ? (
        <p role="status" className="mb-4 rounded-lg bg-wheat-pale px-4 py-3 text-sm text-shelter">
          Your {formatCurrency(credit)} referral credit is applied to this booking.
        </p>
      ) : null}

      <div className="rounded-xl border border-border/60 bg-white shadow-sm">
        {stepMeta ? (
          <div className="border-b border-border/60 px-6 py-6">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-shelter">
              {stepMeta.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{stepMeta.description}</p>
          </div>
        ) : null}

        <div className="space-y-6 px-6 py-6">
          {renderStep()}

          <BookingFooter
            currentStep={currentStep}
            totalSteps={BOOKING_STEPS.length}
            pricing={pricing}
            onBack={goToPreviousStep}
            onContinue={handleFooterContinue}
            continueLabel={
              isQuoteStep
                ? quoteSubmitting
                  ? 'Submitting…'
                  : 'Submit quote request'
                : 'Continue'
            }
            continueDisabled={footerContinueDisabled}
            showContinue={!(currentStep === 5 && paymentData)}
          />
        </div>
      </div>
    </div>
  )
}
