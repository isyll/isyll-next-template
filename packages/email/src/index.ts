import { render } from '@react-email/components'
import { Resend } from 'resend'

import type {
  NewConnectionDetectedProps,
  RegistrationConfirmationProps,
} from './templates'
import { NewConnectionDetected, RegistrationConfirmation } from './templates'

export * from './templates'
export * from './tokens'

// ─── Sender ──────────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string
  subject: string
  /** Rendered React Email component. */
  react: React.ReactElement
}

const DEV_FROM = 'onboarding@resend.dev'

let cachedResend: Resend | null = null
function getResend(apiKey: string): Resend {
  cachedResend ??= new Resend(apiKey)
  return cachedResend
}

/**
 * Send a transactional email using Resend + React Email.
 *
 * Falls back to console logging when `RESEND_API_KEY` is absent so the app
 * stays functional in local dev and offline builds. In production, a missing
 * key logs an error (loud failure > silent misconfiguration).
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env['RESEND_API_KEY']
  const from = process.env['EMAIL_FROM'] ?? DEV_FROM

  const html = await render(options.react)

  if (apiKey) {
    const client = getResend(apiKey)
    const { error } = await client.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html,
    })
    if (error) {
      throw new Error(
        `[email] Failed to send "${options.subject}": ${error.message}`
      )
    }
    return
  }

  const line = `[email] → ${options.to} | ${options.subject}\n${html.slice(0, 200)}…`
  if (process.env['NODE_ENV'] === 'production') {
    console.error(
      `${line}\n⚠️  No RESEND_API_KEY configured — set it (and EMAIL_FROM) to send real email.`
    )
  } else {
    console.warn(line)
  }
}

// ─── Template senders ────────────────────────────────────────────────────────

/**
 * Send the registration confirmation / email-verification email.
 * Triggered by the `user.email_verification_requested` domain event.
 */
export async function sendRegistrationConfirmation(
  to: string,
  props: RegistrationConfirmationProps
): Promise<void> {
  await sendEmail({
    to,
    subject: `Confirmez votre adresse e-mail — ${props.appName ?? 'App'}`,
    react: RegistrationConfirmation(props),
  })
}

/**
 * Send the new-connection-detected security alert.
 * Triggered by the `user.new_connection` domain event.
 */
export async function sendNewConnectionAlert(
  to: string,
  props: NewConnectionDetectedProps
): Promise<void> {
  await sendEmail({
    to,
    subject: `Nouvelle connexion détectée sur votre compte — ${props.appName ?? 'App'}`,
    react: NewConnectionDetected(props),
  })
}
