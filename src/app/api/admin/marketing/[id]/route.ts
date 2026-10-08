import { z } from 'zod'

import { consentedJobIds } from '@/lib/admin/marketing'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('caption'), caption: z.string().trim().min(1).max(2200) }),
  z.object({ action: z.literal('posted') }),
  z.object({ action: z.literal('unposted') }),
])
const paramsSchema = z.object({ id: z.string().uuid() })

export async function PATCH(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const p = paramsSchema.safeParse(params)
    const b = bodySchema.safeParse(await req.json())
    if (!p.success || !b.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
    const supabase = createClient()
    const { data: post } = await supabase.from('social_posts').select('id, job_id').eq('id', p.data.id).maybeSingle()
    if (!post) return Response.json({ error: 'Post not found' }, { status: 404 })

    if (b.data.action === 'posted') {
      // Re-check consent at the moment of publishing — customers can withdraw it.
      if (!post.job_id || !(await consentedJobIds([post.job_id])).has(post.job_id)) {
        return Response.json({ error: 'Consent was withdrawn — do not post these photos', code: 'NO_CONSENT' }, { status: 409 })
      }
    }
    const update =
      b.data.action === 'caption'
        ? { caption: b.data.caption }
        : { published_at: b.data.action === 'posted' ? new Date().toISOString() : null }
    const { error } = await supabase.from('social_posts').update(update).eq('id', post.id)
    if (error) throw error
    return Response.json({ data: { ok: true } })
  } catch (error) {
    console.error('[admin/marketing/patch]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const p = paramsSchema.safeParse(params)
    if (!p.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
    const { error } = await createClient().from('social_posts').delete().eq('id', p.data.id)
    if (error) throw error
    return Response.json({ data: { ok: true } })
  } catch (error) {
    console.error('[admin/marketing/delete]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
