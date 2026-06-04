import * as z from 'zod'
import { describe, expect, it } from 'vitest'

import { parseEnv } from './env'

const schema = z.object({
  PORT: z.coerce.number().int(),
  NAME: z.string().min(1),
})

describe('parseEnv', () => {
  it('parses and returns typed values from an explicit source', () => {
    expect(parseEnv(schema, { PORT: '3000', NAME: 'app' })).toEqual({
      PORT: 3000,
      NAME: 'app',
    })
  })

  it('throws a readable, aggregated error listing every invalid var', () => {
    let thrown: unknown
    try {
      parseEnv(schema, { PORT: 'not-a-number', NAME: '' })
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(Error)
    const message = (thrown as Error).message
    expect(message).toContain('Invalid environment variables')
    expect(message).toContain('PORT')
    expect(message).toContain('NAME')
  })

  it('labels root-level (pathless) issues as (root)', () => {
    let thrown: unknown
    try {
      parseEnv(z.string(), { anything: 'x' })
    } catch (error) {
      thrown = error
    }
    expect((thrown as Error).message).toContain('(root)')
  })
})
