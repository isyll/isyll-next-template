import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

import messages from '../messages/fr.json'

import { defaultLocale, LOCALE_COOKIE, locales } from './config'

/**
 * Per-request i18n config (cookie-based, no `[locale]` URL segment). For now
 * there is a single locale (fr) so messages are imported statically; when you
 * add locales, switch to a dynamic `import(\`../messages/${locale}.json\`)`.
 */
export default getRequestConfig(async () => {
  const store = await cookies()
  const cookieLocale = store.get(LOCALE_COOKIE)?.value
  const locale = hasLocale(locales, cookieLocale) ? cookieLocale : defaultLocale

  return { locale, messages }
})
