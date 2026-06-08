import { hash, verify } from '@node-rs/argon2'

/**
 * Argon2id password hashing for BetterAuth (replaces the default scrypt).
 *
 * Argon2id is the OWASP-recommended algorithm: memory-hard (resists GPU/ASIC
 * cracking) with a side-channel-resistant hybrid. Parameters follow OWASP's
 * "balanced" profile — ~19 MiB and 2 passes — which lands around 50–100 ms per
 * hash on modern hardware: strong against offline attacks, cheap enough for an
 * interactive login. The salt is generated per hash and the full PHC string
 * (algorithm + params + salt + digest) is stored, so `verify` is self-describing
 * and parameters can be raised later without breaking old hashes.
 *
 * Used by both the end-user and operator auth instances via
 * `emailAndPassword.password`.
 */
const ARGON2_OPTIONS = {
  // Argon2id is @node-rs/argon2's default algorithm.
  memoryCost: 19_456, // KiB (19 MiB)
  timeCost: 2, // iterations
  parallelism: 1,
} as const

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS)
}

export function verifyPassword(data: {
  hash: string
  password: string
}): Promise<boolean> {
  return verify(data.hash, data.password)
}
