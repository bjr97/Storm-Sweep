import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { createServiceClient } from '@/lib/supabase/server'

// Sweeper's own "available for new jobs" switch.
const bodySchema = z.object({ available: z.boolean() })

export async function PATCH(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('sweeper')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
    // profiles grants authenticated users UPDATE on contact fields only.
    const { error } = await createServiceClient()
      .from('profiles')
      .update({ sweeper_available: parsed.data.available })
      .eq('id', auth.userId)
    if (error) throw error
    return Response.json({ data: parsed.data })
  } catch (error) {
    console.error('[sweepers/availability]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
