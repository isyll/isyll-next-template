'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useTransition } from 'react'

import { Button } from '@workspace/ui/components/button'

import { localeLabels, locales } from '@/i18n/config'
import { setUserLocale } from '@/server/locale'

export function LocaleSwitcher() {
  const activeLocale = useLocale()
  const t = useTranslations('LocaleSwitcher')
  const [isPending, startTransition] = useTransition()

  return (
    <div
      role='group'
      aria-label={t('label')}
      className='flex items-center gap-1'
    >
      {locales.map((locale) => (
        <Button
          key={locale}
          size='sm'
          variant={locale === activeLocale ? 'secondary' : 'ghost'}
          aria-pressed={locale === activeLocale}
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await setUserLocale(locale)
            })
          }}
        >
          {localeLabels[locale]}
        </Button>
      ))}
    </div>
  )
}
