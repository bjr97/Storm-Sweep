import { z } from 'zod'

import { partnerInputSchema } from '@/lib/admin/partnerRules'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('update'), partner: partnerInputSchema }),
  /** Record money paid to the partner outside the app (cents). */
  z.object({ action: z.literal('payout'), amount: z.number().int().positive().max(10_000_000) }),
])
const paramsSchema = z.object({ id: z.string().uuid() })

export async function PATCH(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const parsedParams = paramsSchema.safeParse(params)
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsedParams.success || !parsed.success) {
      const msg = parsed.success ? 'Invalid partner' : parsed.error.issues[0]?.message ?? 'Invalid input'
      return Response.json({ error: msg }, { status: 400 })
    }
    const supabase = createClient()
    const id = parsedParams.data.id

    if (parsed.data.action === 'update') {
      const { data, error } = await supabase.from('partners').update(parsed.data.partner).eq('id', id).select('id')
      if (error) {
        if (error.code === '23505') return Response.json({ error: 'That referral code is already taken', code: 'CODE_TAKEN' }, { status: 409 })
        throw error
      }
      if (!data?.length) return Response.json({ error: 'Partner not found' }, { status: 404 })
      return Response.json({ data: data[0] })
    }

    const { data: partner, error: loadErr } = await supabase.from('partners').select('total_paid_out').eq('id', id).maybeSingle()
    if (loadErr) throw loadErr
    if (!partner) return Response.json({ error: 'Partner not found' }, { status: 404 })
    const { error } = await supabase
      .from('partners')
      .update({ total_paid_out: (partner.total_paid_out ?? 0) + parsed.data.amount })
      .eq('id', id)
    if (error) throw error
    return Response.json({ data: { ok: true }, message: 'Payout recorded' })
  } catch (error) {
    console.error('[admin/partners/patch]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
