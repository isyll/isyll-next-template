import { NextResponse } from 'next/server'

import { siteConfig } from '@/lib/site-config'

/**
 * /.well-known/security.txt — machine-readable security disclosure policy.
 * RFC 9116: https://www.rfc-editor.org/rfc/rfc9116
 *
 * HOW TO CUSTOMISE:
 *   1. Update `Contact` to your security disclosure email or bug-bounty URL.
 *   2. Optionally add a `Encryption` line pointing to your PGP public key.
 *   3. Update `Expires` annually.
 */
export function GET(): NextResponse {
  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + 1)

  const content = [
    `Contact: mailto:${siteConfig.author.email}`,
    `Expires: ${expires.toISOString()}`,
    `Preferred-Languages: fr, en`,
    `Canonical: ${siteConfig.canonicalBase}/.well-known/security.txt`,
    `Policy: ${siteConfig.canonicalBase}/security`,
  ].join('\n')

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
