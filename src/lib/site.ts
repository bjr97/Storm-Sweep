/** Public site identity for SEO (titles, sitemap, structured data). */
export const SITE = {
  name: 'Storm Sweep',
  url: (process.env.NEXT_PUBLIC_APP_URL ?? 'https://stormsweep.com').replace(/\/$/, ''),
  city: 'Norman',
  region: 'OK',
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
] as const
