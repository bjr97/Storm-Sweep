import type { MetadataRoute } from 'next'

import { PUBLIC_PAGES, SITE } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((p) => ({
    url: `${SITE.url}${p.path === '/' ? '' : p.path}`,
    changeFrequency: 'monthly',
    priority: p.priority,
  }))
}
