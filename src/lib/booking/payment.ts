import type { PhotoScreenResult } from '@/components/booking/PhotoUpload'
import type { KitSelection } from '@/components/booking/KitSelector'
import type { BookingPayload, BookingPaymentData, BookingSelection } from '@/lib/bookings/types'
import { formatServiceAddress } from '@/lib/booking/address'
import { getPrepKitBundle } from '@/lib/booking/prepKits'
import { priceBooking, type PromoRule } from '@/lib/booking/quote'
import { windowStartIso } from '@/lib/booking/timeWindows'
import {
  formatCustomerFullName,
  type CustomerDetailsValues,
  type ServiceSelectionValues,
} from '@/lib/booking/schemas'
import { calculateDeposit, formatCurrency } from '@/lib/utils'

/**
 * Builds the booking sent to checkout. Prices shown here come from
 * priceBooking() — the same function the server re-runs on every checkout,
 * which ignores these amounts and charges only what it computes itself.
 */

function selectionOf(service: ServiceSelectionValues, kit: KitSelection | null): BookingSelection {
  return {
    service,
    kit: kit ? { selectedBundle: kit.selectedBundle, aLaCarteItems: kit.aLaCarteItems } : null,
  }
}

function customerFields(
  customerValues: CustomerDetailsValues,
  photoResult: PhotoScreenResult | null
): Pick<
  BookingPayload,
  'customerName' | 'customerEmail' | 'customerPhone' | 'address' | 'scheduledAt' | 'timeWindow' | 'referralSource' | 'photoGrade' | 'photoUrls' | 'photoFlags'
> {
  return {
    customerName: formatCustomerFullName(customerValues),
    customerEmail: customerValues.email,
    customerPhone: customerValues.phone,
    address: formatServiceAddress(customerValues),
    scheduledAt: customerValues.preferred_date
      ? windowStartIso(customerValues.preferred_date, customerValues.time_window)
      : null,
    timeWindow: customerValues.time_window,
    referralSource: customerValues.referral_source.startsWith('partner:')
      ? customerValues.referral_source.replace('partner:', '')
      : customerValues.referral_source,
    photoGrade: photoResult?.grade,
    photoUrls: photoResult?.storage_path ? [photoResult.storage_path] : [],
    photoFlags: photoResult?.flags ?? [],
  }
}

export function buildPaymentData(
  serviceSelection: ServiceSelectionValues,
  customerValues: CustomerDetailsValues,
  photoResult: PhotoScreenResult | null,
  kitSelection: KitSelection | null = null,
  member: { visitsUsed: number } | null = null,
  referral: { inviteCode: string | null; credit: number; promo?: PromoRule | null } = { inviteCode: null, credit: 0 }
): BookingPaymentData | null {
  // The server re-verifies the invite and credit; these only mirror its math.
  const quote = priceBooking(serviceSelection, kitSelection, member, {
    friendDiscount: Boolean(referral.inviteCode),
    credit: referral.credit,
    promo: referral.promo ?? null,
  })
  if (quote.breakdown.total === null) return null

  return {
    ...customerFields(customerValues, photoResult),
    items: quote.items,
    totalAmount: quote.breakdown.total,
    depositAmount: calculateDeposit(quote.breakdown.total),
    serviceValue: quote.serviceValue,
    membershipVisit: quote.membershipVisit,
    shelterSize: serviceSelection.shelter_size,
    serviceTypes: quote.serviceTypes,
    notes: customerValues.notes,
    membershipPlan: quote.membershipPlan,
    selection: {
      ...selectionOf(serviceSelection, kitSelection),
      ...(referral.inviteCode ? { inviteCode: referral.inviteCode } : {}),
      ...(referral.credit > 0 ? { useCredit: true } : {}),
      ...(referral.promo ? { promoCode: referral.promo.code } : {}),
    },
  }
}

/** Payload for X-Large / custom-quote bookings (no online payment). */
export function buildQuoteBookingPayload(
  serviceSelection: ServiceSelectionValues,
  customerValues: CustomerDetailsValues,
  photoResult: PhotoScreenResult | null,
  kitSelection: KitSelection | null = null
): BookingPayload {
  const quote = priceBooking(serviceSelection, kitSelection)
  const kitNote =
    quote.kitTotal > 0 && kitSelection
      ? `Prep kit interest: ${kitSelection.selectedBundle ? getPrepKitBundle(kitSelection.selectedBundle).name : 'Custom kit'} (${formatCurrency(quote.kitTotal)})`
      : null
  const quoteNote = 'X-Large shelter — custom quote requested. Team will contact customer to confirm pricing.'

  return {
    ...customerFields(customerValues, photoResult),
    shelterSize: serviceSelection.shelter_size,
    serviceTypes: quote.serviceTypes,
    notes: [customerValues.notes, kitNote, quoteNote].filter(Boolean).join('\n\n'),
    totalAmount: 0, // quoted later by admin
    membershipVisit: false,
    membershipPlan: 'none',
    selection: selectionOf(serviceSelection, kitSelection),
  }
}
