import { describe, expect, it } from 'vitest'

import { hashPassword, verifyPassword } from './password'

describe('argon2id password hashing', () => {
  it('produces a PHC argon2id hash that verifies', async () => {
    const password = 'correct horse battery staple'
    const digest = await hashPassword(password)

    expect(digest.startsWith('$argon2id$')).toBe(true)
    expect(await verifyPassword({ hash: digest, password })).toBe(true)
  })

  it('rejects an incorrect password', async () => {
    const digest = await hashPassword('a-very-strong-passphrase-9876')
    expect(await verifyPassword({ hash: digest, password: 'nope' })).toBe(false)
  })

  it('salts each hash (same password → different digests)', async () => {
    const [a, b] = await Promise.all([
      hashPassword('same-password-value'),
      hashPassword('same-password-value'),
    ])
    expect(a).not.toBe(b)
  })
})
