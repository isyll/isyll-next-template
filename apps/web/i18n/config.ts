import {
  APP_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  type AppLocale,
} from '@workspace/core/i18n'

/**
 * Locales are defined once in `@workspace/core/i18n` (shared with auth emails
 * and the email package). Re-exported here under the names next-intl expects.
 * To add a locale: extend `APP_LOCALES` in core, then add a `messages/<x>.json`.
 */
export const locales = APP_LOCALES
export type Locale = AppLocale
export const defaultLocale: Locale = DEFAULT_LOCALE
export const localeLabels = LOCALE_LABELS

/** Cookie that persists the visitor's locale (no `[locale]` URL segment). */
export const LOCALE_COOKIE = 'NEXT_LOCALE'
