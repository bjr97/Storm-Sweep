import {
  PREP_KIT_BUNDLES,
  PREP_KIT_ITEMS,
  PRICING,
  roundCents,
  type PrepKitBundleId,
  type PrepKitItemId,
} from '@/lib/utils'

export interface KitSelection {
  selectedBundle: PrepKitBundleId | null
  aLaCarteItems: PrepKitItemId[]
  ageSelector: 'infant' | 'toddler' | 'big_kid' | null
  petSizeSelector: 'small_breed' | 'large_breed' | 'cat' | null
  /** Amount charged for the kit after credits, in cents. */
  kitTotal: number
}

export type KitMembershipPlan = 'none' | 'annual' | 'monthly' | 'annual_2yr'

export type KitPricingOptions = {
  membershipPlan: KitMembershipPlan
  /** Bundle already paid for by the Full Package — its price is credited. */
  includedBundle: PrepKitBundleId | null
}

export type KitLineItem = { label: string; amount: number }

export function getPrepKitBundle(id: PrepKitBundleId): (typeof PREP_KIT_BUNDLES)[number] {
  const bundle = PREP_KIT_BUNDLES.find((b) => b.id === id)
  if (!bundle) throw new Error(`Unknown prep kit bundle: ${id}`)
  return bundle
}

function includesShelterReady(
  selection: Pick<KitSelection, 'selectedBundle' | 'aLaCarteItems'>
): boolean {
  if (selection.selectedBundle) {
    return (getPrepKitBundle(selection.selectedBundle).includes as readonly string[]).includes(
      'shelter_ready'
    )
  }
  return selection.aLaCarteItems.includes('shelter_ready')
}

/**
 * Prices a kit selection in cents. The returned lines always sum to `total`:
 * list prices first, then any credits as negative lines (never below $0).
 */
export function priceKitSelection(
  selection: Pick<KitSelection, 'selectedBundle' | 'aLaCarteItems'>,
  options: KitPricingOptions
): { lines: KitLineItem[]; total: number } {
  const lines: KitLineItem[] = []

  if (selection.selectedBundle) {
    const bundle = getPrepKitBundle(selection.selectedBundle)
    lines.push({ label: bundle.name, amount: bundle.price })
  } else {
    for (const itemId of selection.aLaCarteItems) {
      const item = PREP_KIT_ITEMS.find((i) => i.id === itemId)
      if (item) lines.push({ label: item.name, amount: item.price })
    }
  }

  let remaining = lines.reduce((sum, line) => sum + line.amount, 0)
  if (remaining === 0) {
    return { lines: [], total: 0 }
  }

  if (options.membershipPlan === 'annual_2yr' && includesShelterReady(selection)) {
    const credit = Math.min(PRICING.kits.shelter_ready, remaining)
    lines.push({ label: '2yr Member Kit Credit', amount: -credit })
    remaining -= credit
  }

  if (options.includedBundle && remaining > 0) {
    const included = getPrepKitBundle(options.includedBundle)
    const credit = Math.min(included.price, remaining)
    lines.push({ label: `${included.name} included with Full Package`, amount: -credit })
    remaining -= credit
  }

  if (options.membershipPlan !== 'none' && remaining > 0) {
    const discount = roundCents(remaining * PRICING.member_upgrade_discount_pct)
    lines.push({ label: 'Storm Ready member discount (10% off kit)', amount: -discount })
    remaining -= discount
  }

  return { lines, total: remaining }
}
