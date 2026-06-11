import { userAuth } from '@workspace/auth'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getActiveSubscription } from '@/features/billing/queries'
import { isBillingConfigured } from '@/lib/billing/stripe'
import { isEnabled } from '@/lib/feature-flags'

import { BillingPanel } from './billing-panel'

export default async function BillingPage() {
  const session = await userAuth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/login')
  }

  const t = await getTranslations('Billing')
  // Billing is gated by configuration AND the `billing.enabled` feature flag,
  // so it can be rolled out gradually (see docs/feature-flags.md).
  const available =
    isBillingConfigured() && (await isEnabled('billing.enabled'))

  return (
    <main className='mx-auto w-full max-w-2xl space-y-8 px-4 py-8'>
      <div className='space-y-1'>
        <h1 className='text-2xl font-semibold tracking-tight'>{t('title')}</h1>
        <p className='text-muted-foreground'>{t('subtitle')}</p>
      </div>
      {available ? (
        <BillingPanel
          subscription={await getActiveSubscription(session.user.id)}
        />
      ) : (
        <p className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
          {t('unavailable')}
        </p>
      )}
    </main>
  )
}
