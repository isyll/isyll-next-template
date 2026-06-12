import { getTranslations } from 'next-intl/server'

import { buttonVariants } from '@workspace/ui/components/button'

import { AdminPageHeader } from '@/components/admin/page-header'
import { EmptyState } from '@/components/admin/empty-state'
import { monitoringConfig } from '@/features/admin-monitoring/sentry-api'
import { SentrySection } from '@/features/admin-monitoring/sentry-section'
import { SystemHealthSection } from '@/features/admin-monitoring/system-health-section'
import { requireOperator } from '@/lib/admin-guard'

/**
 * Operator monitoring. The system-health panel (DB/Redis/outbox/jobs/audit)
 * always renders from local data; the Sentry panel is an optional add-on shown
 * only when SENTRY_AUTH_TOKEN/ORG/PROJECT are configured.
 */
export default async function MonitoringPage() {
  await requireOperator('monitoring.read')

  const t = await getTranslations('AdminMonitoring')
  const config = monitoringConfig()

  return (
    <div className='space-y-10'>
      <AdminPageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          config.enabled ? (
            <a
              href={config.issuesUrl}
              target='_blank'
              rel='noreferrer'
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {t('openInSentry')}
            </a>
          ) : undefined
        }
      />

      <section className='space-y-4'>
        <h2 className='text-lg font-semibold tracking-tight'>
          {t('systemHealth')}
        </h2>
        <SystemHealthSection />
      </section>

      <section className='space-y-4'>
        <h2 className='text-lg font-semibold tracking-tight'>
          {t('errorTracking')}
        </h2>
        {config.enabled ? (
          <SentrySection />
        ) : (
          <EmptyState>{t('notConfiguredHint')}</EmptyState>
        )}
      </section>
    </div>
  )
}
