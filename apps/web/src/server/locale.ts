'use server'

import { hasLocale } from 'next-intl'
import { cookies } from 'next/headers'

import { env } from '@/env'
import {
  defaultLocale,
  LOCALE_COOKIE,
  locales,
  type Locale,
} from '@/i18n/config'

export async function getUserLocale(): Promise<Locale> {
  const store = await cookies()
  const value = store.get(LOCALE_COOKIE)?.value
  return hasLocale(locales, value) ? value : defaultLocale
}

export async function setUserLocale(locale: Locale): Promise<void> {
  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, {
    path: '/',
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  })
}
