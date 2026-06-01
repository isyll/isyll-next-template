'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'

import { authClient } from '@/lib/auth-client'

interface RegisterValues {
  name: string
  email: string
  password: string
}

export function RegisterForm() {
  const t = useTranslations('Auth')
  const tv = useTranslations('Validation')
  const tErr = useTranslations('Errors')
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    defaultValues: { name: '', email: '', password: '' },
  })

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    const { error } = await authClient.signUp.email({ name, email, password })
    if (error) {
      toast.error(error.message ?? tErr('generic'))
      return
    }
    toast.success(t('checkEmail'))
    router.push('/login')
  })

  return (
    <form onSubmit={onSubmit} className='space-y-4' noValidate>
      <div className='space-y-1.5'>
        <Label htmlFor='name'>{t('name')}</Label>
        <Input
          id='name'
          autoComplete='name'
          aria-invalid={Boolean(errors.name)}
          {...register('name', { required: tv('required') })}
        />
        {errors.name ? (
          <p className='text-xs text-destructive'>{errors.name.message}</p>
        ) : null}
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='email'>{t('email')}</Label>
        <Input
          id='email'
          type='email'
          autoComplete='email'
          placeholder={t('emailPlaceholder')}
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
          autoComplete='new-password'
          aria-invalid={Boolean(errors.password)}
          {...register('password', {
            required: tv('required'),
            minLength: { value: 12, message: tv('passwordMin', { min: 12 }) },
          })}
        />
        {errors.password ? (
          <p className='text-xs text-destructive'>{errors.password.message}</p>
        ) : null}
      </div>
      <Button type='submit' className='w-full' disabled={isSubmitting}>
        {t('signUp')}
      </Button>
    </form>
  )
}
