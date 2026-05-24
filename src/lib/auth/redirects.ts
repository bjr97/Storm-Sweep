import type { UserRole } from '@/types/database'

export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin',
  sweeper: '/sweeper',
  customer: '/dashboard',
}

const ROLE_PATH_PREFIXES: Record<UserRole, string[]> = {
  admin: ['/admin'],
  sweeper: ['/sweeper'],
  customer: ['/dashboard', '/history', '/photos', '/membership', '/account'],
}

function getRoleForPath(pathname: string): UserRole | null {
  for (const [role, prefixes] of Object.entries(ROLE_PATH_PREFIXES) as [
    UserRole,
    string[],
  ][]) {
    if (
      prefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      )
    ) {
      return role
    }
  }
  return null
}

export function getPostAuthRedirect(
  role: UserRole,
  redirectTo: string | null
): string {
  if (
    redirectTo &&
    redirectTo.startsWith('/') &&
    !redirectTo.startsWith('//') &&
    getRoleForPath(redirectTo) === role
  ) {
    return redirectTo
  }
  return ROLE_HOME[role]
}
