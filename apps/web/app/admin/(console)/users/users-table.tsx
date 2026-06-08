'use client'

import type { Paginated } from '@workspace/core'
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

import type { AdminUserDTO } from '@/features/admin-users/queries'

import {
  deactivateUserAction,
  forceLogoutUserAction,
  reactivateUserAction,
} from './actions'

export function UsersTable({
  data,
  canManage,
}: {
  data: Paginated<AdminUserDTO>
  canManage: boolean
}) {
  const t = useTranslations('AdminUsers')
  const tErr = useTranslations('Errors')
  const router = useRouter()

  const onError = () => {
    toast.error(tErr('generic'))
  }
  const onSuccess = (message: string) => {
    toast.success(message)
    router.refresh()
  }

  const deactivate = useAction(deactivateUserAction, {
    onSuccess: () => {
      onSuccess(t('deactivated'))
    },
    onError,
  })
  const reactivate = useAction(reactivateUserAction, {
    onSuccess: () => {
      onSuccess(t('reactivated'))
    },
    onError,
  })
  const forceLogout = useAction(forceLogoutUserAction, {
    onSuccess: () => {
      onSuccess(t('loggedOut'))
    },
    onError,
  })

  const busy =
    deactivate.isPending || reactivate.isPending || forceLogout.isPending

  if (data.items.length === 0) {
    return (
      <p className='rounded-md border bg-card p-8 text-center text-sm text-muted-foreground'>
        {t('empty')}
      </p>
    )
  }

  return (
    <div className='rounded-md border bg-card'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('colUser')}</TableHead>
            <TableHead>{t('colStatus')}</TableHead>
            <TableHead>{t('colLanguage')}</TableHead>
            {canManage ? (
              <TableHead className='text-end'>{t('colActions')}</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className='font-medium'>{user.name}</div>
                <div className='text-muted-foreground'>{user.email}</div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={user.status === 'active' ? 'secondary' : 'outline'}
                >
                  {t(`status.${user.status}`)}
                </Badge>
              </TableCell>
              <TableCell className='font-mono text-xs uppercase'>
                {user.language}
              </TableCell>
              {canManage ? (
                <TableCell className='text-end'>
                  <div className='flex justify-end gap-2'>
                    {user.status === 'active' ? (
                      <>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          disabled={busy}
                          onClick={() => {
                            forceLogout.execute({ userId: user.id })
                          }}
                        >
                          {t('forceLogout')}
                        </Button>
                        <Button
                          type='button'
                          variant='destructive'
                          size='sm'
                          disabled={busy}
                          onClick={() => {
                            deactivate.execute({ userId: user.id })
                          }}
                        >
                          {t('deactivate')}
                        </Button>
                      </>
                    ) : (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={busy}
                        onClick={() => {
                          reactivate.execute({ userId: user.id })
                        }}
                      >
                        {t('reactivate')}
                      </Button>
                    )}
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
