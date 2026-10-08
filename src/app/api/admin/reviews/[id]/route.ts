import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'

// Admin marks a review followed up (with an optional private note), or reopens it.
const bodySchema = z.object({ followedUp: z.boolean(), note: z.string().trim().max(1000).nullable().optional() })
const paramsSchema = z.object({ id: z.string().uuid() })

export async function PATCH(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const p = paramsSchema.safeParse(params)
    const b = bodySchema.safeParse(await req.json())
    if (!p.success || !b.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
    const { data, error } = await createClient()
      .from('reviews')
      .update({
        followed_up_at: b.data.followedUp ? new Date().toISOString() : null,
        ...(b.data.note !== undefined ? { admin_note: b.data.note || null } : {}),
      })
      .eq('id', p.data.id)
      .select('id')
    if (error) throw error
    if (!data?.length) return Response.json({ error: 'Review not found' }, { status: 404 })
    return Response.json({ data: data[0] })
  } catch (error) {
    console.error('[admin/reviews]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
