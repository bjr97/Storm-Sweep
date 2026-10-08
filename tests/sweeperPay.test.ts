import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { localMidnight } from '@/lib/admin/time'
import {
  autoTier,
  calculateSweeperPay,
  claimPct,
  lockedPct,
  potentialPay,
  sweeperScore,
  tierVisibleAt,
  turnaroundBonus,
} from '@/lib/sweepers/jobBoard'
import { completionBlockers, type RunState } from '@/lib/sweepers/jobRun'

const H = 3_600_000
const chicago = (y: number, m: number, d: number, hour: number): Date => new Date(localMidnight(y, m, d).getTime() + hour * H)

describe('Sweeper pay', () => {
  it('claim speed tiers: 68 / 64 / 62 / 60 %', () => {
    assert.equal(claimPct(0), 0.68)
    assert.equal(claimPct(H - 1), 0.68)
    assert.equal(claimPct(H), 0.64)
    assert.equal(claimPct(4 * H), 0.62)
    assert.equal(claimPct(24 * H), 0.6)
  })

  it('office-assigned jobs pay the base 60%; claimed jobs lock their speed rate', () => {
    assert.equal(lockedPct({ assigned_via: 'admin', claimed_at: null, claim_visible_at: null }), 0.6)
    const visible = new Date('2026-11-20T15:00:00Z')
    assert.equal(lockedPct({ assigned_via: 'claim', claim_visible_at: visible.toISOString(), claimed_at: new Date(visible.getTime() + 30 * 60_000).toISOString() }), 0.68)
  })

  it('turnaround bonus counts business days from the SCHEDULED day', () => {
    const scheduled = chicago(2026, 11, 20, 8)
    assert.equal(turnaroundBonus(scheduled, chicago(2026, 11, 20, 22)), 2500) // same day, late evening
    assert.equal(turnaroundBonus(scheduled, chicago(2026, 11, 19, 10)), 2500) // early counts as on time
    assert.equal(turnaroundBonus(scheduled, chicago(2026, 11, 21, 9)), 2000)
    assert.equal(turnaroundBonus(scheduled, chicago(2026, 11, 22, 9)), 1000)
    assert.equal(turnaroundBonus(scheduled, chicago(2026, 11, 23, 9)), 500)
    assert.equal(turnaroundBonus(scheduled, chicago(2026, 11, 24, 9)), 0)
  })

  it('full breakdown: $1,000 job at 68% + on time + 1 upgrade + video = $730', () => {
    const pay = calculateSweeperPay({
      serviceValue: 100000,
      pct: 0.68,
      scheduledAt: chicago(2026, 11, 20, 8),
      completedAt: chicago(2026, 11, 20, 11),
      upgradesSold: 1,
      videoBonus: true,
    })
    assert.deepEqual(pay, { pct: 0.68, base: 68000, turnaround: 2500, upgrades: 1500, video: 1000, total: 73000 })
    assert.equal(potentialPay(14900, 0.68), 10132 + 2500)
  })

  it('tiers drip 30 min apart and skip empty tiers', () => {
    const open = new Date('2026-11-01T12:00:00Z')
    const all = new Set(['gold', 'silver', 'standard'] as const)
    assert.equal(tierVisibleAt(open, 'gold', all).getTime(), open.getTime())
    assert.equal(tierVisibleAt(open, 'silver', all).getTime() - open.getTime(), 30 * 60_000)
    assert.equal(tierVisibleAt(open, 'standard', all).getTime() - open.getTime(), 60 * 60_000)
    assert.equal(tierVisibleAt(open, 'standard', new Set(['standard'] as const)).getTime(), open.getTime())
  })

  it('tier score: rating 40 / on-time 40 / reliability 20', () => {
    const perfect = { completedJobs: 6, onTimeJobs: 6, ratingSum: 30, ratingCount: 6, lateDrops90d: 0 }
    assert.equal(sweeperScore(perfect), 100)
    assert.equal(autoTier(perfect), 'gold')
    assert.equal(sweeperScore({ ...perfect, lateDrops90d: 1 }), 95)
    assert.equal(autoTier({ ...perfect, completedJobs: 4, onTimeJobs: 4 }), 'silver') // gold needs 5+ jobs
    assert.equal(autoTier({ completedJobs: 0, onTimeJobs: 0, ratingSum: 0, ratingCount: 0, lateDrops90d: 0 }), 'standard')
  })
})

describe('job completion rules', () => {
  const ready: RunState = {
    status: 'in_progress',
    serviceTypes: ['Deep Clean'],
    progress: Object.fromEntries(
      ['arrive_04', 'clean_01', 'clean_04', 'inspect_01', 'inspect_02', 'inspect_03', 'inspect_04', 'inspect_05', 'inspect_08', 'wrap_03', 'wrap_04'].map((k) => [k, 'x'])
    ),
    enRouteAt: 'x',
    signedAt: 'x',
    photoItems: new Set(['arrive_02', 'arrive_03', 'inspect_06', 'wrap_01', 'wrap_02']),
    photoCounts: { before: 2, after: 2 },
    openIssues: 0,
  }

  it('a fully done job has no blockers', () => {
    assert.deepEqual(completionBlockers(ready), [])
  })

  it('needs 2 before + 2 after photos, a signature, no open problem', () => {
    const b = completionBlockers({ ...ready, photoCounts: { before: 1, after: 2 }, signedAt: null, openIssues: 1 })
    assert.ok(b.includes('Before photos 1/2'))
    assert.ok(b.includes('Customer signature'))
    assert.ok(b.some((x) => x.includes('reported problem')))
  })

  it('booked carpet adds a required install task', () => {
    const b = completionBlockers({ ...ready, serviceTypes: ['Deep Clean', 'Shelter Carpet'] })
    assert.deepEqual(b, ['1 required checklist item'])
  })
})
