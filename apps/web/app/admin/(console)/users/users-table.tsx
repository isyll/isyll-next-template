'use client'

import type { Paginated } from '@workspace/core'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

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
    <div className='overflow-x-auto rounded-md border bg-card'>
      <table className='w-full text-sm'>
        <thead className='border-b text-left text-muted-foreground'>
          <tr>
            <th className='px-4 py-3 font-medium'>{t('colUser')}</th>
            <th className='px-4 py-3 font-medium'>{t('colStatus')}</th>
            <th className='px-4 py-3 font-medium'>{t('colLanguage')}</th>
            {canManage ? (
              <th className='px-4 py-3 text-right font-medium'>
                {t('colActions')}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {data.items.map((user) => (
            <tr key={user.id} className='border-b last:border-0'>
              <td className='px-4 py-3'>
                <div className='font-medium'>{user.name}</div>
                <div className='text-muted-foreground'>{user.email}</div>
              </td>
              <td className='px-4 py-3'>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                    user.status === 'active'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {t(`status.${user.status}`)}
                </span>
              </td>
              <td className='px-4 py-3 font-mono text-xs uppercase'>
                {user.language}
              </td>
              {canManage ? (
                <td className='px-4 py-3'>
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
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
