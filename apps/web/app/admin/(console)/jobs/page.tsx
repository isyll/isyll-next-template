import { adminAuth } from '@workspace/auth/admin'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

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

import { AdminPageHeader } from '@/components/admin/page-header'
import { StatCard } from '@/components/admin/stat-card'
import {
  getOutboxStats,
  listDeadLetterEvents,
} from '@/features/admin-jobs/queries'
import { getOperatorPermissions } from '@/lib/admin-permissions'
import { listQueueStates } from '@/lib/jobs'

import { DeadLetterTable } from './dlq-table'

export default async function JobsPage() {
  const session = await adminAuth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/admin/login')
  }
  const permissions = await getOperatorPermissions(session.user.id)
  if (!permissions.has('jobs.read')) {
    redirect('/admin')
  }
  const canManage = permissions.has('jobs.write')

  const t = await getTranslations('AdminJobs')
  const [stats, deadLetters, queues] = await Promise.all([
    getOutboxStats(),
    listDeadLetterEvents(),
    listQueueStates(),
  ])

  return (
    <div>
      <AdminPageHeader title={t('title')} description={t('subtitle')} />

      <div className='mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard label={t('statPending')} value={stats.pending} />
        <StatCard label={t('statFailed')} value={stats.failed} />
        <StatCard
          label={t('statDead')}
          value={stats.dead}
          hint={t('statDeadHint')}
        />
        <StatCard label={t('statProcessed')} value={stats.processed} />
      </div>

      <Card className='mb-6'>
        <CardHeader>
          <CardTitle className='text-base'>{t('queuesTitle')}</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {queues.length === 0 ? (
            <p className='p-6 text-sm text-muted-foreground'>
              {t('queuesEmpty')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('colQueue')}</TableHead>
                  <TableHead className='text-end'>{t('colQueued')}</TableHead>
                  <TableHead className='text-end'>{t('colActive')}</TableHead>
                  <TableHead className='text-end'>{t('colDeferred')}</TableHead>
                  <TableHead className='text-end'>{t('colTotal')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queues.map((queue) => (
                  <TableRow key={queue.name}>
                    <TableCell className='font-mono text-xs'>
                      {queue.name}
                    </TableCell>
                    <TableCell className='text-end'>{queue.queued}</TableCell>
                    <TableCell className='text-end'>{queue.active}</TableCell>
                    <TableCell className='text-end'>{queue.deferred}</TableCell>
                    <TableCell className='text-end'>{queue.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>{t('dlqTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DeadLetterTable events={deadLetters} canManage={canManage} />
        </CardContent>
      </Card>
    </div>
  )
}
