/**
 * Transactional email sink for auth flows (verification, password reset).
 *
 * This is a STUB. Wire a real provider (Resend, AWS SES, Postmark, ...) here
 * before going to production. In development it logs the link to the console
 * so flows are testable without an email provider.
 */
export interface SendAuthEmailParams {
  to: string
  subject: string
  text: string
}

export function sendAuthEmail(params: SendAuthEmailParams): Promise<void> {
  const line = `[auth:email] → ${params.to} | ${params.subject}\n${params.text}`
  if (process.env['NODE_ENV'] === 'production') {
    console.error(
      `${line}\n⚠️  No email provider configured — implement sendAuthEmail in @workspace/auth/email.`
    )
  } else {
    console.warn(line)
  }
  return Promise.resolve()
}
