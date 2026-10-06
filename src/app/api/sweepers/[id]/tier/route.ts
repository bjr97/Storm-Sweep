import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { createServiceClient } from '@/lib/supabase/server'

// Admin pins a Sweeper's tier (or clears the pin to return to the automatic tier).
const bodySchema = z.object({ override: z.enum(['gold', 'silver', 'standard']).nullable() })
const paramsSchema = z.object({ id: z.string().uuid() })

export async function PATCH(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) {
      return Response.json({ error: 'Not authorized' }, { status: auth.status })
    }
    const parsedParams = paramsSchema.safeParse(params)
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsedParams.success || !parsed.success) {
      return Response.json({ error: 'Invalid input' }, { status: 400 })
    }

    // profiles grants authenticated users UPDATE on contact fields only; use the service client.
    const { data, error } = await createServiceClient()
      .from('profiles')
      .update({ sweeper_tier_override: parsed.data.override })
      .eq('id', parsedParams.data.id)
      .eq('role', 'sweeper')
      .select('id, sweeper_tier_override')
    if (error) throw error
    if (!data?.length) return Response.json({ error: 'Sweeper not found' }, { status: 404 })

    return Response.json({ data: data[0] })
  } catch (error) {
    console.error('[sweepers/tier]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
