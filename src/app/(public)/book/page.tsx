import { Suspense } from 'react'

import { BookingForm, type BookingInitialCustomer } from '@/components/booking/BookingForm'
import { createClient } from '@/lib/supabase/server'

type BookPageProps = {
  searchParams: { ref?: string }
}

async function getInitialCustomer(): Promise<{
  customer: BookingInitialCustomer | null
  isLoggedIn: boolean
}> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { customer: null, isLoggedIn: false }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, address')
    .eq('id', user.id)
    .single()

  return {
    isLoggedIn: true,
    customer: {
      full_name: profile?.full_name ?? '',
      email: user.email ?? '',
      phone: profile?.phone ?? '',
      address: profile?.address ?? '',
    },
  }
}

async function BookPageContent({
  referralCode,
}: {
  referralCode?: string
}): Promise<React.ReactElement> {
  const { customer, isLoggedIn } = await getInitialCustomer()

  return (
    <BookingForm
      initialCustomer={customer}
      isLoggedIn={isLoggedIn}
      referralCode={referralCode ?? null}
    />
  )
}

export default async function BookPage({
  searchParams,
}: BookPageProps): Promise<React.ReactElement> {
  const referralCode = searchParams.ref?.trim()

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-[#F7F7F4] py-10 font-[family-name:var(--font-barlow)] text-shelter sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold uppercase tracking-widest text-sky-DEFAULT">
            Norman, OK
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-shelter sm:text-5xl">
            BOOK YOUR STORM SHELTER CLEAN
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Four quick steps to a clean, storm-ready shelter. Most bookings confirmed within minutes.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 text-center text-muted-foreground">
              Loading booking form…
            </div>
          }
        >
          <BookPageContent referralCode={referralCode} />
        </Suspense>
      </div>
    </section>
  )
}
