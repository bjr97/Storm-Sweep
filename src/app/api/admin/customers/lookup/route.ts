import { z } from 'zod'

import { getUserIdByEmail } from '@/lib/auth/users'
import { requireRole } from '@/lib/auth/requireRole'
import { createServiceClient } from '@/lib/supabase/server'

// Admin phone booking: pre-fill an existing customer by email.
export const dynamic = 'force-dynamic'

export async function GET(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const email = z.string().trim().email().safeParse(new URL(req.url).searchParams.get('email'))
    if (!email.success) return Response.json({ error: 'Invalid email' }, { status: 400 })
    const id = await getUserIdByEmail(email.data)
    if (!id) return Response.json({ data: null })
    const { data: p } = await createServiceClient()
      .from('profiles')
      .select('full_name, phone, address, role, membership_status, visits_used')
      .eq('id', id)
      .maybeSingle()
    if (!p || p.role !== 'customer') return Response.json({ data: null })
    return Response.json({
      data: {
        fullName: p.full_name,
        phone: p.phone,
        address: p.address,
        member: p.membership_status === 'active' ? { visitsUsed: p.visits_used } : null,
      },
    })
  } catch (error) {
    console.error('[admin/customers/lookup]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
