import { Hr, Section } from '@react-email/components'

import { EmailButton } from '../components/email-button'
import { EmailLayout } from '../components/email-layout'
import { EmailHeading, EmailText } from '../components/email-typography'
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
}

/**
 * Sent when a new sign-in is detected on an account. Lets the user review
 * and revoke unexpected sessions.
 *
 * HOW TO CUSTOMISE:
 *   1. Update `appName` to your product name (or pass it as a prop).
 *   2. Adjust the copy and the `securityUrl` to point to your session
 *      management page once it is built.
 *   3. Update `emailTokens` in `src/tokens.ts` to match your brand colours.
 */
export function NewConnectionDetected({
  name,
  ipAddress,
  userAgent,
  detectedAt,
  securityUrl,
  appName = 'App',
}: NewConnectionDetectedProps) {
  const formattedDate = new Date(detectedAt).toLocaleString('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'UTC',
  })

  return (
    <EmailLayout
      preview={`Nouvelle connexion détectée sur votre compte ${appName}`}
      appName={appName}
    >
      <EmailHeading>Nouvelle connexion détectée</EmailHeading>

      <EmailText>Bonjour {name},</EmailText>
      <EmailText>
        Une nouvelle connexion a été détectée sur votre compte{' '}
        <strong>{appName}</strong>. Si c&apos;était vous, vous n&apos;avez rien
        à faire. Si ce n&apos;était pas vous, sécurisez votre compte
        immédiatement.
      </EmailText>

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
          <strong>Date et heure :</strong> {formattedDate} (UTC)
        </EmailText>
        {ipAddress ? (
          <EmailText>
            <strong>Adresse IP :</strong> {ipAddress}
          </EmailText>
        ) : null}
        {userAgent ? (
          <EmailText small muted>
            <strong>Appareil :</strong> {userAgent}
          </EmailText>
        ) : null}
      </Section>

      <EmailButton href={securityUrl}>
        Vérifier mes sessions actives
      </EmailButton>

      <Hr
        style={{ borderColor: emailTokens.colors.border, margin: '24px 0' }}
      />

      <EmailText muted small>
        Si vous ne reconnaissez pas cette connexion, changez votre mot de passe
        et contactez notre support. En cas d&apos;urgence, déconnectez toutes
        les sessions depuis la page de sécurité de votre compte.
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
} satisfies NewConnectionDetectedProps
