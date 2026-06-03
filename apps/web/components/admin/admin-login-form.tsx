'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'

import { adminAuthClient } from '@/lib/admin-auth-client'

interface AdminLoginValues {
  email: string
  password: string
}

export function AdminLoginForm() {
  const t = useTranslations('Admin')
  const tv = useTranslations('Validation')
  const tErr = useTranslations('Errors')
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginValues>({ defaultValues: { email: '', password: '' } })

  const onSubmit = handleSubmit(async ({ email, password }) => {
    const { error } = await adminAuthClient.signIn.email({
      email,
      password,
      callbackURL: '/admin',
    })
    if (error) {
      toast.error(tErr('invalidCredentials'))
      return
    }
    router.push('/admin')
    router.refresh()
  })

  return (
    <form onSubmit={onSubmit} className='space-y-4' noValidate>
      <div className='space-y-1.5'>
        <Label htmlFor='email'>{t('email')}</Label>
        <Input
          id='email'
          type='email'
          autoComplete='email'
          aria-invalid={Boolean(errors.email)}
          {...register('email', {
            required: tv('required'),
            pattern: {
              value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
              message: tv('email'),
            },
          })}
        />
        {errors.email ? (
          <p className='text-xs text-destructive'>{errors.email.message}</p>
        ) : null}
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='password'>{t('password')}</Label>
        <Input
          id='password'
          type='password'
          autoComplete='current-password'
          aria-invalid={Boolean(errors.password)}
          {...register('password', {
            required: tv('required'),
            minLength: { value: 16, message: tv('passwordMin', { min: 16 }) },
          })}
        />
        {errors.password ? (
          <p className='text-xs text-destructive'>{errors.password.message}</p>
        ) : null}
      </div>
      <Button type='submit' className='w-full' disabled={isSubmitting}>
        {t('signIn')}
      </Button>
    </form>
  )
}
