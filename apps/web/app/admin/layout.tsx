import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Admin pages must never be indexed; in production the reverse proxy also
// refuses /admin from the public network.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className='min-h-svh bg-muted/30'>{children}</div>
}
