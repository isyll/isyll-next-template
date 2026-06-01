import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Optimistic auth guard (Next 16 renamed middleware → proxy). This only checks
 * for the presence of the session cookie for fast redirects — it is NOT a
 * security boundary. Every protected page/action re-verifies the session
 * server-side (see dashboard/layout.tsx and the auth action client).
 */
export function proxy(request: NextRequest): NextResponse {
  const sessionCookie = getSessionCookie(request, { cookiePrefix: 'isyll' })

  if (!sessionCookie) {
    const url = new URL('/login', request.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
