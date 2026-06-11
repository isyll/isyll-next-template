import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verify a Stripe webhook signature without the SDK. Stripe signs
 * `${timestamp}.${rawBody}` with HMAC-SHA256 and sends it in the
 * `Stripe-Signature` header as `t=<ts>,v1=<sig>[,v1=<sig>…]`. Pure and
 * constant-time; pass `nowSeconds` in tests to make it deterministic.
 */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  options?: { toleranceSeconds?: number; nowSeconds?: number }
): boolean {
  if (!header || !secret) return false

  const tolerance = options?.toleranceSeconds ?? 300
  const now = options?.nowSeconds ?? Math.floor(Date.now() / 1000)

  let timestamp: number | null = null
  const signatures: string[] = []
  for (const part of header.split(',')) {
    const [key, value] = part.split('=')
    if (!value) continue
    if (key === 't') timestamp = Number(value)
    else if (key === 'v1') signatures.push(value)
  }

  if (timestamp === null || !Number.isFinite(timestamp)) return false
  if (signatures.length === 0) return false
  if (tolerance > 0 && Math.abs(now - timestamp) > tolerance) return false

  const expected = createHmac('sha256', secret)
    .update(`${String(timestamp)}.${payload}`)
    .digest('hex')
  const expectedBuffer = Buffer.from(expected)

  return signatures.some((signature) => {
    const candidate = Buffer.from(signature)
    return (
      candidate.length === expectedBuffer.length &&
      timingSafeEqual(candidate, expectedBuffer)
    )
  })
}
