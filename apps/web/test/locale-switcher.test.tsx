import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The switcher persists the locale through a server action; isolate it.
const { setUserLocale } = vi.hoisted(() => ({ setUserLocale: vi.fn() }))
vi.mock('@/server/locale', () => ({ setUserLocale }))
vi.mock('next-intl', () => ({
  useLocale: () => 'fr',
  useTranslations: () => (key: string) => key,
}))

import { LocaleSwitcher } from '@/components/locale-switcher'

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    setUserLocale.mockClear()
  })

  it('renders a button for every supported locale', () => {
    render(<LocaleSwitcher />)
    expect(screen.getByRole('button', { name: 'Français' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument()
  })

  it('marks the active locale as pressed', () => {
    render(<LocaleSwitcher />)
    expect(screen.getByRole('button', { name: 'Français' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('persists the chosen locale on click', async () => {
    const user = userEvent.setup()
    render(<LocaleSwitcher />)

    await user.click(screen.getByRole('button', { name: 'English' }))

    await waitFor(() => {
      expect(setUserLocale).toHaveBeenCalledWith('en')
    })
  })
})
