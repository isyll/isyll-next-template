import { render } from '@react-email/components'
import { DEFAULT_LOCALE } from '@workspace/core/i18n'
import { Resend } from 'resend'

import { emailMessages } from './i18n'
import type {
  NewConnectionDetectedProps,
  PasswordResetProps,
  RegistrationConfirmationProps,
} from './templates'
import {
  NewConnectionDetected,
  PasswordReset,
  RegistrationConfirmation,
} from './templates'

export * from './i18n'
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
 * Send the registration confirmation / email-verification email. Subject and
 * body are localized via `props.locale` (defaults to the app default).
 */
export async function sendRegistrationConfirmation(
  to: string,
  props: RegistrationConfirmationProps
): Promise<void> {
  const appName = props.appName ?? 'App'
  await sendEmail({
    to,
    subject: emailMessages(props.locale ?? DEFAULT_LOCALE).registration.subject(
      appName
    ),
    react: RegistrationConfirmation(props),
  })
}

/** Send the password-reset email. Localized via `props.locale`. */
export async function sendPasswordReset(
  to: string,
  props: PasswordResetProps
): Promise<void> {
  const appName = props.appName ?? 'App'
  await sendEmail({
    to,
    subject: emailMessages(
      props.locale ?? DEFAULT_LOCALE
    ).passwordReset.subject(appName),
    react: PasswordReset(props),
  })
}

/** Send the new-connection-detected security alert. Localized via `props.locale`. */
export async function sendNewConnectionAlert(
  to: string,
  props: NewConnectionDetectedProps
): Promise<void> {
  const appName = props.appName ?? 'App'
  await sendEmail({
    to,
    subject: emailMessages(
      props.locale ?? DEFAULT_LOCALE
    ).newConnection.subject(appName),
    react: NewConnectionDetected(props),
  })
}
