import { cookies } from 'next/headers'
import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { ADMIN_RETURN_COOKIE, VIEW_AS_COOKIE, type ViewAs } from '@/lib/demo'
import { ensureDemoData } from '@/lib/demoSeed'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Admin "View as": signs this browser in as a customer or Sweeper, keeping the
// admin's own session in an httpOnly cookie for "Back to admin". Real accounts
// are read-only (middleware blocks every write); demo accounts are fully usable.
const bodySchema = z.union([
  z.object({ demo: z.enum(['customer', 'sweeper']) }),
  z.object({ userId: z.string().uuid() }),
])

const COOKIE_OPTS = { path: '/', sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', maxAge: 8 * 3600 }

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })

    const svc = createServiceClient()
    let targetId: string
    if ('demo' in parsed.data) {
      const demo = await ensureDemoData()
      targetId = parsed.data.demo === 'customer' ? demo.customerId : demo.sweeperId
    } else {
      targetId = parsed.data.userId
    }
    const { data: target } = await svc.from('profiles').select('id, role, full_name, is_demo').eq('id', targetId).maybeSingle()
    if (!target || (target.role !== 'customer' && target.role !== 'sweeper')) {
      return Response.json({ error: 'You can only preview customers and Sweepers', code: 'BAD_TARGET' }, { status: 400 })
    }
    const { data: authUser } = await svc.auth.admin.getUserById(target.id)
    const email = authUser.user?.email
    if (!email) return Response.json({ error: 'That account has no email to sign in with', code: 'NO_EMAIL' }, { status: 400 })

    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return Response.json({ error: 'Not signed in' }, { status: 401 })

    // One-time, server-side sign-in link (nothing is emailed).
    const { data: link, error: linkErr } = await svc.auth.admin.generateLink({ type: 'magiclink', email })
    if (linkErr) throw linkErr

    const store = cookies()
    const back = Buffer.from(JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token })).toString('base64url')
    store.set(ADMIN_RETURN_COOKIE, back, { ...COOKIE_OPTS, httpOnly: true })
    const { error: otpErr } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token })
    if (otpErr) {
      store.delete(ADMIN_RETURN_COOKIE)
      throw otpErr
    }
    const viewAs: ViewAs = { name: target.full_name ?? 'Account', role: target.role, demo: target.is_demo }
    store.set(VIEW_AS_COOKIE, encodeURIComponent(JSON.stringify(viewAs)), { ...COOKIE_OPTS, httpOnly: false })
    return Response.json({ data: { redirect: target.role === 'customer' ? '/dashboard' : '/sweeper' } })
  } catch (error) {
    console.error('[admin/view-as]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
