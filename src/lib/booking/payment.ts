import type { PhotoScreenResult } from '@/components/booking/PhotoUpload'
import type { KitSelection } from '@/components/booking/KitSelector'
import type { BookingPayload, BookingPaymentData } from '@/lib/bookings/types'
import type {
  CustomerDetailsValues,
  ServiceSelectionValues,
} from '@/lib/booking/schemas'
import type { BookingPriceBreakdown } from '@/lib/booking/pricing'
import { SUPPLY_KITS } from '@/lib/utils'

const KIT_BUNDLE_LABELS: Record<NonNullable<KitSelection['selectedBundle']>, string> = {
  storm_starter: 'Storm Starter',
  family_ready: 'Family Ready',
  pet_ready: 'Pet Ready',
  full_house: 'Full House',
}

function kitServiceTypeLabel(kitSelection: KitSelection | null): string | null {
  if (!kitSelection || kitSelection.kitTotal <= 0) {
    return null
  }
  if (kitSelection.selectedBundle) {
    return `Prep Kit — ${KIT_BUNDLE_LABELS[kitSelection.selectedBundle]}`
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
    if (serviceSelection.supply_kit !== 'none') {
      serviceTypes.push(
        `Supply Kit — ${SUPPLY_KITS[serviceSelection.supply_kit].name}`
      )
    }
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
    customerName: customerValues.full_name,
    customerEmail: customerValues.email,
    customerPhone: customerValues.phone,
    address: customerValues.address,
    scheduledAt: customerValues.preferred_date
      ? new Date(`${customerValues.preferred_date}T12:00:00`).toISOString()
      : null,
    shelterSize: serviceSelection.shelter_size,
    serviceTypes,
    notes: customerValues.notes,
    referralSource,
    membershipPlan:
      serviceSelection.membership === 'one_time'
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
      ? `Prep kit interest: ${kitServiceTypeLabel(kitSelection) ?? 'Custom kit'} ($${kitSelection.kitTotal})`
      : null
  const notes = [customerValues.notes, kitNote, quoteNote].filter(Boolean).join('\n\n')

  const quoteServiceTypes = ['Custom quote — X-Large shelter']
  const kitLabel = kitServiceTypeLabel(kitSelection)
  if (kitLabel) {
    quoteServiceTypes.push(kitLabel)
  }

  return {
    customerName: customerValues.full_name,
    customerEmail: customerValues.email,
    customerPhone: customerValues.phone,
    address: customerValues.address,
    scheduledAt: customerValues.preferred_date
      ? new Date(`${customerValues.preferred_date}T12:00:00`).toISOString()
      : null,
    shelterSize: serviceSelection.shelter_size,
    serviceTypes: quoteServiceTypes,
    notes,
    referralSource,
    totalAmount: 1,
    membershipPlan: 'none',
    photoGrade: photoResult?.grade,
    photoUrls: photoResult?.storage_path ? [photoResult.storage_path] : [],
    photoFlags: photoResult?.flags ?? [],
  }
}
