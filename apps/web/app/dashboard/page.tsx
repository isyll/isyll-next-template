import { auth } from '@workspace/auth'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/login')
  }

  const tDash = await getTranslations('Dashboard')

  return (
    <main className='mx-auto w-full max-w-3xl space-y-8 px-4 py-8'>
      <div className='space-y-1'>
        <h1 className='text-2xl font-semibold tracking-tight'>
          {tDash('title')}
        </h1>
        <p className='text-muted-foreground'>
          {tDash('welcome', { name: session.user.name })}
        </p>
      </div>
    </main>
  )
}
