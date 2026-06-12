'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

import type { DeadLetterEventDTO } from '@/features/admin-jobs/queries'

import {
  discardDeadEventAction,
  replayAllDeadEventsAction,
  replayOutboxEventAction,
} from './actions'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function DeadLetterTable({
  events,
  canManage,
}: {
  events: DeadLetterEventDTO[]
  canManage: boolean
}) {
  const t = useTranslations('AdminJobs')
  const tErr = useTranslations('Errors')
  const router = useRouter()

  const onError = () => {
    toast.error(tErr('generic'))
  }
  const refresh = () => {
    router.refresh()
  }

  const replay = useAction(replayOutboxEventAction, {
    onSuccess: () => {
      toast.success(t('replayed'))
      refresh()
    },
    onError,
  })
  const discard = useAction(discardDeadEventAction, {
    onSuccess: () => {
      toast.success(t('discarded'))
      refresh()
    },
    onError,
  })
  const replayAll = useAction(replayAllDeadEventsAction, {
    onSuccess: ({ data }) => {
      toast.success(t('replayedAll', { count: data.count }))
      refresh()
    },
    onError,
  })

  const busy = replay.isPending || discard.isPending || replayAll.isPending
  const deadCount = events.filter((event) => event.status === 'dead').length

  if (events.length === 0) {
    return (
      <p className='rounded-md border bg-card p-8 text-center text-sm text-muted-foreground'>
        {t('empty')}
      </p>
    )
  }

  return (
    <div className='space-y-3'>
      {canManage && deadCount > 0 ? (
        <div className='flex justify-end'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={busy}
            onClick={() => {
              replayAll.execute()
            }}
          >
            {t('replayAll', { count: deadCount })}
          </Button>
        </div>
      ) : null}

      <div className='rounded-md border bg-card'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('colEvent')}</TableHead>
              <TableHead>{t('colStatus')}</TableHead>
              <TableHead>{t('colAttempts')}</TableHead>
              <TableHead>{t('colFailedAt')}</TableHead>
              <TableHead>{t('colError')}</TableHead>
              {canManage ? (
                <TableHead className='text-end'>{t('colActions')}</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <div className='font-medium'>{event.eventType}</div>
                  <div className='text-xs text-muted-foreground'>
                    {event.aggregateType}:{event.aggregateId}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      event.status === 'dead' ? 'destructive' : 'secondary'
                    }
                  >
                    {t(`status.${event.status}`)}
                  </Badge>
                </TableCell>
                <TableCell className='font-mono text-xs'>
                  {event.attempts}/{event.maxAttempts}
                </TableCell>
                <TableCell className='text-xs whitespace-nowrap'>
                  {formatDate(event.failedAt)}
                </TableCell>
                <TableCell className='max-w-xs'>
                  <span
                    className='block truncate text-xs text-muted-foreground'
                    title={event.errorMessage ?? undefined}
                  >
                    {event.errorMessage ?? '—'}
                  </span>
                </TableCell>
                {canManage ? (
                  <TableCell className='text-end'>
                    <div className='flex justify-end gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={busy}
                        onClick={() => {
                          replay.execute({ id: event.id })
                        }}
                      >
                        {t('replay')}
                      </Button>
                      {event.status === 'dead' ? (
                        <Button
                          type='button'
                          variant='destructive'
                          size='sm'
                          disabled={busy}
                          onClick={() => {
                            discard.execute({ id: event.id })
                          }}
                        >
                          {t('discard')}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
