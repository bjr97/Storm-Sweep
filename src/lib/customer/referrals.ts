import { randomInt } from 'node:crypto'

import { getUserIdByEmail } from '@/lib/auth/users'
import { createServiceClient } from '@/lib/supabase/server'
import { PRICING } from '@/lib/utils'

/**
 * Customer referral program — "Give $25, get $25" (server-only).
 * - Every customer has a share code (/book?invite=CODE), created on first view.
 * - A FIRST-TIME customer booking with a valid code gets $25 off that visit.
 * - When that friend's visit is COMPLETED, the inviter earns $25 credit,
 *   applied automatically to their next booking.
 * Amounts come from PRICING.referral.customer_credit (cents).
 */

export const REFERRAL_REWARD = PRICING.referral.customer_credit

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I confusion

/** Returns the customer's share code, creating one on first use. */
export async function ensureReferralCode(customerId: string, name: string | null): Promise<string> {
  const supabase = createServiceClient()
  const { data: existing } = await supabase.from('profiles').select('referral_code').eq('id', customerId).maybeSingle()
  if (existing?.referral_code) return existing.referral_code

  const stem = (name ?? '').split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'FRIEND'
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `${stem}${Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}`
    const { error } = await supabase.from('profiles').update({ referral_code: code }).eq('id', customerId).is('referral_code', null)
    if (!error) {
      const { data } = await supabase.from('profiles').select('referral_code').eq('id', customerId).maybeSingle()
      if (data?.referral_code) return data.referral_code
    } else if (error.code !== '23505') {
      throw error
    }
  }
  throw new Error('Could not create a referral code')
}

export type InviteCheck = { valid: true; referrerId: string } | { valid: false; reason: string }

/** A code is usable only by a first-time customer who isn't the code's owner. */
export async function checkInvite(code: string, email: string): Promise<InviteCheck> {
  const supabase = createServiceClient()
  const normalized = code.trim().toUpperCase()
  if (!/^[A-Z0-9]{4,24}$/.test(normalized)) return { valid: false, reason: 'That invite code doesn’t look right' }

  const { data: referrer } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('referral_code', normalized)
    .maybeSingle()
  if (!referrer || referrer.role !== 'customer') return { valid: false, reason: 'That invite code wasn’t found' }

  const bookerId = await getUserIdByEmail(email)
  if (bookerId === referrer.id) return { valid: false, reason: 'You can’t use your own invite code' }
  if (bookerId) {
    const { count } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', bookerId)
      .neq('status', 'cancelled')
    if ((count ?? 0) > 0) return { valid: false, reason: 'Invite discounts are for first-time customers' }
  }
  return { valid: true, referrerId: referrer.id }
}

export async function getCreditBalance(customerId: string): Promise<number> {
  const { data } = await createServiceClient().from('profiles').select('referral_credit').eq('id', customerId).maybeSingle()
  return Math.max(0, data?.referral_credit ?? 0)
}

async function adjustCredit(customerId: string, delta: number): Promise<void> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('profiles').select('referral_credit').eq('id', customerId).maybeSingle()
  const next = Math.max(0, (data?.referral_credit ?? 0) + delta)
  const { error } = await supabase.from('profiles').update({ referral_credit: next }).eq('id', customerId)
  if (error) throw error
}

/** Booking paid: the credit it used is spent. */
export const spendCredit = (customerId: string, amount: number): Promise<void> => adjustCredit(customerId, -amount)
/** Booking cancelled: give the spent credit back. */
export const refundCredit = (customerId: string, amount: number): Promise<void> => adjustCredit(customerId, amount)

/** Friend's visit completed: credit the inviter once (guarded by referral_rewarded_at). */
export async function rewardReferrer(jobId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data: claimed, error } = await supabase
    .from('jobs')
    .update({ referral_rewarded_at: new Date().toISOString() })
    .eq('id', jobId)
    .not('referred_by', 'is', null)
    .is('referral_rewarded_at', null)
    .select('referred_by')
  if (error) throw error
  const referrer = claimed?.[0]?.referred_by
  if (!referrer) return false
  await adjustCredit(referrer, REFERRAL_REWARD)
  return true
}

export type ReferralSummary = { code: string; credit: number; invited: number; rewarded: number }

export async function getReferralSummary(customerId: string, name: string | null): Promise<ReferralSummary> {
  const supabase = createServiceClient()
  const [code, credit, jobsRes] = await Promise.all([
    ensureReferralCode(customerId, name),
    getCreditBalance(customerId),
    supabase.from('jobs').select('customer_id, referral_rewarded_at').eq('referred_by', customerId).neq('status', 'cancelled'),
  ])
  const jobs = jobsRes.data ?? []
  return {
    code,
    credit,
    invited: new Set(jobs.map((j) => j.customer_id)).size,
    rewarded: jobs.filter((j) => j.referral_rewarded_at).length,
  }
}
