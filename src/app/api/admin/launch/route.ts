import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { createServiceClient } from '@/lib/supabase/server'

// Admin: add a launch checklist item.
const bodySchema = z.object({
  section: z.enum(['business', 'insurance', 'brand', 'operations', 'website']),
  title: z.string().trim().min(1, 'Give it a title').max(200),
  notes: z.string().trim().max(2000).nullable().optional(),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    const b = parsed.data
    const { data, error } = await createServiceClient()
      .from('launch_tasks')
      .insert({ section: b.section, title: b.title, notes: b.notes || null, due_on: b.dueOn ?? null, sort_order: 1000 })
      .select('id')
      .single()
    if (error) throw error
    return Response.json({ data })
  } catch (error) {
    console.error('[admin/launch]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
