import type { MetadataRoute } from 'next'

import { SITE } from '@/lib/site'

// Keep private portals and APIs out of search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/sweeper$', '/sweeper/', '/dashboard', '/history', '/photos', '/membership', '/account', '/api/', '/book/confirmation', '/login', '/register'],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  }
}
