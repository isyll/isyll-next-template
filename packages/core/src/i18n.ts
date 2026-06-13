/**
 * Single source of truth for the application's locales (BCP-47 short codes).
 *
 * Lives in `@workspace/core` so every layer agrees on the same set: the web app
 * (`apps/web/i18n`), localized auth emails (`@workspace/auth`), and the email
 * templates (`@workspace/email`). Add a locale here, then add its message
 * catalogues in each consumer.
 */
export const APP_LOCALES = ['fr', 'en'] as const

export type AppLocale = (typeof APP_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = 'fr'

/** Self-named labels for each locale (for language switchers). */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  fr: 'Français',
  en: 'English',
}

/** Type guard: is `value` one of the supported locales? */
export function isAppLocale(value: unknown): value is AppLocale {
  return (
    typeof value === 'string' &&
    (APP_LOCALES as readonly string[]).includes(value)
  )
}

/** Coerce any value to a supported locale, falling back to {@link DEFAULT_LOCALE}. */
export function resolveLocale(value: unknown): AppLocale {
  return isAppLocale(value) ? value : DEFAULT_LOCALE
}
