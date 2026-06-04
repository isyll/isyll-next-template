import { describe, expect, it } from 'vitest'

import { authEnvSchema } from './env'

describe('authEnvSchema', () => {
  it('accepts an empty environment (every auth var is optional)', () => {
    expect(authEnvSchema.safeParse({}).success).toBe(true)
  })

  it('rejects secrets shorter than 32 characters', () => {
    expect(
      authEnvSchema.safeParse({ AUTH_USER_SECRET: 'too-short' }).success
    ).toBe(false)
    expect(
      authEnvSchema.safeParse({ AUTH_ADMIN_SECRET: 'also-too-short' }).success
    ).toBe(false)
  })

  it('accepts a >=32 char secret with a valid URL', () => {
    const result = authEnvSchema.safeParse({
      AUTH_USER_SECRET: 'a'.repeat(32),
      AUTH_USER_URL: 'https://app.example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a malformed auth URL', () => {
    expect(
      authEnvSchema.safeParse({ AUTH_ADMIN_URL: 'not-a-url' }).success
    ).toBe(false)
  })
})
