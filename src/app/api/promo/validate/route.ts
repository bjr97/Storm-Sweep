import { z } from 'zod'

import { checkPromo, describePromo } from '@/lib/promos'

// Public: preview a promo code at checkout. Checkout re-checks everything.
const querySchema = z.object({
  code: z.string().trim().min(1).max(40),
  email: z.string().trim().max(254).default(''),
  invite: z.enum(['0', '1']).default('0'),
})

export async function GET(req: Request): Promise<Response> {
  try {
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams))
    if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
    const result = await checkPromo(parsed.data.code, parsed.data.email, { withInvite: parsed.data.invite === '1' })
    if (!result.valid) return Response.json({ data: { valid: false, reason: result.reason } })
    const { code, kind, value } = result.promo
    return Response.json({ data: { valid: true, code, kind, value, label: describePromo({ kind, value }) } })
  } catch (error) {
    console.error('[promo/validate]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
