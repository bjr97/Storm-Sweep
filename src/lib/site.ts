/** Absolute site origin; tolerates a host saved without https:// (a bad value must never break the build). */
function siteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim() || process.env.VERCEL_PROJECT_PRODUCTION_URL || 'stormsweep.com'
  const withProtocol = /^https?:\/\//.test(raw) ? raw : `https://${raw}`
  try {
    return new URL(withProtocol).origin
  } catch {
    return 'https://stormsweep.com'
  }
}

/** Public site identity for SEO (titles, sitemap, structured data). */
export const SITE = {
  name: 'Storm Sweep',
  url: siteUrl(),
  city: 'Norman',
  region: 'OK',
  /** Optional public contact details (env); pages fall back to the Help form + text replies. */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null,
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || null,
  description:
    'Underground storm shelter cleaning in Norman, Oklahoma — deep cleans, LED lighting, door hardware and emergency prep kits, with before & after photos of every visit.',
} as const

/** Pages that should appear in search (everything else is private or transactional). */
export const PUBLIC_PAGES = [
  { path: '/', priority: 1 },
  { path: '/services', priority: 0.9 },
  { path: '/pricing', priority: 0.9 },
  { path: '/book', priority: 0.8 },
  { path: '/about', priority: 0.6 },
  { path: '/sweepers/apply', priority: 0.4 },
  { path: '/faq', priority: 0.6 },
  { path: '/terms', priority: 0.2 },
  { path: '/privacy', priority: 0.2 },
] as const
