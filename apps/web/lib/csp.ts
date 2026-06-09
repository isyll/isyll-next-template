/**
 * Builds a strict, nonce-based Content-Security-Policy (CSP Level 3).
 *
 * Production: scripts must carry the per-request `nonce`, and `'strict-dynamic'`
 * lets those trusted scripts load their own dependencies (so Next's chunk loader
 * keeps working) without host allowlists. `'unsafe-inline'` is intentionally
 * absent from `script-src`.
 *
 * Development: relaxed for Turbopack HMR, which injects un-nonced inline/eval
 * scripts (`'unsafe-eval'` + `'unsafe-inline'`, websocket `connect-src`).
 *
 * A nonce-based CSP opts pages into dynamic rendering (the nonce rotates every
 * request) — the accepted trade-off for a strict policy. A project that needs
 * statically-cached pages can relax this (report-only or hash-based); see
 * docs/security.md.
 *
 * `reportUri` appends a `report-uri` directive so the browser POSTs violation
 * reports there — pair it with report-only mode (proxy.ts) to vet a policy
 * before enforcing it.
 */
export function buildContentSecurityPolicy(
  nonce: string,
  { isDev = false, reportUri }: { isDev?: boolean; reportUri?: string } = {}
): string {
  const scriptSrc = isDev
    ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
    : ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"]

  const directives: Record<string, readonly string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    // Next/Tailwind inject styles inline; inline styles are comparatively low
    // risk and hashing every Next-generated style is impractical.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'blob:', 'data:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': isDev
      ? ["'self'", 'ws:', 'http:', 'https:']
      : ["'self'", 'https:'],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'self'"],
    'manifest-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
  }

  let policy = Object.entries(directives)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ')

  // Upgrade any http subresource to https in production; never in dev (the dev
  // server is plain http on localhost).
  if (!isDev) policy = `${policy}; upgrade-insecure-requests`
  if (reportUri) policy = `${policy}; report-uri ${reportUri}`
  return policy
}
