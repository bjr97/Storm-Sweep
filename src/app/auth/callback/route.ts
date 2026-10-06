import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Landing point for Supabase email links (signup confirmation, magic link,
 * password reset). Exchanges the one-time `code` for a session cookie, then
 * sends the user on to `next` (same-site paths only).
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/dashboard'
  // Only allow relative paths so this can't be used as an open redirect.
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard'

  if (code) {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      console.error('[auth/callback]', error)
    } catch (error) {
      console.error('[auth/callback]', error)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
