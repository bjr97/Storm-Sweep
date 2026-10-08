import { cookies } from 'next/headers'
import { z } from 'zod'

import { ADMIN_RETURN_COOKIE, VIEW_AS_COOKIE } from '@/lib/demo'
import { createClient } from '@/lib/supabase/server'

const tokensSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1) })

// "Back to admin": end the preview session (this browser only) and restore the
// admin's saved session. The saved tokens are re-validated by Supabase and the
// role is re-checked, so a tampered cookie can't grant anything.
export async function POST(): Promise<Response> {
  try {
    const store = cookies()
    const raw = store.get(ADMIN_RETURN_COOKIE)?.value
    const supabase = createClient()
    await supabase.auth.signOut({ scope: 'local' })
    store.delete(VIEW_AS_COOKIE)
    store.delete(ADMIN_RETURN_COOKIE)
    if (!raw) return Response.json({ data: { redirect: '/login' } })

    let tokens: z.infer<typeof tokensSchema>
    try {
      const parsed = tokensSchema.safeParse(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')))
      if (!parsed.success) return Response.json({ data: { redirect: '/login' } })
      tokens = parsed.data
    } catch {
      return Response.json({ data: { redirect: '/login' } })
    }
    const { data, error } = await supabase.auth.setSession(tokens)
    if (error || !data.user) return Response.json({ data: { redirect: '/login?redirectTo=/admin' } })
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
    if (profile?.role !== 'admin') {
      await supabase.auth.signOut({ scope: 'local' })
      return Response.json({ data: { redirect: '/login' } })
    }
    return Response.json({ data: { redirect: '/admin/view-as' } })
  } catch (error) {
    console.error('[admin/view-as/exit]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
