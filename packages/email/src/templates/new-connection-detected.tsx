import { Hr, Section } from '@react-email/components'
import { DEFAULT_LOCALE } from '@workspace/core/i18n'

import { EmailButton } from '../components/email-button'
import { EmailLayout } from '../components/email-layout'
import { EmailHeading, EmailText } from '../components/email-typography'
import { emailMessages, type EmailLocale } from '../i18n'
import { emailTokens } from '../tokens'

export interface NewConnectionDetectedProps {
  /** Full name of the account owner. */
  name: string
  /** IP address of the new connection (may be anonymised or null). */
  ipAddress: string | null
  /** User-agent string of the new connection. */
  userAgent: string | null
  /** ISO 8601 timestamp of the detected sign-in. */
  detectedAt: string
  /** URL where the user can review active sessions and revoke access. */
  securityUrl: string
  /** App name (defaults to "App" — override per project). */
  appName?: string
  /** Recipient's language (defaults to the app default). */
  locale?: EmailLocale
}

/**
 * Sent when a new sign-in is detected on an account. Lets the user review
 * and revoke unexpected sessions. Copy lives in `../i18n.ts`.
 */
export function NewConnectionDetected({
  name,
  ipAddress,
  userAgent,
  detectedAt,
  securityUrl,
  appName = 'App',
  locale = DEFAULT_LOCALE,
}: NewConnectionDetectedProps) {
  const m = emailMessages(locale).newConnection
  const formattedDate = new Date(detectedAt).toLocaleString(locale, {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'UTC',
  })

  return (
    <EmailLayout preview={m.preview(appName)} appName={appName} locale={locale}>
      <EmailHeading>{m.heading}</EmailHeading>

      <EmailText>{m.greeting(name)}</EmailText>
      <EmailText>{m.body(appName)}</EmailText>

      {/* Connection details */}
      <Section
        style={{
          background: emailTokens.colors.muted,
          borderRadius: emailTokens.radii.md,
          padding: '20px',
          margin: '24px 0',
        }}
      >
        <EmailText>
          <strong>{m.dateLabel} :</strong> {formattedDate} (UTC)
        </EmailText>
        {ipAddress ? (
          <EmailText>
            <strong>{m.ipLabel} :</strong> {ipAddress}
          </EmailText>
        ) : null}
        {userAgent ? (
          <EmailText small muted>
            <strong>{m.deviceLabel} :</strong> {userAgent}
          </EmailText>
        ) : null}
      </Section>

      <EmailButton href={securityUrl}>{m.cta}</EmailButton>

      <Hr
        style={{ borderColor: emailTokens.colors.border, margin: '24px 0' }}
      />

      <EmailText muted small>
        {m.warning}
      </EmailText>
    </EmailLayout>
  )
}

/** Default export required by React Email preview server. */
export default NewConnectionDetected

NewConnectionDetected.PreviewProps = {
  name: 'Marie Dupont',
  ipAddress: '203.0.113.42',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/125.0',
  detectedAt: new Date().toISOString(),
  securityUrl: 'https://example.com/dashboard/security',
  appName: 'App',
  locale: DEFAULT_LOCALE,
} satisfies NewConnectionDetectedProps
