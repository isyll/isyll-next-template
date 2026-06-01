'use client'

import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'

import { createPostAction } from '@/features/posts/actions'

interface PostFormValues {
  title: string
  content: string
}

export function CreatePostForm() {
  const t = useTranslations('Posts')
  const tv = useTranslations('Validation')
  const tErr = useTranslations('Errors')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PostFormValues>({ defaultValues: { title: '', content: '' } })

  const { execute, isPending } = useAction(createPostAction, {
    onSuccess: () => {
      toast.success(t('created'))
      reset()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? tErr('generic'))
    },
  })

  const onSubmit = handleSubmit(({ title, content }) => {
    execute({ title, content: content.length > 0 ? content : undefined })
  })

  return (
    <form onSubmit={onSubmit} className='space-y-3'>
      <div className='space-y-1.5'>
        <Label htmlFor='title'>{t('titleLabel')}</Label>
        <Input
          id='title'
          maxLength={200}
          aria-invalid={Boolean(errors.title)}
          {...register('title', { required: tv('required'), maxLength: 200 })}
        />
        {errors.title ? (
          <p className='text-xs text-destructive'>{errors.title.message}</p>
        ) : null}
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='content'>{t('contentLabel')}</Label>
        <Input id='content' maxLength={10000} {...register('content')} />
      </div>
      <Button type='submit' disabled={isPending}>
        {t('create')}
      </Button>
    </form>
  )
}
