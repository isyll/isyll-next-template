import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

import { defaultLocale, LOCALE_COOKIE, locales } from './config'

/**
 * Per-request i18n config (cookie-based, no `[locale]` URL segment). Messages
 * are loaded dynamically for the resolved locale; `fr.json` is the canonical
 * shape that types every other catalogue (see `apps/web/global.d.ts`).
 */
export default getRequestConfig(async () => {
  const store = await cookies()
  const cookieLocale = store.get(LOCALE_COOKIE)?.value
  const locale = hasLocale(locales, cookieLocale) ? cookieLocale : defaultLocale

  const messages = (await import(`../messages/${locale}.json`)) as {
    default: Record<string, unknown>
  }

  return { locale, messages: messages.default }
})
