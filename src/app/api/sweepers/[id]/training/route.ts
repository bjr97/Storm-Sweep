import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { createServiceClient } from '@/lib/supabase/server'

// Admin: waive training for an experienced Sweeper, or reset it so they redo it.
const bodySchema = z.object({ action: z.enum(['waive', 'unwaive', 'reset']) })
const paramsSchema = z.object({ id: z.string().uuid() })

export async function PATCH(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const p = paramsSchema.safeParse(params)
    const b = bodySchema.safeParse(await req.json())
    if (!p.success || !b.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
    const update =
      b.data.action === 'waive'
        ? { training_waived: true }
        : b.data.action === 'unwaive'
          ? { training_waived: false }
          : { training_waived: false, training_completed_at: null, training_progress: {} }
    const { data, error } = await createServiceClient().from('profiles').update(update).eq('id', p.data.id).eq('role', 'sweeper').select('id').maybeSingle()
    if (error) throw error
    if (!data) return Response.json({ error: 'Sweeper not found' }, { status: 404 })
    return Response.json({ data: { ok: true } })
  } catch (error) {
    console.error('[sweepers/training]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
