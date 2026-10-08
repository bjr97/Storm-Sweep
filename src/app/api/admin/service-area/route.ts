import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { createServiceClient } from '@/lib/supabase/server'

// Admin: add or remove a ZIP from the online-booking service area.
const addSchema = z.object({ zip: z.string().trim().regex(/^\d{5}$/, 'Enter a 5-digit ZIP'), label: z.string().trim().max(60).optional() })
const removeSchema = z.object({ zip: z.string().regex(/^\d{5}$/) })

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const parsed = addSchema.safeParse(await req.json())
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    const { error } = await createServiceClient()
      .from('service_zips')
      .upsert({ zip: parsed.data.zip, label: parsed.data.label || null }, { onConflict: 'zip' })
    if (error) throw error
    return Response.json({ data: { ok: true } })
  } catch (error) {
    console.error('[admin/service-area]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const parsed = removeSchema.safeParse(await req.json())
    if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
    const { error } = await createServiceClient().from('service_zips').delete().eq('zip', parsed.data.zip)
    if (error) throw error
    return Response.json({ data: { ok: true } })
  } catch (error) {
    console.error('[admin/service-area]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
