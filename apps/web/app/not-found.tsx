import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

import { buttonVariants } from '@workspace/ui/components/button'

/**
 * 404 – Not Found page.
 *
 * HOW TO CUSTOMISE:
 *   • Update the `NotFound` keys in `messages/fr.json` to match your brand.
 *   • Replace the illustration/icon with your own art.
 *   • This page intentionally has no site header so it feels self-contained.
 */
export default async function NotFound() {
  const t = await getTranslations('NotFound')

  return (
    <main className='flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-16 text-center'>
      {/* Illustration — replace with your own */}
      <div
        className='flex h-24 w-24 items-center justify-center rounded-full bg-muted text-5xl'
        aria-hidden='true'
      >
        404
      </div>

      <div className='max-w-md space-y-2'>
        <h1 className='text-2xl font-semibold tracking-tight'>{t('title')}</h1>
        <p className='text-muted-foreground'>{t('description')}</p>
      </div>

      <Link href='/' className={buttonVariants({ variant: 'default' })}>
        {t('back')}
      </Link>
    </main>
  )
}
