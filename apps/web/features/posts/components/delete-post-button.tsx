'use client'

import { Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'

import { deletePostAction } from '@/features/posts/actions'

export function DeletePostButton({ id }: { id: string }) {
  const t = useTranslations('Posts')
  const tCommon = useTranslations('Common')
  const tErr = useTranslations('Errors')

  const { execute, isPending } = useAction(deletePostAction, {
    onSuccess: () => {
      toast.success(t('deleted'))
    },
    onError: () => {
      toast.error(tErr('generic'))
    },
  })

  return (
    <Button
      size='icon-sm'
      variant='ghost'
      disabled={isPending}
      aria-label={tCommon('delete')}
      onClick={() => {
        execute({ id })
      }}
    >
      <Trash2 />
    </Button>
  )
}
