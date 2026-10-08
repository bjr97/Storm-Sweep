import { z } from 'zod'

import { createServiceClient } from '@/lib/supabase/server'

// Public: join the waitlist for a ZIP we don't serve yet. Joining twice is a no-op.
const bodySchema = z.object({
  zip: z.string().regex(/^\d{5}$/),
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(250).optional(),
})

export async function POST(req: Request): Promise<Response> {
  try {
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return Response.json({ error: 'Enter a valid email and ZIP' }, { status: 400 })
    const b = parsed.data
    const { error } = await createServiceClient()
      .from('waitlist')
      .upsert({ zip: b.zip, email: b.email, name: b.name || null, phone: b.phone || null, address: b.address || null }, { onConflict: 'email,zip', ignoreDuplicates: true })
    if (error) throw error
    return Response.json({ data: { ok: true }, message: 'You’re on the list' })
  } catch (error) {
    console.error('[waitlist]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
