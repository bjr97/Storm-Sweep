import { calculateDeposit } from '@/lib/utils'
import { priceBooking } from '@/lib/booking/quote'
import { checkInvite, getCreditBalance } from '@/lib/customer/referrals'
import type { BookingItem, BookingPayload } from '@/lib/bookings/types'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Server-side pricing for every checkout. Recomputes the total, deposit,
 * line items, service value, service list and membership flags from the
 * customer's *selection* — amounts sent by the browser are discarded.
 *
 * "Existing member" pricing (included clean) requires the request to be
 * signed in as that member, with the booking under their own email.
 */

export type RepricedBooking = { payload: BookingPayload; items: BookingItem[]; depositAmount: number }
export type RepriceError = { error: string; code: string; status: number }

export async function repriceBooking(input: BookingPayload): Promise<RepricedBooking | RepriceError> {
  const selection = input.selection
  if (!selection) {
    return { error: 'Booking is missing its service selection — please refresh and try again', code: 'SELECTION_REQUIRED', status: 400 }
  }
  const service = selection.service

  let member: { visitsUsed: number } | null = null
  if (service.membership === 'member') {
    const {
      data: { user },
    } = await createClient().auth.getUser()
    if (!user || user.email?.toLowerCase() !== input.customerEmail.toLowerCase()) {
      return { error: 'Sign in to your Storm Ready account to use your included visit', code: 'MEMBER_SIGN_IN', status: 403 }
    }
    const { data: profile, error } = await createServiceClient()
      .from('profiles')
      .select('membership_status, visits_used')
      .eq('id', user.id)
      .maybeSingle()
    if (error) throw error
    if (profile?.membership_status !== 'active') {
      return { error: 'We couldn’t find an active Storm Ready membership on your account', code: 'NOT_A_MEMBER', status: 403 }
    }
    member = { visitsUsed: profile.visits_used }
  }

  // Friend invite: only a first-time customer, never their own code.
  let referredBy: string | undefined
  if (selection.inviteCode) {
    const invite = await checkInvite(selection.inviteCode, input.customerEmail)
    if (!invite.valid) return { error: invite.reason, code: 'INVITE_INVALID', status: 409 }
    referredBy = invite.referrerId
  }

  // Referral credit: only the signed-in customer's own balance, on their own booking.
  let credit = 0
  if (selection.useCredit) {
    const {
      data: { user },
    } = await createClient().auth.getUser()
    if (user && user.email?.toLowerCase() === input.customerEmail.toLowerCase()) {
      credit = await getCreditBalance(user.id)
    }
  }

  const quote = priceBooking(service, selection.kit, member, { friendDiscount: Boolean(referredBy), credit })
  const total = quote.breakdown.total ?? 0 // X-Large: quoted later by the office

  const payload: BookingPayload = {
    ...input,
    shelterSize: service.shelter_size,
    serviceTypes: quote.serviceTypes,
    totalAmount: total,
    serviceValue: quote.breakdown.isQuoteRequired ? undefined : quote.serviceValue,
    membershipVisit: quote.membershipVisit,
    membershipPlan: quote.membershipPlan,
    // Server-owned fields — whatever the browser sent is replaced here.
    referredBy: quote.referralDiscount > 0 ? referredBy : undefined,
    referralDiscount: quote.referralDiscount,
    creditApplied: quote.creditApplied,
  }
  return { payload, items: quote.items, depositAmount: calculateDeposit(total) }
}

export function isRepriceError(v: RepricedBooking | RepriceError): v is RepriceError {
  return 'error' in v
}
