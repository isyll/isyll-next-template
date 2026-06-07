'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'

import type { PermissionDTO, RoleDTO } from '@/features/admin-operators/queries'

import {
  createRoleAction,
  deleteRoleAction,
  setRolePermissionAction,
} from './actions'

export function RolesManager({
  roles,
  permissions,
  canManage,
}: {
  roles: RoleDTO[]
  permissions: PermissionDTO[]
  canManage: boolean
}) {
  const t = useTranslations('AdminRoles')
  const tErr = useTranslations('Errors')
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const refresh = (message: string) => {
    toast.success(message)
    router.refresh()
  }
  const onError = () => {
    toast.error(tErr('generic'))
  }

  const create = useAction(createRoleAction, {
    onSuccess: () => {
      setName('')
      setDescription('')
      refresh(t('created'))
    },
    onError,
  })
  const setPermission = useAction(setRolePermissionAction, {
    onSuccess: () => {
      router.refresh()
    },
    onError,
  })
  const remove = useAction(deleteRoleAction, {
    onSuccess: () => {
      refresh(t('deleted'))
    },
    onError,
  })

  return (
    <div className='space-y-6'>
      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>{t('createTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className='flex flex-wrap items-end gap-3'
              onSubmit={(event) => {
                event.preventDefault()
                if (name.trim()) {
                  create.execute({
                    name: name.trim(),
                    description: description.trim() || undefined,
                  })
                }
              }}
            >
              <div className='space-y-1.5'>
                <Label htmlFor='role-name'>{t('name')}</Label>
                <Input
                  id='role-name'
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                  }}
                  className='w-48'
                  required
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='role-description'>{t('description')}</Label>
                <Input
                  id='role-description'
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value)
                  }}
                  className='w-72'
                />
              </div>
              <Button type='submit' disabled={create.isPending || !name.trim()}>
                {t('create')}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {roles.map((role) => {
        const granted = new Set(role.permissionKeys)
        return (
          <Card key={role.id}>
            <CardHeader className='flex-row items-start justify-between gap-4'>
              <div>
                <CardTitle className='flex items-center gap-2 text-base'>
                  {role.name}
                  {role.isSystem ? (
                    <span className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase'>
                      {t('system')}
                    </span>
                  ) : null}
                </CardTitle>
                {role.description ? (
                  <p className='mt-1 text-sm text-muted-foreground'>
                    {role.description}
                  </p>
                ) : null}
              </div>
              {canManage && !role.isSystem ? (
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  disabled={remove.isPending}
                  onClick={() => {
                    remove.execute({ roleId: role.id })
                  }}
                >
                  {t('delete')}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              <ul className='grid gap-2 sm:grid-cols-2'>
                {permissions.map((permission) => (
                  <li key={permission.id}>
                    <label className='flex items-start gap-2 text-sm'>
                      <input
                        type='checkbox'
                        className='mt-0.5'
                        checked={granted.has(permission.key)}
                        disabled={!canManage || setPermission.isPending}
                        onChange={(event) => {
                          setPermission.execute({
                            roleId: role.id,
                            permissionId: permission.id,
                            granted: event.target.checked,
                          })
                        }}
                      />
                      <span>
                        <span className='font-mono text-xs'>
                          {permission.key}
                        </span>
                        {permission.description ? (
                          <span className='block text-xs text-muted-foreground'>
                            {permission.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
