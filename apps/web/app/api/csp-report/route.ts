import { NextResponse } from 'next/server'

import { logger } from '@/lib/logger'

/**
 * Content-Security-Policy violation collector.
 *
 * Point `CSP_REPORT_URI` at this route (`/api/csp-report`) and run with
 * `CSP_REPORT_ONLY=true` to vet a policy before enforcing it: the browser POSTs
 * a report here for every violation, and we log it structured (`scope: 'csp'`)
 * so you can see what a tighter policy would block. See `proxy.ts` / `lib/csp.ts`
 * and `docs/security.md`. Unauthenticated by design (the matcher excludes
 * `/api/*`); it only logs, never trusts the payload.
 *
 * Browsers send either the legacy `application/csp-report` body
 * (`{ "csp-report": {...} }`) or the Reporting-API `application/reports+json`
 * array; we accept both and never throw on a malformed body.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json()
    const reports: unknown[] = Array.isArray(body)
      ? (body as unknown[])
      : [body]
    for (const report of reports) {
      const violation =
        (report as { 'csp-report'?: unknown })['csp-report'] ??
        (report as { body?: unknown }).body ??
        report
      logger.warn({ scope: 'csp', violation }, 'CSP violation reported')
    }
  } catch {
    // Ignore unparseable/empty bodies — a violation report is best-effort.
  }
  // 204: nothing to return to the browser's reporting endpoint.
  return new NextResponse(null, { status: 204 })
}
