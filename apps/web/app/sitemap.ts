import type { MetadataRoute } from 'next'

import { siteConfig } from '@/lib/site-config'

/**
 * Dynamic sitemap. Next.js serialises this into /sitemap.xml automatically.
 *
 * HOW TO EXTEND:
 *   1. Add static routes below.
 *   2. For dynamic content (blog posts, product pages) query the database here
 *      and map rows to `SitemapEntry` objects.
 *   3. For very large sitemaps use `generateSitemaps()` to split into chunks.
 *
 * Priority and changeFrequency are hints for crawlers, not commands.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.canonicalBase

  // Add every public URL your site exposes.
  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
      alternates: {
        languages: Object.fromEntries(
          siteConfig.locale.supported.map((locale) => [
            locale,
            `${base}/${locale}`,
          ])
        ),
      },
    },
    {
      url: `${base}/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${base}/register`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ]
}
