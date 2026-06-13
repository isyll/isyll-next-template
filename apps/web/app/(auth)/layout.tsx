import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { siteConfig } from '@/lib/site-config'

/**
 * Shared shell for the sign-in / sign-up pages: a branded panel on the left
 * (hidden on small screens) and the form, centered, on the right. The panel
 * uses the brand color (`bg-primary`), so it follows any rebrand automatically.
 */
export default async function AuthLayout({
  children,
}: {
  children: ReactNode
}) {
  const t = await getTranslations('Auth')

  return (
    <div className='grid min-h-svh lg:grid-cols-2'>
      {/* Brand panel */}
      <aside className='relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between'>
        {/* Decorative glow */}
        <div
          aria-hidden='true'
          className='pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary-foreground/10 blur-3xl'
        />
        <div
          aria-hidden='true'
          className='pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-primary-foreground/5 blur-3xl'
        />
        {/*
         * Contrast scrim. The brand primary is mid-light, so the decorative
         * glows above can drop small text below WCAG AA (4.5:1). This uniform
         * darkening keeps every text layer well clear of the threshold while
         * preserving the brand hue — verified by the axe E2E scan.
         */}
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 bg-black/20'
        />

        <Link
          href='/'
          className='relative z-10 text-lg font-semibold tracking-tight'
        >
          {siteConfig.name}
        </Link>

        <div className='relative z-10 space-y-4'>
          <h2 className='text-3xl font-semibold tracking-tight text-balance'>
            {t('panelTitle')}
          </h2>
          <p className='max-w-sm text-pretty text-primary-foreground'>
            {t('panelSubtitle')}
          </p>
        </div>

        <p className='relative z-10 text-sm text-primary-foreground/90'>
          {siteConfig.name}
        </p>
      </aside>

      {/* Form column */}
      <main className='flex min-h-svh items-center justify-center px-4 py-12'>
        <div className='w-full max-w-sm'>{children}</div>
      </main>
    </div>
  )
}
