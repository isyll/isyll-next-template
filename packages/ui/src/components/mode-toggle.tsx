'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@workspace/ui/components/button'

function ModeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant='ghost'
      size='icon'
      aria-label='Toggle theme'
      onClick={() => {
        setTheme(isDark ? 'light' : 'dark')
      }}
    >
      <Sun className='hidden dark:block' />
      <Moon className='block dark:hidden' />
    </Button>
  )
}

export { ModeToggle }
