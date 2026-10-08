import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { createServiceClient } from '@/lib/supabase/server'

// Admin: mark a help request handled (or reopen it).
const bodySchema = z.object({ handled: z.boolean() })
const paramsSchema = z.object({ id: z.string().uuid() })

export async function PATCH(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const p = paramsSchema.safeParse(params)
    const b = bodySchema.safeParse(await req.json())
    if (!p.success || !b.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
    const { data, error } = await createServiceClient()
      .from('help_requests')
      .update({ handled_at: b.data.handled ? new Date().toISOString() : null })
      .eq('id', p.data.id)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) return Response.json({ error: 'Request not found' }, { status: 404 })
    return Response.json({ data: { ok: true } })
  } catch (error) {
    console.error('[admin/help]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
