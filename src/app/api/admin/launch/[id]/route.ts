import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { createServiceClient } from '@/lib/supabase/server'

// Admin: check off / edit / delete a launch checklist item.
const bodySchema = z.object({
  done: z.boolean().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})
const paramsSchema = z.object({ id: z.string().uuid() })

async function guard(params: { id: string }): Promise<{ id: string } | Response> {
  const auth = await requireRole('admin')
  if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
  const p = paramsSchema.safeParse(params)
  if (!p.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
  return p.data
}

export async function PATCH(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const g = await guard(params)
    if (g instanceof Response) return g
    const b = bodySchema.safeParse(await req.json())
    if (!b.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
    const update: { done_at?: string | null; title?: string; notes?: string | null; due_on?: string | null } = {}
    if (b.data.done !== undefined) update.done_at = b.data.done ? new Date().toISOString() : null
    if (b.data.title !== undefined) update.title = b.data.title
    if (b.data.notes !== undefined) update.notes = b.data.notes || null
    if (b.data.dueOn !== undefined) update.due_on = b.data.dueOn
    const { data, error } = await createServiceClient().from('launch_tasks').update(update).eq('id', g.id).neq('section', '_meta').select('id').maybeSingle()
    if (error) throw error
    if (!data) return Response.json({ error: 'Item not found' }, { status: 404 })
    return Response.json({ data: { ok: true } })
  } catch (error) {
    console.error('[admin/launch/id]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const g = await guard(params)
    if (g instanceof Response) return g
    const { error } = await createServiceClient().from('launch_tasks').delete().eq('id', g.id).neq('section', '_meta')
    if (error) throw error
    return Response.json({ data: { ok: true } })
  } catch (error) {
    console.error('[admin/launch/id]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
