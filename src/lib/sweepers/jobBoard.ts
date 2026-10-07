import { localDate } from '@/lib/admin/time'
import { PRICING, roundCents } from '@/lib/utils'
import type { SweeperTier } from '@/types/database'

/**
 * Job board rules — pure functions, safe on server and client.
 *
 * - Confirmed, unassigned jobs go on the board (board_opened_at, set by a DB trigger).
 * - Tiers see a job in order Gold -> Silver -> Standard, TIER_DRIP_MINUTES apart.
 *   Empty tiers are skipped so jobs never wait on nobody.
 * - Speed pay is measured from when the job became visible to the claimer's tier.
 * - Turnaround bonus: job completed (report submitted) on its scheduled day,
 *   smaller if 1–3 days late.
 */
export const JOB_BOARD = {
  TIER_DRIP_MINUTES: 30,
  MAX_JOBS_PER_DAY: 5,
  FREE_DROP_HOURS: 24,
} as const

export const TIER_ORDER: readonly SweeperTier[] = ['gold', 'silver', 'standard']

export const TIER_LABEL: Record<SweeperTier, string> = { gold: 'Gold', silver: 'Silver', standard: 'Standard' }

/** When a job opened at `boardOpenedAt` becomes visible to `tier`. */
export function tierVisibleAt(boardOpenedAt: Date, tier: SweeperTier, populatedTiers: ReadonlySet<SweeperTier>): Date {
  const ahead = TIER_ORDER.slice(0, TIER_ORDER.indexOf(tier)).filter((t) => populatedTiers.has(t)).length
  return new Date(boardOpenedAt.getTime() + ahead * JOB_BOARD.TIER_DRIP_MINUTES * 60_000)
}

const s = PRICING.sweeper

/** Speed-pay percentage for claiming `msSinceVisible` after the job became visible. */
export function claimPct(msSinceVisible: number): number {
  const hours = Math.max(0, msSinceVisible) / 3_600_000
  if (hours < 1) return s.accept_1hr_pct
  if (hours < 4) return s.accept_4hr_pct
  if (hours < 24) return s.accept_24hr_pct
  return s.base_pct
}

/** The next drop in speed pay (for "68% for the next 42 min" countdowns); null once at base. */
export function nextPctDrop(visibleAt: Date, now: Date): { at: Date; nextPct: number } | null {
  for (const hours of [1, 4, 24]) {
    const at = new Date(visibleAt.getTime() + hours * 3_600_000)
    if (at > now) return { at, nextPct: claimPct(hours * 3_600_000) }
  }
  return null
}

/** Days between the scheduled and completion business dates (0 = same day; negative = early). */
function businessDaysLate(scheduledAt: Date, completedAt: Date): number {
  const a = localDate(scheduledAt)
  const b = localDate(completedAt)
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000)
}

export function turnaroundBonus(scheduledAt: Date, completedAt: Date): number {
  const late = businessDaysLate(scheduledAt, completedAt)
  if (late <= 0) return s.turnaround_same_day
  if (late === 1) return s.turnaround_day_1
  if (late === 2) return s.turnaround_day_2
  if (late === 3) return s.turnaround_day_3
  return 0
}

export type PayBreakdown = { pct: number; base: number; turnaround: number; upgrades: number; video: number; total: number }

/** Sweeper pay for a job, in cents. `serviceValue` is the list value (jobs.service_value). */
export function calculateSweeperPay(input: {
  serviceValue: number
  pct: number
  scheduledAt?: Date | null
  completedAt?: Date | null
  upgradesSold?: number
  videoBonus?: boolean
}): PayBreakdown {
  const base = roundCents(input.serviceValue * input.pct)
  const turnaround = input.scheduledAt && input.completedAt ? turnaroundBonus(input.scheduledAt, input.completedAt) : 0
  const upgrades = (input.upgradesSold ?? 0) * s.upgrade_commission
  const video = input.videoBonus ? s.video_bonus : 0
  return { pct: input.pct, base, turnaround, upgrades, video, total: base + turnaround + upgrades + video }
}

/** "Earn up to" on the board: pay at the current speed tier + the on-time bonus. */
export function potentialPay(serviceValue: number, pct: number): number {
  return roundCents(serviceValue * pct) + s.turnaround_same_day
}

// ---- Tier score -------------------------------------------------------------

export type SweeperStats = {
  completedJobs: number
  onTimeJobs: number
  ratingSum: number
  ratingCount: number
  lateDrops90d: number
}

export const TIER_RULES = {
  gold: { minScore: 85, minJobs: 5 },
  silver: { minScore: 70, minJobs: 2 },
} as const

/**
 * 0–100. Rating 40% (no reviews yet counts as 4/5), on-time completion 40%
 * (no jobs yet counts as 100%), reliability 20% (each late drop in 90 days −25%).
 */
export function sweeperScore(stats: SweeperStats): number {
  const avg = stats.ratingCount > 0 ? stats.ratingSum / stats.ratingCount : 4
  const rating = (avg - 1) / 4
  const onTime = stats.completedJobs > 0 ? stats.onTimeJobs / stats.completedJobs : 1
  const reliability = Math.max(0, 1 - 0.25 * stats.lateDrops90d)
  return Math.round(100 * (0.4 * rating + 0.4 * onTime + 0.2 * reliability))
}

export function autoTier(stats: SweeperStats): SweeperTier {
  const score = sweeperScore(stats)
  if (stats.completedJobs >= TIER_RULES.gold.minJobs && score >= TIER_RULES.gold.minScore) return 'gold'
  if (stats.completedJobs >= TIER_RULES.silver.minJobs && score >= TIER_RULES.silver.minScore) return 'silver'
  return 'standard'
}

export function isOnTime(scheduledAt: Date, completedAt: Date): boolean {
  return businessDaysLate(scheduledAt, completedAt) <= 0
}

/** The speed % locked in for a job: claim speed for claimed jobs, base rate for admin assignments. */
export function lockedPct(job: {
  assigned_via: string | null
  claimed_at: string | null
  claim_visible_at: string | null
}): number {
  if (job.assigned_via === 'claim' && job.claimed_at && job.claim_visible_at) {
    return claimPct(new Date(job.claimed_at).getTime() - new Date(job.claim_visible_at).getTime())
  }
  return s.base_pct
}
