/**
 * Root loading skeleton — shown by Next.js while the root Suspense boundary
 * resolves (e.g. during initial navigation with PPR disabled).
 *
 * HOW TO CUSTOMISE:
 *   • Replace the skeleton with a branded spinner or skeleton layout.
 *   • For route-specific loading states, create `loading.tsx` inside the
 *     relevant route segment (e.g. `dashboard/loading.tsx`).
 */
import { getTranslations } from 'next-intl/server'

export default async function Loading() {
  const t = await getTranslations('Loading')
  return (
    <div
      className='flex min-h-svh items-center justify-center'
      role='status'
      aria-label={t('message')}
    >
      <div className='flex flex-col items-center gap-4'>
        {/* Animated spinner — swap for a branded loader or skeleton */}
        <div
          className='h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary'
          aria-hidden='true'
        />
        <p className='text-sm text-muted-foreground'>{t('message')}</p>
      </div>
    </div>
  )
}
