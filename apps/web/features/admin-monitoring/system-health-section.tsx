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
import { HealthBadge } from '@/components/admin/health-badge'
import { StatCard } from '@/components/admin/stat-card'

import {
  getAuditVolume,
  getRecentAuditActivity,
  getSystemHealth,
  type HealthStatus,
  type ProbeResult,
} from './health-queries'

/**
 * Operator system-health panel — works with no external services. Surfaces DB +
 * Redis liveness, the outbox/job backlog, and audit activity, all from data the
 * stack already persists. Rendered above the optional Sentry panel so the
 * monitoring page is useful out of the box.
 */
export async function SystemHealthSection() {
  const t = await getTranslations('AdminMonitoring')
  const [health, activity, volume] = await Promise.all([
    getSystemHealth(),
    getRecentAuditActivity(8),
    getAuditVolume(14),
  ])

  const statusWord = (status: HealthStatus): string =>
    ({
      ok: t('statusOk'),
      degraded: t('statusDegraded'),
      down: t('statusDown'),
      unconfigured: t('statusUnconfigured'),
    })[status]

  const probeLabel = (probe: ProbeResult): string =>
    probe.latencyMs !== null
      ? `${statusWord(probe.status)} · ${probe.latencyMs} ms`
      : statusWord(probe.status)

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>{t('infrastructure')}</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-3'>
          <div className='space-y-1'>
            <p className='text-xs text-muted-foreground'>{t('database')}</p>
            <HealthBadge
              status={health.database.status}
              label={probeLabel(health.database)}
            />
          </div>
          <div className='space-y-1'>
            <p className='text-xs text-muted-foreground'>{t('readReplica')}</p>
            <HealthBadge
              status={health.readReplica.status}
              label={probeLabel(health.readReplica)}
            />
          </div>
          <div className='space-y-1'>
            <p className='text-xs text-muted-foreground'>{t('redis')}</p>
            <HealthBadge
              status={health.redis.status}
              label={probeLabel(health.redis)}
            />
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className='mb-2 text-sm font-medium text-muted-foreground'>
          {t('outboxTitle')}
        </h3>
        <div className='grid gap-4 sm:grid-cols-4'>
          <StatCard label={t('outboxPending')} value={health.outbox.pending} />
          <StatCard label={t('outboxFailed')} value={health.outbox.failed} />
          <StatCard label={t('outboxDead')} value={health.outbox.dead} />
          <StatCard
            label={t('outboxProcessed')}
            value={health.outbox.processed}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>{t('queuesTitle')}</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {health.queues.length === 0 ? (
            <div className='p-6'>
              <EmptyState>{t('noQueues')}</EmptyState>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('queueColName')}</TableHead>
                  <TableHead className='text-end'>{t('queueQueued')}</TableHead>
                  <TableHead className='text-end'>{t('queueActive')}</TableHead>
                  <TableHead className='text-end'>
                    {t('queueDeferred')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {health.queues.map((queue) => (
                  <TableRow key={queue.name}>
                    <TableCell className='font-mono text-xs'>
                      {queue.name}
                    </TableCell>
                    <TableCell className='text-end'>{queue.queued}</TableCell>
                    <TableCell className='text-end'>{queue.active}</TableCell>
                    <TableCell className='text-end'>{queue.deferred}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>{t('auditVolumeTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {volume.length > 0 ? (
            <BarChart data={volume} />
          ) : (
            <EmptyState>{t('noAuditActivity')}</EmptyState>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>{t('auditActivityTitle')}</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {activity.length === 0 ? (
            <div className='p-6'>
              <EmptyState>{t('noAuditActivity')}</EmptyState>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('auditColTable')}</TableHead>
                  <TableHead>{t('auditColOperation')}</TableHead>
                  <TableHead>{t('auditColActor')}</TableHead>
                  <TableHead className='text-end'>
                    {t('auditColWhen')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className='font-mono text-xs'>
                      {entry.tableName}
                    </TableCell>
                    <TableCell className='text-xs uppercase'>
                      {entry.operation}
                    </TableCell>
                    <TableCell className='text-xs text-muted-foreground'>
                      {entry.actorType ?? '—'}
                    </TableCell>
                    <TableCell className='text-end text-xs text-muted-foreground'>
                      {new Date(entry.occurredAt).toLocaleString('fr-FR')}
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
