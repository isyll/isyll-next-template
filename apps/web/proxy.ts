import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'

import { env } from '@/env'
import { buildContentSecurityPolicy } from '@/lib/csp'

/**
 * Edge proxy (Next 16 renamed middleware → proxy). It does two things on every
 * document request:
 *
 *  1. Sets a strict, per-request CSP nonce (defense-in-depth against XSS). The
 *     nonce is exposed to the app via the `x-nonce` request header so server
 *     components (e.g. the theme provider's inline script) can read it.
 *  2. Runs an OPTIMISTIC auth guard — it only checks for a session cookie for
 *     fast redirects and is NOT a security boundary. Every protected page/action
 *     re-verifies the session server-side (dashboard layout, admin pages, the
 *     safe-action clients), and in production the reverse proxy blocks /admin
 *     from the public network entirely.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
}

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

function isProtectedUserPath(pathname: string): boolean {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/')
}

/** Decide an optimistic redirect for protected paths, or null to continue. */
function authRedirect(request: NextRequest): URL | null {
  const { pathname } = request.nextUrl

  if (isAdminPath(pathname)) {
    // The operator login page must stay reachable without a session.
    if (pathname === '/admin/login') return null
    const adminCookie = getSessionCookie(request, { cookiePrefix: 'admin' })
    return adminCookie ? null : new URL('/admin/login', request.url)
  }

  if (isProtectedUserPath(pathname)) {
    const sessionCookie = getSessionCookie(request, { cookiePrefix: 'app' })
    return sessionCookie ? null : new URL('/login', request.url)
  }

  return null
}

export function proxy(request: NextRequest): NextResponse {
  const nonce = generateNonce()
  const csp = buildContentSecurityPolicy(nonce, {
    isDev: env.NODE_ENV === 'development',
  })

  const redirectTo = authRedirect(request)
  if (redirectTo) {
    const response = NextResponse.redirect(redirectTo)
    response.headers.set('content-security-policy', csp)
    return response
  }

  // Forward the nonce + CSP on the request so Next nonces its own scripts and
  // components can read `x-nonce`; set the CSP on the response so the browser
  // enforces it.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('content-security-policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('content-security-policy', csp)
  return response
}

export const config = {
  // Run on every document request so the CSP applies everywhere, but skip API
  // routes (JSON, no CSP needed) and static assets (served verbatim).
  matcher: [
    '/((?!api/|admin/api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|txt|xml|woff|woff2|ttf|otf)$).*)',
  ],
}
