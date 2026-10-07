import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { TIME_WINDOW_VALUES } from '@/lib/booking/timeWindows'
import { cancelVisit, rescheduleVisit } from '@/lib/customer/actions'

// Customer reschedule / cancel (allowed until 48 hours before the visit).
const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('reschedule'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    window: z.enum(TIME_WINDOW_VALUES),
  }),
  z.object({ action: z.literal('cancel') }),
])
const paramsSchema = z.object({ id: z.string().uuid() })

export async function POST(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const auth = await requireRole('customer')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const parsedParams = paramsSchema.safeParse(params)
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsedParams.success || !parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })

    const a = parsed.data
    const result =
      a.action === 'reschedule'
        ? await rescheduleVisit(auth.userId, parsedParams.data.id, a.date, a.window)
        : await cancelVisit(auth.userId, parsedParams.data.id)
    if ('error' in result) return Response.json({ error: result.error, code: result.code }, { status: result.status })
    return Response.json({ data: result })
  } catch (error) {
    console.error('[customer/jobs]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
