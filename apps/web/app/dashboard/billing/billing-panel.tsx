'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'

import type { SubscriptionDTO } from '@/features/billing/queries'

import { openBillingPortalAction, startCheckoutAction } from './actions'

export function BillingPanel({
  subscription,
}: {
  subscription: SubscriptionDTO | null
}) {
  const t = useTranslations('Billing')
  const tErr = useTranslations('Errors')
  const [pending, setPending] = useState(false)

  async function redirectTo(
    run: () => Promise<{
      data?: { url: string } | undefined
      serverError?: string | undefined
    }>
  ): Promise<void> {
    setPending(true)
    const result = await run()
    if (result.data?.url) {
      window.location.assign(result.data.url)
      return
    }
    setPending(false)
    toast.error(result.serverError ?? tErr('generic'))
  }

  return (
    <div className='space-y-4 rounded-lg border bg-card p-6'>
      {subscription ? (
        <>
          <div className='space-y-1'>
            <div className='flex items-center gap-2'>
              <span className='text-sm text-muted-foreground'>
                {t('status')}
              </span>
              <span className='font-medium'>
                {t('statusValue', { status: subscription.status })}
              </span>
            </div>
            {subscription.currentPeriodEnd ? (
              <p className='text-sm text-muted-foreground'>
                {subscription.cancelAtPeriodEnd
                  ? t('endsOn', {
                      date: new Date(
                        subscription.currentPeriodEnd
                      ).toLocaleDateString(),
                    })
                  : t('renewsOn', {
                      date: new Date(
                        subscription.currentPeriodEnd
                      ).toLocaleDateString(),
                    })}
              </p>
            ) : null}
          </div>
          <Button
            type='button'
            disabled={pending}
            onClick={() => {
              void redirectTo(() => openBillingPortalAction())
            }}
          >
            {t('manage')}
          </Button>
        </>
      ) : (
        <>
          <p className='text-sm text-muted-foreground'>{t('noSubscription')}</p>
          <Button
            type='button'
            disabled={pending}
            onClick={() => {
              void redirectTo(() => startCheckoutAction())
            }}
          >
            {t('subscribe')}
          </Button>
        </>
      )}
    </div>
  )
}
