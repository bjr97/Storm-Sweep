import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { inTornadoSeason } from '@/lib/automation/daily'
import { formatServiceAddress, parseServiceAddress } from '@/lib/booking/address'
import { windowStartIso } from '@/lib/booking/timeWindows'
import { canCustomerChange } from '@/lib/customer/rules'
import { parseKeyword, phoneKey, toE164 } from '@/lib/sms/phone'

describe('arrival windows (America/Chicago)', () => {
  it('window start in CDT and CST', () => {
    assert.equal(windowStartIso('2026-10-20', 'morning'), '2026-10-20T13:00:00.000Z') // CDT (UTC-5)
    assert.equal(windowStartIso('2026-11-20', 'afternoon'), '2026-11-20T20:00:00.000Z') // CST (UTC-6)
    assert.equal(windowStartIso('2026-11-01', 'evening'), '2026-11-01T23:00:00.000Z') // DST ends that morning
  })
})

describe('customer changes', () => {
  const now = new Date('2026-11-10T12:00:00Z')
  it('allowed until 48 hours before; not for started visits', () => {
    assert.equal(canCustomerChange({ status: 'confirmed', scheduled_at: '2026-11-12T12:00:00Z' }, now), true)
    assert.equal(canCustomerChange({ status: 'confirmed', scheduled_at: '2026-11-12T11:59:00Z' }, now), false)
    assert.equal(canCustomerChange({ status: 'in_progress', scheduled_at: '2026-12-01T12:00:00Z' }, now), false)
  })
})

describe('addresses', () => {
  it('round-trips street / city / state / ZIP', () => {
    const s = formatServiceAddress({ address: '9 Elm, Apt 2', city: 'Moore', state: 'ok', zip: '73160' })
    assert.equal(s, '9 Elm, Apt 2, Moore, OK 73160')
    assert.deepEqual(parseServiceAddress(s), { address: '9 Elm, Apt 2', city: 'Moore', state: 'OK', zip: '73160' })
  })
})

describe('texting compliance', () => {
  it('formats US numbers to E.164', () => {
    assert.equal(toE164('(405) 555-0101'), '+14055550101')
    assert.equal(toE164('+1 405 555 0101'), '+14055550101')
    assert.equal(toE164('555-0101'), null)
    assert.equal(phoneKey('1-405-555-0101'), '4055550101')
  })

  it('recognizes carrier keywords only as the whole message', () => {
    assert.equal(parseKeyword('Stop'), 'stop')
    assert.equal(parseKeyword(' UNSUBSCRIBE. '), 'stop')
    assert.equal(parseKeyword('start'), 'start')
    assert.equal(parseKeyword('reschedule'), 'reschedule')
    assert.equal(parseKeyword("please don't stop by before 9"), null)
  })

  it('tornado campaign runs Feb 15 – Mar 31', () => {
    assert.equal(inTornadoSeason(2, 14), false)
    assert.equal(inTornadoSeason(2, 15), true)
    assert.equal(inTornadoSeason(3, 31), true)
    assert.equal(inTornadoSeason(4, 1), false)
  })
})
