import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { createServiceClient } from '@/lib/supabase/server'

// Admin updates a Sweeper's paperwork: W-9 on file (no tax ID is stored), insurance expiry, notes.
const bodySchema = z.object({
  w9Received: z.boolean(),
  insuranceExpiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  notes: z.string().trim().max(500).nullable(),
})
const paramsSchema = z.object({ id: z.string().uuid() })

export async function PATCH(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const p = paramsSchema.safeParse(params)
    const b = bodySchema.safeParse(await req.json())
    if (!p.success || !b.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
    const supabase = createServiceClient()
    const { data: current } = await supabase.from('profiles').select('role, w9_received_at').eq('id', p.data.id).maybeSingle()
    if (current?.role !== 'sweeper') return Response.json({ error: 'Sweeper not found' }, { status: 404 })
    const { error } = await supabase
      .from('profiles')
      .update({
        w9_received_at: b.data.w9Received ? current.w9_received_at ?? new Date().toISOString() : null,
        insurance_expires_on: b.data.insuranceExpiresOn,
        paperwork_notes: b.data.notes || null,
      })
      .eq('id', p.data.id)
    if (error) throw error
    return Response.json({ data: { ok: true } })
  } catch (error) {
    console.error('[sweepers/paperwork]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
