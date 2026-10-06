import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { resolveIssue } from '@/lib/sweepers/jobRunServer'

// Admin decision on a hazard a Sweeper reported (job is paused until then).
const bodySchema = z.object({
  issueId: z.string().uuid(),
  decision: z.enum(['continue', 'end_visit']),
  note: z.string().trim().max(500).nullable().optional(),
})
const paramsSchema = z.object({ id: z.string().uuid() })

export async function PATCH(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) {
      return Response.json({ error: 'Not authorized' }, { status: auth.status })
    }
    const parsedParams = paramsSchema.safeParse(params)
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsedParams.success || !parsed.success) {
      return Response.json({ error: 'Invalid input' }, { status: 400 })
    }
    const result = await resolveIssue(
      auth.userId,
      parsedParams.data.id,
      parsed.data.issueId,
      parsed.data.decision,
      parsed.data.note || null
    )
    if ('error' in result) {
      return Response.json({ error: result.error, code: result.code }, { status: result.status })
    }
    return Response.json({ data: result })
  } catch (error) {
    console.error('[jobs/issues]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
