import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { normalizePromoCode } from '@/lib/promos'
import { createServiceClient } from '@/lib/supabase/server'

// Admin: create a promo code. value = cents (amount) or whole percent.
const bodySchema = z
  .object({
    code: z.string().transform(normalizePromoCode).pipe(z.string().regex(/^[A-Z0-9]{3,24}$/, 'Use 3–24 letters or numbers')),
    kind: z.enum(['amount', 'percent']),
    value: z.number().int().positive(),
    maxUses: z.number().int().positive().max(100000).nullable(),
    firstTimeOnly: z.boolean(),
    expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    note: z.string().trim().max(200).nullable(),
  })
  .refine((b) => (b.kind === 'percent' ? b.value <= 90 : b.value <= 100000), { message: 'Percent codes max out at 90%; dollar codes at $1,000' })

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }
    const b = parsed.data
    const { data, error } = await createServiceClient()
      .from('promo_codes')
      .insert({ code: b.code, kind: b.kind, value: b.value, max_uses: b.maxUses, first_time_only: b.firstTimeOnly, expires_on: b.expiresOn, note: b.note || null })
      .select('id, code')
      .single()
    if (error?.code === '23505') return Response.json({ error: `${b.code} already exists`, code: 'DUPLICATE' }, { status: 409 })
    if (error) throw error
    return Response.json({ data })
  } catch (error) {
    console.error('[admin/promos]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
