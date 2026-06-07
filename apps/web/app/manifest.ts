import type { MetadataRoute } from 'next'

import { siteConfig } from '@/lib/site-config'

/**
 * PWA web app manifest, served at `/manifest.webmanifest`. Driven entirely by
 * `siteConfig`, so it rebrands automatically (no static JSON to edit). Next
 * injects the `<link rel="manifest">` tag for us.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: siteConfig.backgroundColor,
    theme_color: siteConfig.themeColor,
    lang: siteConfig.locale.default,
    dir: 'ltr',
    categories: ['productivity'],
    icons: [
      {
        src: '/icon-192.png',
        type: 'image/png',
        sizes: '192x192',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'any',
      },
      {
        src: '/apple-touch-icon.png',
        type: 'image/png',
        sizes: '180x180',
        purpose: 'any',
      },
    ],
  }
}
