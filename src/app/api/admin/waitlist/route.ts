import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { createServiceClient } from '@/lib/supabase/server'

// Admin: mark everyone waiting in a ZIP as contacted (e.g. after expanding there).
const bodySchema = z.object({ zip: z.string().regex(/^\d{5}$/) })

export async function PATCH(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
    const { data, error } = await createServiceClient()
      .from('waitlist')
      .update({ notified_at: new Date().toISOString() })
      .eq('zip', parsed.data.zip)
      .is('notified_at', null)
      .select('id')
    if (error) throw error
    return Response.json({ data: { marked: data.length } })
  } catch (error) {
    console.error('[admin/waitlist]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
