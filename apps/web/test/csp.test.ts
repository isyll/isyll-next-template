import { describe, expect, it } from 'vitest'

import { buildContentSecurityPolicy } from '@/lib/csp'

/** Parse a CSP string into a directive -> sources map. */
function parse(policy: string): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  for (const part of policy.split(';')) {
    const [directive, ...sources] = part.trim().split(/\s+/)
    if (directive) map[directive] = sources
  }
  return map
}

describe('buildContentSecurityPolicy', () => {
  it('uses the nonce and strict-dynamic in production', () => {
    const policy = buildContentSecurityPolicy('abc123', { isDev: false })
    const { 'script-src': scriptSrc } = parse(policy)

    expect(scriptSrc).toContain("'nonce-abc123'")
    expect(scriptSrc).toContain("'strict-dynamic'")
    // unsafe-inline / unsafe-eval must never appear in a production script-src.
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(scriptSrc).not.toContain("'unsafe-eval'")
  })

  it('locks down the dangerous directives', () => {
    const policy = buildContentSecurityPolicy('n', { isDev: false })
    const directives = parse(policy)

    expect(directives['object-src']).toEqual(["'none'"])
    expect(directives['base-uri']).toEqual(["'none'"])
    expect(directives['frame-ancestors']).toEqual(["'none'"])
    expect(directives['default-src']).toEqual(["'self'"])
    expect(directives['form-action']).toEqual(["'self'"])
  })

  it('upgrades insecure requests in production but not in development', () => {
    expect(buildContentSecurityPolicy('n', { isDev: false })).toContain(
      'upgrade-insecure-requests'
    )
    expect(buildContentSecurityPolicy('n', { isDev: true })).not.toContain(
      'upgrade-insecure-requests'
    )
  })

  it('relaxes script-src for HMR in development', () => {
    const { 'script-src': scriptSrc } = parse(
      buildContentSecurityPolicy('n', { isDev: true })
    )
    expect(scriptSrc).toContain("'unsafe-eval'")
    expect(scriptSrc).toContain("'unsafe-inline'")
    expect(scriptSrc).not.toContain("'strict-dynamic'")
  })

  it('defaults to production rules when no options are passed', () => {
    expect(buildContentSecurityPolicy('n')).toContain(
      'upgrade-insecure-requests'
    )
  })

  it('appends report-uri only when a report endpoint is given', () => {
    expect(buildContentSecurityPolicy('n')).not.toContain('report-uri')
    const policy = buildContentSecurityPolicy('n', {
      reportUri: '/api/csp-report',
    })
    expect(parse(policy)['report-uri']).toEqual(['/api/csp-report'])
  })
})
