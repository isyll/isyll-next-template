import { beforeEach, describe, expect, it, vi } from 'vitest'

// Control the validated env that proxy.ts reads (importing the real `@/env`
// would run full env validation under jsdom). `mock`-prefixed so vi.mock's
// hoisted factory is allowed to reference it.
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: 'production' as 'production' | 'development',
    CSP_REPORT_ONLY: false as boolean | undefined,
    CSP_REPORT_URI: undefined as string | undefined,
  },
}))
vi.mock('@/env', () => ({ env: mockEnv }))

import { NextRequest } from 'next/server'

import { proxy } from '@/proxy'

const ENFORCED = 'content-security-policy'
const REPORT_ONLY = 'content-security-policy-report-only'

function request(path = '/'): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${path}`))
}

describe('proxy CSP headers', () => {
  beforeEach(() => {
    mockEnv.NODE_ENV = 'production'
    mockEnv.CSP_REPORT_ONLY = false
    mockEnv.CSP_REPORT_URI = undefined
  })

  it('enforces a strict CSP by default', () => {
    const res = proxy(request('/'))
    const csp = res.headers.get(ENFORCED)
    expect(csp).toContain("'strict-dynamic'")
    expect(res.headers.get(REPORT_ONLY)).toBeNull()
  })

  it('sends report-only (not enforced) when CSP_REPORT_ONLY is set', () => {
    mockEnv.CSP_REPORT_ONLY = true
    const res = proxy(request('/'))
    expect(res.headers.get(REPORT_ONLY)).toContain("'strict-dynamic'")
    expect(res.headers.get(ENFORCED)).toBeNull()
  })

  it('includes report-uri when configured', () => {
    mockEnv.CSP_REPORT_URI = '/api/csp-report'
    expect(proxy(request('/')).headers.get(ENFORCED)).toContain(
      'report-uri /api/csp-report'
    )
  })

  it('still attaches the CSP on an optimistic auth redirect', () => {
    const res = proxy(request('/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
    expect(res.headers.get(ENFORCED)).toBeTruthy()
  })
})
