import type { PhotoScreenResult } from '@/components/booking/PhotoUpload'
import type { KitSelection } from '@/components/booking/KitSelector'
import type { BookingPayload, BookingPaymentData } from '@/lib/bookings/types'
import { getHardwareAddon } from '@/lib/booking/addons'
import { formatServiceAddress } from '@/lib/booking/address'
import { windowStartIso } from '@/lib/booking/timeWindows'
import {
  formatCustomerFullName,
  type CustomerDetailsValues,
  type ServiceSelectionValues,
} from '@/lib/booking/schemas'
import { getPrepKitBundle, priceKitSelection } from '@/lib/booking/prepKits'
import { calculateBookingPrice, type BookingPriceBreakdown } from '@/lib/booking/pricing'
import { formatCurrency, PRICING } from '@/lib/utils'

/**
 * List value of what's being delivered — the same services priced as a
 * one-time visit (no membership coverage or member discounts). Sweeper pay
 * is calculated on this so member visits pay the same as paid ones.
 */
function calculateServiceValue(
  serviceSelection: ServiceSelectionValues,
  kitSelection: KitSelection | null
): number {
  const base = calculateBookingPrice({ ...serviceSelection, membership: 'one_time' }).total ?? 0
  const kit = kitSelection
    ? priceKitSelection(kitSelection, {
        membershipPlan: 'none',
        includedBundle: serviceSelection.full_package ? PRICING.full_package_kit : null,
      }).total
    : 0
  return base + kit
}

function kitServiceTypeLabel(kitSelection: KitSelection | null): string | null {
  if (!kitSelection || kitSelection.kitTotal <= 0) {
    return null
  }
  if (kitSelection.selectedBundle) {
    return `Prep Kit — ${getPrepKitBundle(kitSelection.selectedBundle).name}`
  }
  if (kitSelection.aLaCarteItems.length > 0) {
    return 'Prep Kit — Custom'
  }
  return null
}

export function buildPaymentData(
  serviceSelection: ServiceSelectionValues,
  customerValues: CustomerDetailsValues,
  pricing: BookingPriceBreakdown,
  photoResult: PhotoScreenResult | null,
  kitSelection: KitSelection | null = null
): BookingPaymentData | null {
  if (pricing.total === null || pricing.deposit === null) {
    return null
  }

  const referralSource = customerValues.referral_source.startsWith('partner:')
    ? customerValues.referral_source.replace('partner:', '')
    : customerValues.referral_source

  const serviceTypes: string[] = []

  if (serviceSelection.full_package) {
    serviceTypes.push('Full Package')
  } else {
    if (serviceSelection.deep_clean) {
      serviceTypes.push('Deep Clean')
    }
    if (serviceSelection.led_package) {
      serviceTypes.push('LED Package')
    }
  }
  for (const id of serviceSelection.hardware_addons) {
    serviceTypes.push(getHardwareAddon(id).name)
  }

  const kitLabel = kitServiceTypeLabel(kitSelection)
  if (kitLabel) {
    serviceTypes.push(kitLabel)
  }

  return {
    items: pricing.lineItems
      .filter((item) => item.amount !== null)
      .map((item) => ({
        name: item.label,
        price: item.amount as number,
        quantity: 1,
      })),
    totalAmount: pricing.total,
    depositAmount: pricing.deposit,
    serviceValue: calculateServiceValue(serviceSelection, kitSelection),
    membershipVisit: pricing.isMemberVisit,
    customerName: formatCustomerFullName(customerValues),
    customerEmail: customerValues.email,
    customerPhone: customerValues.phone,
    address: formatServiceAddress(customerValues),
    scheduledAt: customerValues.preferred_date
      ? windowStartIso(customerValues.preferred_date, customerValues.time_window)
      : null,
    timeWindow: customerValues.time_window,
    shelterSize: serviceSelection.shelter_size,
    serviceTypes,
    notes: customerValues.notes,
    referralSource,
    membershipPlan:
      serviceSelection.membership === 'one_time' || serviceSelection.membership === 'member'
        ? 'none'
        : serviceSelection.membership,
    photoGrade: photoResult?.grade,
    photoUrls: photoResult?.storage_path ? [photoResult.storage_path] : [],
    photoFlags: photoResult?.flags ?? [],
  }
}

/** Payload for X-Large / custom-quote bookings (no online payment). */
export function buildQuoteBookingPayload(
  serviceSelection: ServiceSelectionValues,
  customerValues: CustomerDetailsValues,
  photoResult: PhotoScreenResult | null,
  kitSelection: KitSelection | null = null
): BookingPayload {
  const referralSource = customerValues.referral_source.startsWith('partner:')
    ? customerValues.referral_source.replace('partner:', '')
    : customerValues.referral_source

  const quoteNote = 'X-Large shelter — custom quote requested. Team will contact customer to confirm pricing.'
  const kitNote =
    kitSelection && kitSelection.kitTotal > 0
      ? `Prep kit interest: ${kitServiceTypeLabel(kitSelection) ?? 'Custom kit'} (${formatCurrency(kitSelection.kitTotal)})`
      : null
  const notes = [customerValues.notes, kitNote, quoteNote].filter(Boolean).join('\n\n')

  const quoteServiceTypes = [
    'Custom quote — X-Large shelter',
    ...serviceSelection.hardware_addons.map((id) => `${getHardwareAddon(id).name} (quote)`),
  ]
  const kitLabel = kitServiceTypeLabel(kitSelection)
  if (kitLabel) {
    quoteServiceTypes.push(kitLabel)
  }

  return {
    customerName: formatCustomerFullName(customerValues),
    customerEmail: customerValues.email,
    customerPhone: customerValues.phone,
    address: formatServiceAddress(customerValues),
    scheduledAt: customerValues.preferred_date
      ? windowStartIso(customerValues.preferred_date, customerValues.time_window)
      : null,
    timeWindow: customerValues.time_window,
    shelterSize: serviceSelection.shelter_size,
    serviceTypes: quoteServiceTypes,
    notes,
    referralSource,
    totalAmount: 0, // quoted later by admin
    membershipVisit: false,
    membershipPlan: 'none',
    photoGrade: photoResult?.grade,
    photoUrls: photoResult?.storage_path ? [photoResult.storage_path] : [],
    photoFlags: photoResult?.flags ?? [],
  }
}
