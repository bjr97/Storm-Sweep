import { partnerInputSchema } from '@/lib/admin/partnerRules'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const parsed = partnerInputSchema.safeParse(await req.json())
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }
    const { data, error } = await createClient().from('partners').insert(parsed.data).select('id').single()
    if (error) {
      if (error.code === '23505') return Response.json({ error: 'That referral code is already taken', code: 'CODE_TAKEN' }, { status: 409 })
      throw error
    }
    return Response.json({ data })
  } catch (error) {
    console.error('[admin/partners]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
