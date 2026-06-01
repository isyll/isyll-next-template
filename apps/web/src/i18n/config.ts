/** Single source of truth for locales. Add a locale here + a messages file. */
export const locales = ['fr'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'fr'

export const LOCALE_COOKIE = 'NEXT_LOCALE'

export const localeLabels: Record<Locale, string> = {
  fr: 'Français',
}
