'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

import type {
  AdminOperatorDTO,
  RoleRef,
} from '@/features/admin-operators/queries'

import {
  assignRoleAction,
  removeRoleAction,
  setOperatorActiveAction,
} from './actions'

export function OperatorsTable({
  operators,
  roles,
  canManage,
  selfId,
}: {
  operators: AdminOperatorDTO[]
  roles: RoleRef[]
  canManage: boolean
  selfId: string
}) {
  const t = useTranslations('AdminOperators')
  const tErr = useTranslations('Errors')
  const router = useRouter()

  const refresh = (message: string) => {
    toast.success(message)
    router.refresh()
  }
  const onError = () => {
    toast.error(tErr('generic'))
  }

  const setActive = useAction(setOperatorActiveAction, {
    onSuccess: () => {
      refresh(t('statusUpdated'))
    },
    onError,
  })
  const assign = useAction(assignRoleAction, {
    onSuccess: () => {
      refresh(t('roleAssigned'))
    },
    onError,
  })
  const remove = useAction(removeRoleAction, {
    onSuccess: () => {
      refresh(t('roleRemoved'))
    },
    onError,
  })
  const busy = setActive.isPending || assign.isPending || remove.isPending

  return (
    <div className='overflow-x-auto rounded-md border bg-card'>
      <table className='w-full text-sm'>
        <thead className='border-b text-left text-muted-foreground'>
          <tr>
            <th className='px-4 py-3 font-medium'>{t('colOperator')}</th>
            <th className='px-4 py-3 font-medium'>{t('colStatus')}</th>
            <th className='px-4 py-3 font-medium'>{t('colRoles')}</th>
            {canManage ? (
              <th className='px-4 py-3 text-right font-medium'>
                {t('colActions')}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {operators.map((operator) => (
            <tr key={operator.id} className='border-b align-top last:border-0'>
              <td className='px-4 py-3'>
                <div className='font-medium'>{operator.name}</div>
                <div className='text-muted-foreground'>{operator.email}</div>
              </td>
              <td className='px-4 py-3'>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    operator.isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {t(operator.isActive ? 'active' : 'inactive')}
                </span>
              </td>
              <td className='px-4 py-3'>
                <div className='flex flex-wrap gap-1.5'>
                  {operator.roles.length === 0 ? (
                    <span className='text-xs text-muted-foreground'>—</span>
                  ) : (
                    operator.roles.map((role) => (
                      <span
                        key={role.id}
                        className='inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-xs'
                      >
                        {role.name}
                        {canManage ? (
                          <button
                            type='button'
                            aria-label={t('removeRole', { role: role.name })}
                            disabled={busy}
                            onClick={() => {
                              remove.execute({
                                operatorId: operator.id,
                                roleId: role.id,
                              })
                            }}
                            className='text-muted-foreground hover:text-destructive'
                          >
                            ×
                          </button>
                        ) : null}
                      </span>
                    ))
                  )}
                </div>
              </td>
              {canManage ? (
                <td className='px-4 py-3'>
                  <div className='flex flex-col items-end gap-2'>
                    <RoleAssigner
                      roles={roles.filter(
                        (role) =>
                          !operator.roles.some(
                            (assigned) => assigned.id === role.id
                          )
                      )}
                      disabled={busy}
                      onAssign={(roleId) => {
                        assign.execute({ operatorId: operator.id, roleId })
                      }}
                      label={t('addRole')}
                    />
                    {operator.id === selfId ? null : (
                      <Button
                        type='button'
                        size='sm'
                        variant={operator.isActive ? 'destructive' : 'outline'}
                        disabled={busy}
                        onClick={() => {
                          setActive.execute({
                            operatorId: operator.id,
                            isActive: !operator.isActive,
                          })
                        }}
                      >
                        {t(operator.isActive ? 'deactivate' : 'activate')}
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

function RoleAssigner({
  roles,
  disabled,
  onAssign,
  label,
}: {
  roles: RoleRef[]
  disabled: boolean
  onAssign: (roleId: string) => void
  label: string
}) {
  const [roleId, setRoleId] = useState('')
  if (roles.length === 0) return null
  return (
    <div className='flex items-center gap-1'>
      <select
        value={roleId}
        disabled={disabled}
        onChange={(event) => {
          setRoleId(event.target.value)
        }}
        className='h-8 rounded-md border bg-background px-2 text-xs'
      >
        <option value=''>{label}</option>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
      <Button
        type='button'
        size='sm'
        variant='outline'
        disabled={disabled || roleId === ''}
        onClick={() => {
          if (roleId) onAssign(roleId)
          setRoleId('')
        }}
      >
        +
      </Button>
    </div>
  )
}
