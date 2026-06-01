'use client'

import type { SocialProvider } from '@workspace/auth'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'

import { authClient } from '@/lib/auth-client'

const PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
  microsoft: 'Microsoft',
  apple: 'Apple',
}

export function SocialButtons({ providers }: { providers: SocialProvider[] }) {
  const t = useTranslations('Auth')

  if (providers.length === 0) {
    return null
  }

  return (
    <div className='grid gap-2'>
      {providers.map((provider) => (
        <Button
          key={provider}
          type='button'
          variant='outline'
          className='w-full'
          onClick={() => {
            void authClient.signIn.social({
              provider,
              callbackURL: '/dashboard',
            })
          }}
        >
          {t('continueWith', { provider: PROVIDER_LABELS[provider] })}
        </Button>
      ))}
    </div>
  )
}
