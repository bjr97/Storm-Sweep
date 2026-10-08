import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { priceBooking } from '@/lib/booking/quote'
import type { ServiceSelectionValues } from '@/lib/booking/schemas'
import { calculateDeposit } from '@/lib/utils'

// All amounts are integer cents. These lock in the prices customers are charged.

const sel = (over: Partial<ServiceSelectionValues> = {}): ServiceSelectionValues => ({
  shelter_size: 'standard',
  deep_clean: true,
  led_package: false,
  full_package: false,
  hardware_addons: [],
  membership: 'one_time',
  ...over,
})

describe('booking prices', () => {
  it('standard deep clean is $149 with a 50% deposit', () => {
    const q = priceBooking(sel(), null)
    assert.equal(q.breakdown.total, 14900)
    assert.equal(q.breakdown.deposit, 7450)
    assert.equal(q.serviceValue, 14900)
  })

  it('shelter sizes: small $129, large $179, X-Large is a quote', () => {
    assert.equal(priceBooking(sel({ shelter_size: 'small' }), null).breakdown.total, 12900)
    assert.equal(priceBooking(sel({ shelter_size: 'large' }), null).breakdown.total, 17900)
    const xl = priceBooking(sel({ shelter_size: 'xlarge', hardware_addons: ['flooring'] }), null)
    assert.equal(xl.breakdown.total, null)
    assert.deepEqual(xl.serviceTypes, ['Custom quote — X-Large shelter', 'Shelter Carpet (quote)'])
  })

  it('add-ons: carpet by size + hinge/roller', () => {
    assert.equal(priceBooking(sel({ hardware_addons: ['flooring', 'hinge_roller_service'] }), null).breakdown.total, 31300)
    assert.equal(priceBooking(sel({ shelter_size: 'small', hardware_addons: ['flooring'] }), null).breakdown.total, 22800)
  })

  it('new annual member: clean covered, large pays $30 difference, 10% off upgrades', () => {
    const q = priceBooking(sel({ shelter_size: 'large', hardware_addons: ['flooring', 'interior_handle'], membership: 'annual' }), null)
    assert.equal(q.breakdown.total, 21360) // 3000 + 15900 + 4500 - 2040
    assert.equal(q.membershipVisit, true)
    assert.equal(q.membershipPlan, 'annual')
    assert.equal(q.serviceValue, 38300) // list value for Sweeper pay
  })

  it('existing member: visit 2 is free, visit 3 is priced normally', () => {
    const second = priceBooking(sel({ membership: 'member' }), null, { visitsUsed: 1 })
    assert.equal(second.breakdown.total, 0)
    assert.equal(second.membershipVisit, true)
    assert.equal(second.membershipPlan, 'none') // never re-sells the membership
    const third = priceBooking(sel({ membership: 'member' }), null, { visitsUsed: 2 })
    assert.equal(third.breakdown.total, 14900)
    assert.equal(third.membershipVisit, false)
  })

  it('full package with a bigger kit credits the included Storm Starter', () => {
    const q = priceBooking(sel({ full_package: true, led_package: true }), { selectedBundle: 'family_ready', aLaCarteItems: [] })
    assert.equal(q.breakdown.total, 30900) // 29900 + (8900 - 7900)
  })

  it('friend invite takes $25 off; credit stacks but never goes below $0', () => {
    const invite = priceBooking(sel(), null, null, { friendDiscount: true })
    assert.equal(invite.breakdown.total, 12400)
    assert.equal(invite.referralDiscount, 2500)
    const both = priceBooking(sel(), null, null, { friendDiscount: true, credit: 50000 })
    assert.equal(both.breakdown.total, 0)
    assert.equal(both.creditApplied, 12400)
    const memberFree = priceBooking(sel({ membership: 'member' }), null, { visitsUsed: 0 }, { credit: 2500 })
    assert.equal(memberFree.creditApplied, 0) // nothing to discount on a covered visit
  })

  it('deposits round to whole cents', () => {
    assert.equal(calculateDeposit(21360), 10680)
    assert.equal(calculateDeposit(12345), 6173)
  })

  it('line items always add up to the total', () => {
    for (const q of [
      priceBooking(sel({ hardware_addons: ['flooring'], membership: 'annual' }), { selectedBundle: null, aLaCarteItems: ['hygiene'] }),
      priceBooking(sel({ full_package: true, led_package: true, membership: 'monthly' }), { selectedBundle: 'full_house', aLaCarteItems: [] }),
      priceBooking(sel(), null, null, { friendDiscount: true, credit: 1000 }),
    ]) {
      assert.equal(q.items.reduce((n, i) => n + i.price * i.quantity, 0), q.breakdown.total)
    }
  })
})
