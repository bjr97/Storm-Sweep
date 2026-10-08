import { localDate } from '@/lib/admin/time'
import { getUserIdByEmail } from '@/lib/auth/users'
import type { PromoRule } from '@/lib/booking/quote'
import { createServiceClient } from '@/lib/supabase/server'
import type { PromoCode } from '@/types/database'

/** Promo codes (server-only). The rules here are re-checked at every checkout. */

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24)
}

export type PromoCheck = { valid: true; promo: PromoRule & { id: string } } | { valid: false; reason: string }

/** Bookings that used a code (cancelled visits give the use back). */
export async function promoUses(ids: string[]): Promise<Map<string, { uses: number; discount: number }>> {
  const map = new Map<string, { uses: number; discount: number }>()
  if (ids.length === 0) return map
  const { data, error } = await createServiceClient()
    .from('jobs')
    .select('promo_code_id, promo_discount')
    .in('promo_code_id', ids)
    .neq('status', 'cancelled')
    .eq('is_demo', false)
  if (error) throw error
  for (const j of data) {
    const m = map.get(j.promo_code_id!) ?? { uses: 0, discount: 0 }
    m.uses += 1
    m.discount += j.promo_discount
    map.set(j.promo_code_id!, m)
  }
  return map
}

export async function checkPromo(rawCode: string, email: string, opts: { withInvite?: boolean } = {}): Promise<PromoCheck> {
  const code = normalizePromoCode(rawCode)
  if (!code) return { valid: false, reason: 'Enter a promo code' }
  if (opts.withInvite) return { valid: false, reason: 'Promo codes can’t be combined with a friend invite' }

  const supabase = createServiceClient()
  const { data: promo, error } = await supabase.from('promo_codes').select('*').eq('code', code).maybeSingle()
  if (error) throw error
  if (!promo || !promo.active) return { valid: false, reason: 'That promo code isn’t valid' }
  if (promo.expires_on) {
    const t = localDate(new Date())
    const today = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
    if (today > promo.expires_on) return { valid: false, reason: 'That promo code has expired' }
  }
  if (promo.max_uses !== null) {
    const used = (await promoUses([promo.id])).get(promo.id)?.uses ?? 0
    if (used >= promo.max_uses) return { valid: false, reason: 'That promo code has been fully used' }
  }
  if (promo.first_time_only && (await hasBookedBefore(email))) {
    return { valid: false, reason: 'That promo code is for first-time customers' }
  }
  return { valid: true, promo: { id: promo.id, code: promo.code, kind: promo.kind, value: promo.value } }
}

/** Any non-cancelled visit under this email already? */
async function hasBookedBefore(email: string): Promise<boolean> {
  const userId = await getUserIdByEmail(email)
  if (!userId) return false
  const { count } = await createServiceClient()
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', userId)
    .neq('status', 'cancelled')
  return (count ?? 0) > 0
}

export function describePromo(p: Pick<PromoCode, 'kind' | 'value'>): string {
  return p.kind === 'percent' ? `${p.value}% off` : `$${(p.value / 100).toFixed(p.value % 100 ? 2 : 0)} off`
}

export type PromoRow = PromoCode & { uses: number; discountGiven: number }

/** All codes with how often they've been used (admin). */
export async function listPromos(): Promise<PromoRow[]> {
  const { data, error } = await createServiceClient().from('promo_codes').select('*').order('created_at', { ascending: false })
  if (error) throw error
  const uses = await promoUses(data.map((p) => p.id))
  return data.map((p) => ({ ...p, uses: uses.get(p.id)?.uses ?? 0, discountGiven: uses.get(p.id)?.discount ?? 0 }))
}
