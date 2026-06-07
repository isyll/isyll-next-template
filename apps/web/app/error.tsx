'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect } from 'react'

import { buttonVariants } from '@workspace/ui/components/button'

/**
 * Route-segment error boundary — catches errors thrown by Server/Client
 * Components in the subtree. Next.js renders this page instead of crashing
 * the whole app.
 *
 * HOW TO CUSTOMISE:
 *   • Update the copy to match your brand voice.
 *   • Wire `reportError` or Sentry here if you need client-side error tracking.
 *   • For root-level (layout) errors use `global-error.tsx` instead.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('ErrorPage')

  useEffect(() => {
    // Log to your observability service here.
    console.error('[error-boundary]', error)
  }, [error])

  return (
    <main className='flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-16 text-center'>
      {/* Icon — replace with your own */}
      <div
        className='flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10 text-5xl'
        aria-hidden='true'
      >
        ⚠️
      </div>

      <div className='max-w-md space-y-2'>
        <h1 className='text-2xl font-semibold tracking-tight'>{t('title')}</h1>
        <p className='text-muted-foreground'>{t('description')}</p>
        {error.digest ? (
          <p className='font-mono text-xs text-muted-foreground'>
            {error.digest}
          </p>
        ) : null}
      </div>

      <div className='flex flex-wrap items-center justify-center gap-3'>
        <button
          onClick={() => {
            reset()
          }}
          className={buttonVariants({ variant: 'default' })}
        >
          {t('retry')}
        </button>
        <Link href='/' className={buttonVariants({ variant: 'outline' })}>
          {t('back')}
        </Link>
      </div>
    </main>
  )
}
