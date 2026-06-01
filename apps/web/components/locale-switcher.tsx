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
    <div className='flex items-center gap-1' aria-label={t('label')}>
      {locales.map((locale) => (
        <Button
          key={locale}
          size='sm'
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- always true with one locale; meaningful once more are added
          variant={locale === activeLocale ? 'secondary' : 'ghost'}
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
