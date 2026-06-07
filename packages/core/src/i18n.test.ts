import { describe, expect, it } from 'vitest'

import {
  APP_LOCALES,
  DEFAULT_LOCALE,
  isAppLocale,
  LOCALE_LABELS,
  resolveLocale,
} from './i18n'

describe('i18n locale registry', () => {
  it('keeps DEFAULT_LOCALE within APP_LOCALES', () => {
    expect(APP_LOCALES).toContain(DEFAULT_LOCALE)
  })

  it('has a label for every supported locale', () => {
    for (const locale of APP_LOCALES) {
      expect(LOCALE_LABELS[locale]).toBeTypeOf('string')
    }
  })

  describe('isAppLocale', () => {
    it('accepts supported locales', () => {
      expect(isAppLocale('fr')).toBe(true)
    })

    it('rejects unsupported locales and non-strings', () => {
      expect(isAppLocale('en')).toBe(false)
      expect(isAppLocale(undefined)).toBe(false)
      expect(isAppLocale(42)).toBe(false)
    })
  })

  describe('resolveLocale', () => {
    it('passes through a supported locale', () => {
      expect(resolveLocale('fr')).toBe('fr')
    })

    it('falls back to the default for anything else', () => {
      expect(resolveLocale('en')).toBe(DEFAULT_LOCALE)
      expect(resolveLocale(null)).toBe(DEFAULT_LOCALE)
    })
  })
})
