import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { recordPayout } from '@/lib/sweepers/payouts'

// Record money sent to a Sweeper (outside the app) for all their unpaid jobs.
const bodySchema = z.object({
  sweeperId: z.string().uuid(),
  method: z.enum(['zelle', 'venmo', 'cash_app', 'check', 'cash', 'bank', 'other']),
  reference: z.string().trim().max(100).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
})

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
    const result = await recordPayout(auth.userId, parsed.data.sweeperId, {
      method: parsed.data.method,
      reference: parsed.data.reference || null,
      note: parsed.data.note || null,
    })
    if ('error' in result) return Response.json({ error: result.error, code: result.code }, { status: result.status })
    return Response.json({ data: result, message: 'Payout recorded' })
  } catch (error) {
    console.error('[admin/payouts]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
