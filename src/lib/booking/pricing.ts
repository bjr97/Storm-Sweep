import { getHardwareAddon, hardwareAddonPrice } from '@/lib/booking/addons'
import type { ServiceSelectionValues } from '@/lib/booking/schemas'
import {
  PRICING,
  PREP_KIT_BUNDLES,
  calculateDeposit,
  formatCurrency,
  roundCents,
} from '@/lib/utils'
import type { ShelterSize } from '@/types/database'

/**
 * All amounts are integer cents.
 *
 * `total` is what the customer pays for THIS VISIT (deposit + balance). The
 * Storm Ready membership is NOT part of it — Stripe bills that separately as
 * a subscription — so it is reported in `membershipPrice` only.
 */
export type BookingPriceBreakdown = {
  shelterPrice: number | null
  addonsPrice: number
  serviceSubtotal: number | null
  membershipPrice: number
  membershipLabel: string | null
  /** Clean is covered by the membership (visit 1 of 2). */
  isMemberVisit: boolean
  total: number | null
  deposit: number | null
  isQuoteRequired: boolean
  lineItems: { label: string; amount: number | null }[]
}

const FULL_PACKAGE_KIT_NAME =
  PREP_KIT_BUNDLES.find((bundle) => bundle.id === PRICING.full_package_kit)?.name ?? 'prep kit'

function getShelterPrice(size: ShelterSize): number | null {
  return PRICING.shelter[size]
}

/** 10% Storm Ready discount on an upgrade amount, as a negative cents value. */
export function memberUpgradeDiscount(upgradeAmount: number): number {
  return -roundCents(upgradeAmount * PRICING.member_upgrade_discount_pct)
}

function membershipDetails(
  membership: ServiceSelectionValues['membership']
): { price: number; label: string | null } {
  if (membership === 'annual') {
    return { price: PRICING.membership.annual, label: 'Storm Ready Annual' }
  }
  if (membership === 'monthly') {
    return { price: PRICING.membership.monthly, label: 'Storm Ready Monthly' }
  }
  return { price: 0, label: null }
}

export function calculateBookingPrice(
  selection: ServiceSelectionValues
): BookingPriceBreakdown {
  const shelterPrice = getShelterPrice(selection.shelter_size)
  const membership = membershipDetails(selection.membership)
  const isMember = membership.price > 0
  const isQuoteRequired =
    selection.shelter_size === 'xlarge' || shelterPrice === null

  if (isQuoteRequired) {
    return {
      shelterPrice: null,
      addonsPrice: 0,
      serviceSubtotal: null,
      membershipPrice: membership.price,
      membershipLabel: membership.label,
      isMemberVisit: false,
      total: null,
      deposit: null,
      isQuoteRequired: true,
      lineItems: [{ label: 'Custom quote required', amount: null }],
    }
  }

  const coveredCleanPrice = PRICING.shelter[PRICING.membership.covered_shelter_size]
  // Full Package price minus the standard clean it includes = LED + kit portion.
  const fullPackageUpgrades = PRICING.bundles.full_package - PRICING.shelter.standard
  const lineItems: { label: string; amount: number | null }[] = []
  let cleanCharge: number
  let upgrades = 0

  if (isMember) {
    // Membership covers the clean up to standard size; larger pays the difference.
    const sizeDifference = Math.max(0, shelterPrice - coveredCleanPrice)
    lineItems.push({
      label: `Deep Clean (${selection.shelter_size}) — Storm Ready visit 1 of ${PRICING.membership.visits_per_year}`,
      amount: 0,
    })
    if (sizeDifference > 0) {
      lineItems.push({
        label: `${selection.shelter_size[0].toUpperCase()}${selection.shelter_size.slice(1)} shelter (above membership coverage)`,
        amount: sizeDifference,
      })
    }
    cleanCharge = sizeDifference
  } else if (selection.full_package) {
    // Non-member Full Package is one bundled line, size-adjusted.
    cleanCharge = shelterPrice
  } else {
    lineItems.push({ label: `Deep Clean (${selection.shelter_size})`, amount: shelterPrice })
    cleanCharge = shelterPrice
  }

  if (selection.full_package) {
    upgrades = fullPackageUpgrades
    if (isMember) {
      lineItems.push({
        label: `Full Package upgrades (LED + ${FULL_PACKAGE_KIT_NAME} kit)`,
        amount: upgrades,
      })
    } else {
      lineItems.push({
        label: `Full Package (clean + LED + ${FULL_PACKAGE_KIT_NAME} kit)`,
        amount: cleanCharge + upgrades,
      })
    }
  } else if (selection.led_package) {
    upgrades = PRICING.addons.led_package
    lineItems.push({ label: 'LED Package', amount: upgrades })
  }

  for (const id of selection.hardware_addons) {
    const price = hardwareAddonPrice(id, selection.shelter_size)
    if (price === null) continue // only X-Large flooring, which is already a quote booking
    upgrades += price
    lineItems.push({ label: getHardwareAddon(id).name, amount: price })
  }

  let upgradeDiscount = 0
  if (isMember && upgrades > 0) {
    upgradeDiscount = memberUpgradeDiscount(upgrades)
    lineItems.push({ label: 'Storm Ready member discount (10% off upgrades)', amount: upgradeDiscount })
  }

  const total = cleanCharge + upgrades + upgradeDiscount

  return {
    shelterPrice,
    addonsPrice: upgrades + upgradeDiscount,
    serviceSubtotal: total,
    membershipPrice: membership.price,
    membershipLabel: membership.label,
    isMemberVisit: isMember,
    total,
    deposit: calculateDeposit(total),
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
