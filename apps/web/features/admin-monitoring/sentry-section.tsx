import { getTranslations } from 'next-intl/server'

import {
  Card,
  CardContent,
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
import { EmptyState } from '@/components/admin/empty-state'
import { StatCard } from '@/components/admin/stat-card'

import { fetchEventStats, fetchRecentIssues } from './sentry-api'

/**
 * Optional Sentry panel. Only rendered when Sentry is configured (the page
 * checks `monitoringConfig().enabled`); it mirrors issues + event volume from
 * the Sentry REST API. The system-health panel above does not depend on it.
 */
export async function SentrySection() {
  const t = await getTranslations('AdminMonitoring')
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
    <div className='space-y-6'>
      <div className='grid gap-4 sm:grid-cols-3'>
        <StatCard
          label={t('metricEvents')}
          value={totalEvents}
          hint={t('metricEventsHint')}
        />
        <StatCard label={t('metricIssues')} value={issues.length} />
        <StatCard label={t('metricUsers')} value={affectedUsers} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>{t('eventsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <BarChart data={chartData} />
          ) : (
            <EmptyState>{t('noData')}</EmptyState>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>{t('issuesTitle')}</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {issues.length === 0 ? (
            <div className='p-6'>
              <EmptyState>{t('noIssues')}</EmptyState>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('colIssue')}</TableHead>
                  <TableHead>{t('colLevel')}</TableHead>
                  <TableHead className='text-end'>{t('colEvents')}</TableHead>
                  <TableHead className='text-end'>{t('colUsers')}</TableHead>
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
                    <TableCell className='text-end'>{issue.events}</TableCell>
                    <TableCell className='text-end'>{issue.users}</TableCell>
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
