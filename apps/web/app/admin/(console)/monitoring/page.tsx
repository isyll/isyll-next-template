import { adminAuth } from '@workspace/auth/admin'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { buttonVariants } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

import { BarChart } from '@/components/admin/bar-chart'
import { AdminPageHeader } from '@/components/admin/page-header'
import { StatCard } from '@/components/admin/stat-card'
import {
  fetchEventStats,
  fetchRecentIssues,
  monitoringConfig,
} from '@/features/admin-monitoring/sentry-api'
import { getOperatorPermissions } from '@/lib/admin-permissions'

export default async function MonitoringPage() {
  const session = await adminAuth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/admin/login')
  }
  const permissions = await getOperatorPermissions(session.user.id)
  if (!permissions.has('monitoring.read')) {
    redirect('/admin')
  }

  const t = await getTranslations('AdminMonitoring')
  const config = monitoringConfig()

  if (!config.enabled) {
    return (
      <div>
        <AdminPageHeader title={t('title')} description={t('subtitle')} />
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>{t('notConfigured')}</CardTitle>
            <CardDescription>{t('notConfiguredHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className='list-inside list-disc font-mono text-xs text-muted-foreground'>
              <li>SENTRY_AUTH_TOKEN</li>
              <li>SENTRY_ORG</li>
              <li>SENTRY_PROJECT</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [issues, stats] = await Promise.all([
    fetchRecentIssues(10),
    fetchEventStats(),
  ])
  const recentStats = stats.slice(-24)
  const totalEvents = recentStats.reduce((sum, point) => sum + point.count, 0)
  const affectedUsers = issues.reduce((sum, issue) => sum + issue.users, 0)
  const chartData = recentStats.map((point) => ({
    label: `${new Date(point.ts * 1000).getHours()}h`,
    value: point.count,
  }))

  return (
    <div>
      <AdminPageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <a
            href={config.issuesUrl}
            target='_blank'
            rel='noreferrer'
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            {t('openInSentry')}
          </a>
        }
      />

      <div className='mb-6 grid gap-4 sm:grid-cols-3'>
        <StatCard
          label={t('metricEvents')}
          value={totalEvents}
          hint={t('metricEventsHint')}
        />
        <StatCard label={t('metricIssues')} value={issues.length} />
        <StatCard label={t('metricUsers')} value={affectedUsers} />
      </div>

      <Card className='mb-6'>
        <CardHeader>
          <CardTitle className='text-base'>{t('eventsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <BarChart data={chartData} />
          ) : (
            <p className='text-sm text-muted-foreground'>{t('noData')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>{t('issuesTitle')}</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {issues.length === 0 ? (
            <p className='p-6 text-sm text-muted-foreground'>{t('noIssues')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('colIssue')}</TableHead>
                  <TableHead>{t('colLevel')}</TableHead>
                  <TableHead>{t('colEvents')}</TableHead>
                  <TableHead>{t('colUsers')}</TableHead>
                  <TableHead className='text-end' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className='max-w-md'>
                      <div className='truncate font-medium'>{issue.title}</div>
                      {issue.culprit ? (
                        <div className='truncate text-xs text-muted-foreground'>
                          {issue.culprit}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className='font-mono text-xs uppercase'>
                      {issue.level}
                    </TableCell>
                    <TableCell>{issue.events}</TableCell>
                    <TableCell>{issue.users}</TableCell>
                    <TableCell className='text-end'>
                      <a
                        href={issue.permalink}
                        target='_blank'
                        rel='noreferrer'
                        className='text-primary hover:underline'
                      >
                        {t('open')}
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
