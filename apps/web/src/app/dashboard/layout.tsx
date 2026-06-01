import { auth } from '@workspace/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { SiteHeader } from '@/components/site-header'

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/login')
  }

  return (
    <div className='flex min-h-svh flex-col'>
      <SiteHeader />
      {children}
    </div>
  )
}
