import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Tailwind,
} from '@react-email/components'
import { DEFAULT_LOCALE } from '@workspace/core/i18n'
import type { ReactNode } from 'react'

import { emailMessages, type EmailLocale } from '../i18n'
import { emailTokens } from '../tokens'

interface EmailLayoutProps {
  children: ReactNode
  /** Short plain-text preview shown in email client notification/preview. */
  preview: string
  /** App name shown in header and footer. Defaults to "App". */
  appName?: string
  /** Locale for the footer copy and the `<html lang>` attribute. */
  locale?: EmailLocale
}

/**
 * Root email layout. Wraps every template with:
 *   - Tailwind CSS (scoped to email-safe utilities)
 *   - Consistent container sizing
 *   - Header with app name
 *   - Localized footer with legal / unsubscribe hints
 *
 * Swap the `appName` prop when using from a project that has rebranded.
 */
export function EmailLayout({
  children,
  preview,
  appName = 'App',
  locale = DEFAULT_LOCALE,
}: EmailLayoutProps) {
  const t = emailMessages(locale).common

  return (
    <Html lang={locale} dir='ltr'>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body
          style={{
            backgroundColor: emailTokens.colors.background,
            fontFamily: emailTokens.typography.fontFamily,
            margin: '0',
            padding: '0',
          }}
        >
          <Container
            style={{
              maxWidth: emailTokens.spacing.container,
              margin: '0 auto',
              padding: emailTokens.spacing.padding,
            }}
          >
            {/* Header */}
            <div
              style={{
                borderBottom: `1px solid ${emailTokens.colors.border}`,
                paddingBottom: '24px',
                marginBottom: '32px',
              }}
            >
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: emailTokens.colors.primary,
                  letterSpacing: '-0.5px',
                }}
              >
                {appName}
              </span>
            </div>

            {/* Content */}
            {children}

            {/* Footer */}
            <div
              style={{
                borderTop: `1px solid ${emailTokens.colors.border}`,
                paddingTop: '24px',
                marginTop: '48px',
                textAlign: 'center' as const,
              }}
            >
              <p
                style={{
                  fontSize: '12px',
                  color: emailTokens.colors.mutedForeground,
                  margin: '0 0 8px',
                }}
              >
                {t.footerAccount(appName)}
              </p>
              <p
                style={{
                  fontSize: '12px',
                  color: emailTokens.colors.mutedForeground,
                  margin: '0',
                }}
              >
                {t.footerRights(appName, new Date().getFullYear())}
              </p>
            </div>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
