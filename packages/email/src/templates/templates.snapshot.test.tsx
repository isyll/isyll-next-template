import { render } from 'react-email'
import { APP_LOCALES, type AppLocale } from '@workspace/core/i18n'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'

import {
  NewConnectionDetected,
  PasswordReset,
  RegistrationConfirmation,
} from './index'

/**
 * Per-locale rendered-HTML snapshots of every transactional template, so copy
 * changes (and their localization) are reviewable in the diff. Runs in the
 * `test` task → CI. To accept intentional copy changes: `pnpm --filter
 * @workspace/email test -- -u`.
 */

// Fixed inputs keep snapshots deterministic across runs and across years.
const APP_NAME = 'Acme'
const FIXED_DATE = '2026-01-02T15:04:05.000Z'

// The layout footer stamps the current year; pin it so the snapshot is stable.
const normalize = (html: string): string => html.replace(/© \d{4}/g, '© YYYY')

interface TemplateCase {
  readonly name: string
  readonly build: (locale: AppLocale) => ReactElement
}

const templates: readonly TemplateCase[] = [
  {
    name: 'registration-confirmation',
    build: (locale) =>
      RegistrationConfirmation({
        name: 'Marie Dupont',
        verificationUrl: 'https://example.com/verify?token=abc123',
        appName: APP_NAME,
        locale,
      }),
  },
  {
    name: 'password-reset',
    build: (locale) =>
      PasswordReset({
        resetUrl: 'https://example.com/reset?token=abc123',
        appName: APP_NAME,
        locale,
      }),
  },
  {
    name: 'new-connection-detected',
    build: (locale) =>
      NewConnectionDetected({
        name: 'Marie Dupont',
        ipAddress: '203.0.113.42',
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/125.0',
        detectedAt: FIXED_DATE,
        securityUrl: 'https://example.com/dashboard/security',
        appName: APP_NAME,
        locale,
      }),
  },
]

describe('transactional email templates', () => {
  for (const locale of APP_LOCALES) {
    for (const template of templates) {
      it(`renders ${template.name} in "${locale}"`, async () => {
        const html = await render(template.build(locale))
        expect(normalize(html)).toMatchSnapshot()
      })
    }
  }
})
