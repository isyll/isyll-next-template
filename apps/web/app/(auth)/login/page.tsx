import { enabledSocialProviders } from '@workspace/auth'
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

import { LoginForm } from '@/components/auth/login-form'
import { SocialButtons } from '@/components/auth/social-buttons'

export default async function LoginPage() {
  const t = await getTranslations('Auth')
  const providers = enabledSocialProviders()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('loginTitle')}</CardTitle>
        <CardDescription>{t('loginSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-5'>
        <LoginForm />
        {providers.length > 0 ? (
          <>
            <div className='flex items-center gap-3'>
              <span className='h-px flex-1 bg-border' />
              <span className='text-xs text-muted-foreground'>
                {t('orContinueWith')}
              </span>
              <span className='h-px flex-1 bg-border' />
            </div>
            <SocialButtons providers={providers} />
          </>
        ) : null}
      </CardContent>
      <CardFooter className='justify-center text-sm text-muted-foreground'>
        {t('noAccount')}&nbsp;
        <Link href='/register' className='text-foreground underline'>
          {t('signUp')}
        </Link>
      </CardFooter>
    </Card>
  )
}
