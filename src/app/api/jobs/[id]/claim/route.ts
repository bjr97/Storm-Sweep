import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { claimJob } from '@/lib/sweepers/board'

const paramsSchema = z.object({ id: z.string().uuid() })

export async function POST(_req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const auth = await requireRole('sweeper')
    if (!auth.authorized) {
      return Response.json({ error: 'Not authorized' }, { status: auth.status })
    }
    const parsed = paramsSchema.safeParse(params)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid job id' }, { status: 400 })
    }

    const result = await claimJob(auth.userId, parsed.data.id)
    if ('error' in result) {
      return Response.json({ error: result.error, code: result.code }, { status: result.status })
    }
    return Response.json({ data: result, message: 'Job claimed' })
  } catch (error) {
    console.error('[jobs/claim]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
