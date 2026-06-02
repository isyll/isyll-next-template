import { getTranslations } from 'next-intl/server'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { AdminRegisterForm } from '@/components/admin/admin-register-form'

export default async function AdminRegisterPage() {
  const t = await getTranslations('Admin')

  return (
    <main className='flex min-h-svh items-center justify-center px-4 py-12'>
      <Card className='w-full max-w-sm'>
        <CardHeader>
          <CardTitle>{t('registerTitle')}</CardTitle>
          <CardDescription>{t('registerSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminRegisterForm />
        </CardContent>
      </Card>
    </main>
  )
}
