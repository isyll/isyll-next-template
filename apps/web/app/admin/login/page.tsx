import { adminAuth } from '@workspace/auth/admin'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { AdminLoginForm } from '@/components/admin/admin-login-form'

export default async function AdminLoginPage() {
  const session = await adminAuth.api.getSession({ headers: await headers() })
  if (session) {
    redirect('/admin')
  }

  const t = await getTranslations('Admin')

  return (
    <main className='flex min-h-svh items-center justify-center px-4 py-12'>
      <Card className='w-full max-w-sm'>
        <CardHeader>
          <CardTitle>{t('loginTitle')}</CardTitle>
          <CardDescription>{t('loginSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminLoginForm />
        </CardContent>
      </Card>
    </main>
  )
}
