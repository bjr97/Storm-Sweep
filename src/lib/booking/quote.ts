import { getHardwareAddon } from '@/lib/booking/addons'
import { getPrepKitBundle, priceKitSelection, type KitMembershipPlan, type KitSelection } from '@/lib/booking/prepKits'
import { calculateBookingPrice, type BookingPriceBreakdown } from '@/lib/booking/pricing'
import type { ServiceSelectionValues } from '@/lib/booking/schemas'
import { calculateDeposit, PRICING } from '@/lib/utils'
import type { PromoKind } from '@/types/database'

/**
 * THE booking price. Pure — the browser uses it to show totals and the server
 * re-runs it on every checkout, so a price edited in the browser is never
 * charged (the server ignores client-sent amounts). All amounts in cents.
 */

export type KitChoice = Pick<KitSelection, 'selectedBundle' | 'aLaCarteItems'>

export type BookingQuote = {
  /** Visit price incl. kit, with line items; total/deposit null for X-Large quotes. */
  breakdown: BookingPriceBreakdown
  items: { name: string; price: number; quantity: number }[]
  kitTotal: number
  /** List value (no membership coverage/discounts) — basis for Sweeper pay. */
  serviceValue: number
  serviceTypes: string[]
  membershipVisit: boolean
  /** New subscription to start at checkout ('none' for one-time or existing members). */
  membershipPlan: 'none' | 'annual' | 'monthly'
  /** Friend-invite discount applied (cents, >= 0). */
  referralDiscount: number
  /** Booker's own referral credit spent (cents, >= 0). */
  creditApplied: number
  /** Promo code discount applied (cents, >= 0). */
  promoDiscount: number
}

/** A promo code's rule (verified server-side before it reaches priceBooking). */
export type PromoRule = { code: string; kind: PromoKind; value: number }

/** A promo always leaves at least this much to pay (online checkout can't charge $0). */
export const PROMO_MIN_TOTAL = 100

/** Cents off a total: amount = flat cents, percent = rounded to a whole cent; never below PROMO_MIN_TOTAL. */
export function promoDiscountFor(rule: PromoRule, total: number): number {
  const raw = rule.kind === 'percent' ? Math.round((total * Math.min(rule.value, 100)) / 100) : rule.value
  return Math.max(0, Math.min(raw, total - PROMO_MIN_TOTAL))
}

/** Referral extras — verified server-side before they reach priceBooking. */
export type QuoteExtras = {
  /** First-time customer invited by a friend: $25 off this visit. */
  friendDiscount?: boolean
  /** Referral credit available to spend (cents). */
  credit?: number
  /** Promo code (never combined with a friend invite). */
  promo?: PromoRule | null
}

/** Kit discount plan: existing members get the member kit discount without buying a plan. */
export function kitPlanFor(membership: ServiceSelectionValues['membership']): KitMembershipPlan {
  if (membership === 'one_time') return 'none'
  if (membership === 'member') return 'annual'
  return membership
}

function kitLabel(kit: KitChoice | null, kitTotal: number): string | null {
  if (!kit || kitTotal <= 0) return null
  if (kit.selectedBundle) return `Prep Kit — ${getPrepKitBundle(kit.selectedBundle).name}`
  return kit.aLaCarteItems.length > 0 ? 'Prep Kit — Custom' : null
}

export function priceBooking(
  service: ServiceSelectionValues,
  kit: KitChoice | null,
  member: { visitsUsed: number } | null = null,
  extras: QuoteExtras = {}
): BookingQuote {
  const includedBundle = service.full_package ? PRICING.full_package_kit : null
  const base = calculateBookingPrice(service, member)
  const kitPriced = kit
    ? priceKitSelection(kit, { membershipPlan: kitPlanFor(service.membership), includedBundle })
    : { lines: [], total: 0 }

  const withKit: BookingPriceBreakdown =
    base.isQuoteRequired || base.total === null || kitPriced.total <= 0
      ? base
      : {
          ...base,
          addonsPrice: base.addonsPrice + kitPriced.total,
          serviceSubtotal: (base.serviceSubtotal ?? 0) + kitPriced.total,
          total: base.total + kitPriced.total,
          deposit: calculateDeposit(base.total + kitPriced.total),
          lineItems: [...base.lineItems, ...kitPriced.lines],
        }

  // Referral savings come off the visit total last and never take it below $0.
  let referralDiscount = 0
  let creditApplied = 0
  let promoDiscount = 0
  let breakdown = withKit
  if (withKit.total !== null && withKit.total > 0) {
    let total = withKit.total
    const lines = [...withKit.lineItems]
    if (extras.promo) {
      promoDiscount = promoDiscountFor(extras.promo, total)
      total -= promoDiscount
      if (promoDiscount > 0) lines.push({ label: `Promo code ${extras.promo.code}`, amount: -promoDiscount })
    }
    if (extras.friendDiscount) {
      referralDiscount = Math.min(PRICING.referral.customer_credit, total)
      total -= referralDiscount
      lines.push({ label: 'Friend referral discount', amount: -referralDiscount })
    }
    if (extras.credit && extras.credit > 0 && total > 0) {
      creditApplied = Math.min(extras.credit, total)
      total -= creditApplied
      lines.push({ label: 'Your referral credit', amount: -creditApplied })
    }
    if (referralDiscount || creditApplied || promoDiscount) {
      breakdown = { ...withKit, total, deposit: calculateDeposit(total), serviceSubtotal: total, lineItems: lines }
    }
  }

  const listBase = calculateBookingPrice({ ...service, membership: 'one_time' }).total ?? 0
  const listKit = kit ? priceKitSelection(kit, { membershipPlan: 'none', includedBundle }).total : 0

  const serviceTypes: string[] = []
  if (base.isQuoteRequired) {
    serviceTypes.push('Custom quote — X-Large shelter')
    for (const id of service.hardware_addons) serviceTypes.push(`${getHardwareAddon(id).name} (quote)`)
  } else {
    if (service.full_package) serviceTypes.push('Full Package')
    else {
      if (service.deep_clean) serviceTypes.push('Deep Clean')
      if (service.led_package) serviceTypes.push('LED Package')
    }
    for (const id of service.hardware_addons) serviceTypes.push(getHardwareAddon(id).name)
  }
  const kitName = kitLabel(kit, kitPriced.total)
  if (kitName) serviceTypes.push(kitName)

  return {
    breakdown,
    items: breakdown.lineItems
      .filter((l): l is { label: string; amount: number } => l.amount !== null)
      .map((l) => ({ name: l.label, price: l.amount, quantity: 1 })),
    kitTotal: kitPriced.total,
    serviceValue: base.isQuoteRequired ? 0 : listBase + listKit,
    serviceTypes,
    membershipVisit: breakdown.isMemberVisit,
    membershipPlan: service.membership === 'annual' || service.membership === 'monthly' ? service.membership : 'none',
    referralDiscount,
    creditApplied,
    promoDiscount,
  }
}
