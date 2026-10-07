import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { submitReview } from '@/lib/customer/actions'

const bodySchema = z.object({
  jobId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(1000).nullable().optional(),
})

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('customer')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return Response.json({ error: 'Pick a star rating' }, { status: 400 })
    const result = await submitReview(auth.userId, parsed.data.jobId, parsed.data.rating, parsed.data.body || null)
    if ('error' in result) return Response.json({ error: result.error, code: result.code }, { status: result.status })
    return Response.json({ data: result })
  } catch (error) {
    console.error('[customer/reviews]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
