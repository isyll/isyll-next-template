import { describe, expect, it } from 'vitest'

import { parseOtelHeaders } from '@/lib/otel-config'

describe('parseOtelHeaders', () => {
  it('returns an empty record for undefined or empty input', () => {
    expect(parseOtelHeaders(undefined)).toEqual({})
    expect(parseOtelHeaders('')).toEqual({})
  })

  it('parses comma-separated key=value pairs and trims whitespace', () => {
    expect(parseOtelHeaders('k1=v1,k2=v2')).toEqual({ k1: 'v1', k2: 'v2' })
    expect(parseOtelHeaders('  k = v  ')).toEqual({ k: 'v' })
  })

  it('splits only on the first "=" so values may contain "="', () => {
    expect(parseOtelHeaders('authorization=Bearer abc=123')).toEqual({
      authorization: 'Bearer abc=123',
    })
  })

  it('skips malformed pairs and empty keys', () => {
    expect(parseOtelHeaders('nope,=v,k=v')).toEqual({ k: 'v' })
  })
})
