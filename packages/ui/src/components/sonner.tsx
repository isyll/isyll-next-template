'use client'

import { useTheme } from 'next-themes'
import type { ComponentProps } from 'react'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = ComponentProps<typeof Sonner>

function Toaster(props: ToasterProps) {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      className='toaster group'
      richColors
      closeButton
      {...props}
      theme={theme as 'light' | 'dark' | 'system'}
    />
  )
}

export { Toaster }
