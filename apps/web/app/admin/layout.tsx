import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Admin pages must never be indexed; in production the reverse proxy also
// refuses /admin from the public network.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/**
 * Root of the operator console. The `admin` class scopes the back-office theme
 * (distinct teal accent + dark sidebar — see the `.admin` block in
 * `globals.css`), so the whole `/admin` surface reads as an internal tool, not
 * the public site. Authenticated pages add the shell in `(console)/layout.tsx`;
 * `/admin/login` stays outside it.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className='admin min-h-svh bg-background text-foreground'>
      {children}
    </div>
  )
}
