'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

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
    <div className='rounded-md border bg-card'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('colOperator')}</TableHead>
            <TableHead>{t('colStatus')}</TableHead>
            <TableHead>{t('colRoles')}</TableHead>
            {canManage ? (
              <TableHead className='text-end'>{t('colActions')}</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {operators.map((operator) => (
            <TableRow key={operator.id} className='align-top'>
              <TableCell>
                <div className='font-medium'>{operator.name}</div>
                <div className='text-muted-foreground'>{operator.email}</div>
              </TableCell>
              <TableCell>
                <Badge variant={operator.isActive ? 'secondary' : 'outline'}>
                  {t(operator.isActive ? 'active' : 'inactive')}
                </Badge>
              </TableCell>
              <TableCell>
                <div className='flex flex-wrap gap-1.5'>
                  {operator.roles.length === 0 ? (
                    <span className='text-xs text-muted-foreground'>—</span>
                  ) : (
                    operator.roles.map((role) => (
                      <Badge key={role.id} variant='outline' className='gap-1'>
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
                      </Badge>
                    ))
                  )}
                </div>
              </TableCell>
              {canManage ? (
                <TableCell>
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
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
  const [roleId, setRoleId] = useState<string | null>(null)
  if (roles.length === 0) return null
  return (
    <div className='flex items-center gap-1'>
      <Select
        value={roleId}
        disabled={disabled}
        items={roles.map((role) => ({ value: role.id, label: role.name }))}
        onValueChange={(value) => {
          setRoleId(value)
        }}
      >
        <SelectTrigger size='sm' className='text-xs'>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role.id} value={role.id}>
              {role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type='button'
        size='sm'
        variant='outline'
        disabled={disabled || roleId === null}
        onClick={() => {
          if (roleId) onAssign(roleId)
          setRoleId(null)
        }}
      >
        +
      </Button>
    </div>
  )
}
