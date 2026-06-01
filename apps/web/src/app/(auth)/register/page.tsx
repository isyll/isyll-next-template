import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { RegisterForm } from '@/components/auth/register-form'

export default async function RegisterPage() {
  const t = await getTranslations('Auth')

  return (
    <main className='flex min-h-svh items-center justify-center px-4 py-12'>
      <Card className='w-full max-w-sm'>
        <CardHeader>
          <CardTitle>{t('registerTitle')}</CardTitle>
          <CardDescription>{t('registerSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
        <CardFooter className='justify-center text-sm text-muted-foreground'>
          {t('haveAccount')}&nbsp;
          <Link href='/login' className='text-foreground underline'>
            {t('signIn')}
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}
