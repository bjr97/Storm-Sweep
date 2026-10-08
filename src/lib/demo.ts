/** Demo accounts for admin "View as" previews. Never real people. */

// Reserved domain (RFC 2606): mail to it can never reach anyone.
export const DEMO_EMAIL_DOMAIN = 'example.com'
export const DEMO_EMAILS = {
  customer: `storm-sweep-demo-customer@${DEMO_EMAIL_DOMAIN}`,
  sweeper: `storm-sweep-demo-sweeper@${DEMO_EMAIL_DOMAIN}`,
} as const

export function isDemoEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`))
}

/** Cookie describing the current preview (readable by the page; holds no secrets). */
export const VIEW_AS_COOKIE = 'ss_view_as'
/** httpOnly cookie holding the admin's own session to return to. */
export const ADMIN_RETURN_COOKIE = 'ss_admin_return'

export type ViewAs = { name: string; role: 'customer' | 'sweeper'; demo: boolean }

export function parseViewAs(raw: string | undefined): ViewAs | null {
  if (!raw) return null
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as Partial<ViewAs>
    if ((v.role === 'customer' || v.role === 'sweeper') && typeof v.name === 'string') {
      return { name: v.name, role: v.role, demo: v.demo === true }
    }
  } catch {
    // ignore a malformed cookie
  }
  return null
}
