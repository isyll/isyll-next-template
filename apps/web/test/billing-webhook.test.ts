import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { verifyStripeSignature } from '@/lib/billing/webhook'

const SECRET = 'whsec_test_secret'
const PAYLOAD = '{"id":"evt_123","type":"customer.subscription.updated"}'

function sign(payload: string, timestamp: number, secret = SECRET): string {
  const signature = createHmac('sha256', secret)
    .update(`${String(timestamp)}.${payload}`)
    .digest('hex')
  return `t=${String(timestamp)},v1=${signature}`
}

describe('verifyStripeSignature', () => {
  const now = 1_700_000_000

  it('accepts a valid, recent signature', () => {
    const header = sign(PAYLOAD, now)
    expect(
      verifyStripeSignature(PAYLOAD, header, SECRET, { nowSeconds: now })
    ).toBe(true)
  })

  it('rejects a tampered payload', () => {
    const header = sign(PAYLOAD, now)
    expect(
      verifyStripeSignature(`${PAYLOAD} `, header, SECRET, { nowSeconds: now })
    ).toBe(false)
  })

  it('rejects a wrong secret', () => {
    const header = sign(PAYLOAD, now, 'whsec_other')
    expect(
      verifyStripeSignature(PAYLOAD, header, SECRET, { nowSeconds: now })
    ).toBe(false)
  })

  it('rejects a timestamp outside the tolerance window', () => {
    const header = sign(PAYLOAD, now - 10_000)
    expect(
      verifyStripeSignature(PAYLOAD, header, SECRET, { nowSeconds: now })
    ).toBe(false)
  })

  it('rejects a missing or malformed header', () => {
    expect(
      verifyStripeSignature(PAYLOAD, null, SECRET, { nowSeconds: now })
    ).toBe(false)
    expect(
      verifyStripeSignature(PAYLOAD, 't=1', SECRET, { nowSeconds: now })
    ).toBe(false)
  })

  it('accepts when any of multiple v1 signatures matches', () => {
    const valid = sign(PAYLOAD, now).split('v1=')[1]
    const header = `t=${String(now)},v1=deadbeef,v1=${valid ?? ''}`
    expect(
      verifyStripeSignature(PAYLOAD, header, SECRET, { nowSeconds: now })
    ).toBe(true)
  })
})
