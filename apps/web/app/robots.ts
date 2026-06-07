import type { MetadataRoute } from 'next'

import { siteConfig } from '@/lib/site-config'

/**
 * robots.txt — controls search engine crawl behaviour.
 *
 * HOW TO CUSTOMISE:
 *   • Add `disallow` paths for private routes (e.g. '/dashboard').
 *   • Add more `rules` entries for specific user-agents.
 *   • The `/admin` path is already disallowed by default.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/dashboard', '/api/'],
      },
    ],
    sitemap: `${siteConfig.canonicalBase}/sitemap.xml`,
    host: siteConfig.canonicalBase,
  }
}
