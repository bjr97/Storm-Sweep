import type { Metadata } from 'next'
import { Suspense } from 'react'

import { BookingForm, type BookingInitialCustomer } from '@/components/booking/BookingForm'
import { createClient } from '@/lib/supabase/server'

type BookPageProps = {
  searchParams: { ref?: string; invite?: string }
}

async function getInitialCustomer(): Promise<{
  customer: BookingInitialCustomer | null
  isLoggedIn: boolean
  member: { visitsUsed: number } | null
  credit: number
}> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { customer: null, isLoggedIn: false, member: null, credit: 0 }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, address, membership_status, visits_used, referral_credit, marketing_photo_consent')
    .eq('id', user.id)
    .single()

  return {
    isLoggedIn: true,
    credit: Math.max(0, profile?.referral_credit ?? 0),
    member: profile?.membership_status === 'active' ? { visitsUsed: profile.visits_used } : null,
    customer: {
      full_name: profile?.full_name ?? '',
      email: user.email ?? '',
      phone: profile?.phone ?? '',
      address: profile?.address ?? '',
      marketing_photo_consent: profile?.marketing_photo_consent ?? true,
    },
  }
}

async function BookPageContent({
  referralCode,
  inviteCode,
}: {
  referralCode?: string
  inviteCode?: string
}): Promise<React.ReactElement> {
  const { customer, isLoggedIn, member, credit } = await getInitialCustomer()

  return (
    <BookingForm
      initialCustomer={customer}
      isLoggedIn={isLoggedIn}
      member={member}
      referralCode={referralCode ?? null}
      inviteCode={inviteCode ?? null}
      credit={credit}
    />
  )
}

export const metadata: Metadata = {
  title: 'Book a Storm Shelter Cleaning',
  description:
    'Pick your shelter size, services and an arrival window in six quick steps. Norman, OK.',
  alternates: { canonical: '/book' },
}

export default async function BookPage({
  searchParams,
}: BookPageProps): Promise<React.ReactElement> {
  const referralCode = searchParams.ref?.trim()
  // Friend invite (customer referral) — distinct from ?ref= partner codes.
  const inviteCode = searchParams.invite?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24) || undefined

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-[#F7F7F4] py-10 font-body text-shelter sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="font-body text-sm font-semibold uppercase tracking-widest text-[var(--color-primary)]">
            Norman, OK
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-wide text-shelter sm:text-5xl">
            BOOK YOUR STORM SHELTER CLEAN
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Six quick steps to a clean, storm-ready shelter. We review every booking and confirm your visit.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 text-center text-muted-foreground">
              Loading booking form…
            </div>
          }
        >
          <BookPageContent referralCode={referralCode} inviteCode={inviteCode} />
        </Suspense>
      </div>
    </section>
  )
}
