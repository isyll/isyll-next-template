import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

import { buttonVariants } from '@workspace/ui/components/button'

import { SiteHeader } from '@/components/site-header'

export default async function HomePage() {
  const t = await getTranslations('Home')

  return (
    <div className='flex min-h-svh flex-col'>
      <SiteHeader />
      <main className='mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center'>
        <h1 className='text-4xl font-semibold tracking-tight text-balance sm:text-5xl'>
          {t('title')}
        </h1>
        <p className='max-w-xl text-lg text-pretty text-muted-foreground'>
          {t('subtitle')}
        </p>
        <div className='flex flex-wrap items-center justify-center gap-3'>
          <Link href='/dashboard' className={buttonVariants({ size: 'lg' })}>
            {t('cta')}
          </Link>
          <Link
            href='/login'
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            {t('login')}
          </Link>
        </div>
      </main>
    </div>
  )
}
