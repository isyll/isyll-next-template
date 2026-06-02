import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Optimistic auth guard (Next 16 renamed middleware → proxy). It only checks
 * for the presence of a session cookie for fast redirects — it is NOT a
 * security boundary. Every protected page/action re-verifies the session
 * server-side (dashboard layout, admin pages, the safe-action clients), and in
 * production the reverse proxy blocks /admin from the public network entirely.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    // The admin auth API and the login/register pages must stay reachable
    // without a session.
    if (
      pathname === '/admin/login' ||
      pathname === '/admin/register' ||
      pathname.startsWith('/admin/api')
    ) {
      return NextResponse.next()
    }
    const adminCookie = getSessionCookie(request, { cookiePrefix: 'admin' })
    if (!adminCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.next()
  }

  const sessionCookie = getSessionCookie(request, { cookiePrefix: 'app' })
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin', '/admin/:path*'],
}
