import type { PartnerType } from '@/lib/admin/partnerRules'
import { createClient } from '@/lib/supabase/server'
import type { Partner } from '@/types/database'

/** Partner list with referral stats computed from jobs (admin RLS). */

export type PartnerView = Pick<
  Partner,
  'id' | 'name' | 'referral_code' | 'contact_name' | 'contact_phone' | 'payout_per_referral' | 'total_paid_out' | 'active' | 'notes' | 'created_at'
> & {
  type: PartnerType
  booked: number
  completed: number
  earned: number
  owed: number
}

export async function listPartners(): Promise<PartnerView[]> {
  const supabase = createClient()
  const [partnersRes, jobsRes] = await Promise.all([
    supabase.from('partners').select('*').order('active', { ascending: false }).order('name'),
    supabase.from('jobs').select('partner_id, status').not('partner_id', 'is', null),
  ])
  if (partnersRes.error) throw partnersRes.error
  if (jobsRes.error) throw jobsRes.error

  return partnersRes.data.map((p) => {
    const mine = jobsRes.data.filter((j) => j.partner_id === p.id)
    const completed = mine.filter((j) => j.status === 'complete').length
    const payout = p.payout_per_referral ?? 0
    const earned = completed * payout
    const paid = p.total_paid_out ?? 0
    return {
      ...p,
      type: p.type as PartnerType,
      payout_per_referral: payout,
      total_paid_out: paid,
      booked: mine.filter((j) => j.status !== 'cancelled').length,
      completed,
      earned,
      owed: Math.max(0, earned - paid),
    }
  })
}
