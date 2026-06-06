import { Resend } from 'resend'

/**
 * Low-level transactional email for BetterAuth auth flows (email verification,
 * password reset). BetterAuth calls this directly — it sends plain-text emails
 * as required by the auth hooks.
 *
 * For rich HTML email templates (registration confirmation, new connection
 * alert, etc.) use `@workspace/email` instead — those are published via the
 * transactional outbox and rendered with React Email.
 *
 * Swap providers (SES, Postmark, …) by re-implementing `sendAuthEmail`.
 */
export interface SendAuthEmailParams {
  to: string
  subject: string
  text: string
}

const DEV_FROM = 'onboarding@resend.dev'

let cachedClient: Resend | null = null
function getClient(apiKey: string): Resend {
  cachedClient ??= new Resend(apiKey)
  return cachedClient
}

export async function sendAuthEmail(
  params: SendAuthEmailParams
): Promise<void> {
  const apiKey = process.env['RESEND_API_KEY']

  if (apiKey) {
    const { error } = await getClient(apiKey).emails.send({
      from: process.env['EMAIL_FROM'] ?? DEV_FROM,
      to: params.to,
      subject: params.subject,
      text: params.text,
    })
    if (error) {
      throw new Error(`Failed to send auth email: ${error.message}`)
    }
    return
  }

  const line = `[auth:email] → ${params.to} | ${params.subject}\n${params.text}`
  if (process.env['NODE_ENV'] === 'production') {
    console.error(
      `${line}\n⚠️  No RESEND_API_KEY configured — set it (and EMAIL_FROM) to send real email.`
    )
  } else {
    console.warn(line)
  }
}
