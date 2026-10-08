import { createServiceClient } from '@/lib/supabase/server'

/** Per-Sweeper paperwork status for the Crew and Payouts pages (server-only). */

export type Paperwork = {
  w9ReceivedAt: string | null
  insuranceExpiresOn: string | null
  notes: string | null
  agreementSigned: boolean
  /** expired | soon (<30 days) | ok | missing */
  insurance: 'expired' | 'soon' | 'ok' | 'missing'
}

export function insuranceStatus(expiresOn: string | null, now: Date = new Date()): Paperwork['insurance'] {
  if (!expiresOn) return 'missing'
  const exp = new Date(`${expiresOn}T23:59:59`)
  if (exp < now) return 'expired'
  return exp.getTime() - now.getTime() < 30 * 86_400_000 ? 'soon' : 'ok'
}

export async function getCrewPaperwork(now: Date = new Date()): Promise<Map<string, Paperwork>> {
  const supabase = createServiceClient()
  const [{ data: sweepers }, { data: applicants }] = await Promise.all([
    supabase.from('profiles').select('id, w9_received_at, insurance_expires_on, paperwork_notes').eq('role', 'sweeper'),
    supabase.from('sweeper_applicants').select('email, agreement_signed').eq('status', 'approved'),
  ])
  const signed = new Set((applicants ?? []).filter((a) => a.agreement_signed).map((a) => a.email.toLowerCase()))
  const map = new Map<string, Paperwork>()
  for (const s of sweepers ?? []) {
    const email = (await supabase.auth.admin.getUserById(s.id)).data.user?.email?.toLowerCase() ?? ''
    map.set(s.id, {
      w9ReceivedAt: s.w9_received_at,
      insuranceExpiresOn: s.insurance_expires_on,
      notes: s.paperwork_notes,
      agreementSigned: signed.has(email),
      insurance: insuranceStatus(s.insurance_expires_on, now),
    })
  }
  return map
}
