import { Resend } from 'resend'

/**
 * Transactional email for auth flows (verification, password reset).
 *
 * Concrete provider: Resend. When `RESEND_API_KEY` is set, mail is sent for
 * real (from `EMAIL_FROM`, falling back to Resend's onboarding sender). With no
 * key configured it degrades gracefully: in development the message is logged
 * to the console so flows stay testable; in production it logs an error so the
 * misconfiguration is loud rather than silent.
 *
 * Swap providers (SES, Postmark, ...) by re-implementing this one function.
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
