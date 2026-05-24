import { NextResponse, type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'
import type { UserRole } from '@/types/database'

const PUBLIC_PATHS = new Set([
  '/',
  '/services',
  '/pricing',
  '/book',
  '/login',
  '/register',
  '/forgot-password',
  '/about',
])

const PUBLIC_PREFIXES = ['/sweepers/apply', '/book/'] as const

const ROLE_ROUTES: Record<string, UserRole> = {
  '/admin': 'admin',
  '/sweeper': 'sweeper',
  '/dashboard': 'customer',
  '/history': 'customer',
  '/photos': 'customer',
  '/membership': 'customer',
  '/account': 'customer',
}

const PORTAL_ROOT: Record<UserRole, string> = {
  customer: '/dashboard',
  sweeper: '/sweeper',
  admin: '/admin',
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) {
    return true
  }
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  )
}

function getRequiredRole(pathname: string): UserRole | null {
  for (const [prefix, role] of Object.entries(ROLE_ROUTES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return role
    }
  }
  return null
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { supabase, user, response } = await updateSession(request)
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api')) {
    return response
  }

  if (isPublicPath(pathname)) {
    return response
  }

  const requiredRole = getRequiredRole(pathname)

  if (!requiredRole) {
    return response
  }

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role as UserRole | undefined

  if (!userRole || userRole !== requiredRole) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = userRole ? PORTAL_ROOT[userRole] : '/login'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
