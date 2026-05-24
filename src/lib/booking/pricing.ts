import type { ServiceSelectionValues } from '@/lib/booking/schemas'
import { PRICING, SUPPLY_KITS, formatCurrency } from '@/lib/utils'
import type { ShelterSize } from '@/types/database'

export type BookingPriceBreakdown = {
  shelterPrice: number | null
  addonsPrice: number
  serviceSubtotal: number | null
  membershipPrice: number
  total: number | null
  deposit: number | null
  isQuoteRequired: boolean
  lineItems: { label: string; amount: number | null }[]
}

const SUPPLY_KIT_PRICES = {
  none: 0,
  starter: PRICING.addons.supply_kit_starter,
  essential: PRICING.addons.supply_kit_essential,
  family: PRICING.addons.supply_kit_family,
  pro: PRICING.addons.supply_kit_pro,
  elite: PRICING.addons.supply_kit_elite,
} as const

function getShelterPrice(size: ShelterSize): number | null {
  return PRICING.shelter[size]
}

export function calculateBookingPrice(
  selection: ServiceSelectionValues
): BookingPriceBreakdown {
  const shelterPrice = getShelterPrice(selection.shelter_size)
  const isQuoteRequired =
    selection.shelter_size === 'xlarge' || shelterPrice === null

  if (isQuoteRequired) {
    return {
      shelterPrice: null,
      addonsPrice: 0,
      serviceSubtotal: null,
      membershipPrice: 0,
      total: null,
      deposit: null,
      isQuoteRequired: true,
      lineItems: [{ label: 'Custom quote required', amount: null }],
    }
  }

  const lineItems: { label: string; amount: number | null }[] = [
    {
      label: `Deep Clean (${selection.shelter_size})`,
      amount: shelterPrice,
    },
  ]

  let serviceSubtotal = shelterPrice

  if (selection.full_package) {
    const standardBase = PRICING.shelter.standard
    const sizeAdjustment = shelterPrice - standardBase
    serviceSubtotal = PRICING.bundles.full_package + sizeAdjustment

    lineItems[0] = {
      label: 'Full Package (clean + LED + Essential kit)',
      amount: serviceSubtotal,
    }
  } else {
    if (selection.led_package) {
      lineItems.push({
        label: 'LED Package',
        amount: PRICING.addons.led_package,
      })
      serviceSubtotal += PRICING.addons.led_package
    }

    if (selection.supply_kit !== 'none') {
      const kitPrice = SUPPLY_KIT_PRICES[selection.supply_kit]
      const kitName = SUPPLY_KITS[selection.supply_kit].name
      lineItems.push({
        label: `Supply Kit — ${kitName}`,
        amount: kitPrice,
      })
      serviceSubtotal += kitPrice
    }
  }

  const membershipPrice =
    selection.membership === 'annual'
      ? PRICING.membership.annual
      : selection.membership === 'monthly'
        ? PRICING.membership.monthly
        : 0

  if (membershipPrice > 0) {
    lineItems.push({
      label:
        selection.membership === 'annual'
          ? 'Storm Ready Annual membership'
          : 'Storm Ready Monthly membership',
      amount: membershipPrice,
    })
  }

  const total = serviceSubtotal + membershipPrice
  const deposit = Math.round(total * PRICING.deposit_pct)

  return {
    shelterPrice,
    addonsPrice: serviceSubtotal - shelterPrice,
    serviceSubtotal,
    membershipPrice,
    total,
    deposit,
    isQuoteRequired: false,
    lineItems,
  }
}

export function formatPriceDisplay(amount: number | null): string {
  if (amount === null) {
    return 'Quote'
  }
  return formatCurrency(amount)
}
