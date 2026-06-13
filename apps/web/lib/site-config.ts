import { env } from '@/env'

/**
 * Centralized site configuration — single source of truth for metadata, SEO,
 * and analytics. Customize this file when rebranding.
 *
 * WHAT TO UPDATE WHEN REBRANDING:
 *   1. `name`, `description`, `tagline`
 *   2. `url` → your production domain
 *   3. `locale.default` and `locale.supported` if adding languages
 *   4. `links.*` with your actual social / repo URLs
 *   5. `analytics.*` env vars in .env (never hardcode IDs here)
 *   6. `author.name` and `author.email`
 *   7. `ogImage` → replace public/og-image.png with your own 1200×630 image
 *   8. `themeColor` → hex of your brand color (PWA manifest + browser chrome)
 *
 * `pnpm project:init` fills in name, description, author and links for you.
 */

// env.NEXT_PUBLIC_APP_URL has a Zod default but can be undefined when
// SKIP_ENV_VALIDATION=1 bypasses Zod (e.g. CI builds without a .env file).
const APP_URL: string = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const siteConfig = {
  name: 'App',
  tagline: 'Démarrez votre projet en quelques minutes',
  description:
    'Monorepo Next.js 16, React 19, TypeScript strict, BetterAuth, Drizzle et i18n — prêt pour la production.',
  url: APP_URL,

  /** Absolute URL to the Open Graph image (1200×630 px). */
  ogImage: `${APP_URL}/og-image.png`,

  /** <link rel="canonical"> base. Never has a trailing slash. */
  canonicalBase: APP_URL.replace(/\/$/, ''),

  /**
   * PWA manifest + browser-chrome colors (hex; the manifest can't read CSS
   * vars). `themeColor` should be the hex of the `--brand` token in
   * `packages/ui/src/styles/globals.css`. Default: indigo.
   */
  themeColor: '#4f46e5',
  backgroundColor: '#ffffff',

  locale: {
    default: 'fr',
    supported: ['fr', 'en'] as string[],
  },

  links: {
    twitter: '',
    github: '',
    linkedin: '',
  },

  /** Contact info for security.txt and Schema.org. */
  author: {
    name: 'App',
    email: 'contact@example.com',
  },

  /**
   * Analytics & search console IDs. Set via environment variables so they
   * never appear in committed code. Add the env vars to .env.local for dev
   * and to your hosting platform for production.
   *
   * Google Analytics:        NEXT_PUBLIC_GA_MEASUREMENT_ID  (e.g. G-XXXXXXXXXX)
   * Google Tag Manager:      NEXT_PUBLIC_GTM_ID             (e.g. GTM-XXXXXXX)
   * Google Search Console:   NEXT_PUBLIC_GSC_VERIFICATION   (meta tag content)
   * Bing Webmaster Tools:    NEXT_PUBLIC_BING_VERIFICATION  (meta tag content)
   */
  analytics: {
    googleMeasurementId: env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    googleTagManagerId: env.NEXT_PUBLIC_GTM_ID,
    googleSearchConsoleVerification: env.NEXT_PUBLIC_GSC_VERIFICATION,
    bingVerification: env.NEXT_PUBLIC_BING_VERIFICATION,
  },
} as const

export type SiteConfig = typeof siteConfig
