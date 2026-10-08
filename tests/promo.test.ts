import assert from 'node:assert/strict'
import { test } from 'node:test'

import { priceBooking, promoDiscountFor, PROMO_MIN_TOTAL } from '@/lib/booking/quote'
import type { ServiceSelectionValues } from '@/lib/booking/schemas'
import { calculateDeposit, PRICING } from '@/lib/utils'

test('promo: flat amount, percent rounds to a whole cent', () => {
  assert.equal(promoDiscountFor({ code: 'A', kind: 'amount', value: 2000 }, 14900), 2000)
  assert.equal(promoDiscountFor({ code: 'P', kind: 'percent', value: 15 }, 14900), 2235)
  assert.equal(promoDiscountFor({ code: 'P', kind: 'percent', value: 10 }, 12345), 1235) // 1234.5 -> 1235
})

test('promo never takes a booking below the minimum online charge', () => {
  assert.equal(promoDiscountFor({ code: 'BIG', kind: 'amount', value: 50000 }, 14900), 14900 - PROMO_MIN_TOTAL)
  assert.equal(promoDiscountFor({ code: 'ALL', kind: 'percent', value: 100 }, 14900), 14900 - PROMO_MIN_TOTAL)
  assert.equal(promoDiscountFor({ code: 'X', kind: 'amount', value: 500 }, 0), 0)
})

test('priceBooking applies the promo before credit, with a line item and 50% deposit', () => {
  const service = { shelter_size: 'standard', deep_clean: true, led_package: false, full_package: false, hardware_addons: [], membership: 'one_time' } as unknown as ServiceSelectionValues
  const q = priceBooking(service, null, null, { promo: { code: 'STORM20', kind: 'amount', value: 2000 }, credit: 500 })
  const expected = PRICING.shelter.standard - 2000 - 500
  assert.equal(q.promoDiscount, 2000)
  assert.equal(q.creditApplied, 500)
  assert.equal(q.breakdown.total, expected)
  assert.equal(q.breakdown.deposit, calculateDeposit(expected))
  assert.ok(q.breakdown.lineItems.some((l) => l.label === 'Promo code STORM20' && l.amount === -2000))
  // List value for Sweeper pay is unaffected by discounts.
  assert.equal(q.serviceValue, PRICING.shelter.standard)
})
