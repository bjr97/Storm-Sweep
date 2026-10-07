import { z } from 'zod'

import { checkInvite } from '@/lib/customer/referrals'

export const dynamic = 'force-dynamic'

// Public: lets the booking page show the friend discount before checkout.
// Checkout re-validates server-side, so this only drives the UI.
const querySchema = z.object({ code: z.string().trim().min(1).max(24), email: z.string().trim().email() })

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url)
    const parsed = querySchema.safeParse({ code: url.searchParams.get('code'), email: url.searchParams.get('email') })
    if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
    const result = await checkInvite(parsed.data.code, parsed.data.email)
    return Response.json({ data: result.valid ? { valid: true } : { valid: false, reason: result.reason } })
  } catch (error) {
    console.error('[referrals/validate]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
