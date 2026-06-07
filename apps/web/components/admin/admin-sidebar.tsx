'use client'

import { LayoutDashboard, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'

import { cn } from '@workspace/ui/lib/utils'

/**
 * Operator console navigation. Items are filtered by the operator's PBAC
 * permissions (passed from the server layout). Add a section by appending here
 * and creating the matching route + permission. Lives on the dark sidebar of
 * the admin theme (see the `.admin` block in globals.css).
 */
interface NavItem {
  href: '/admin' | '/admin/users'
  labelKey: string
  icon: ComponentType<{ className?: string }>
  /** Required permission, or null for always-visible. */
  permission: string | null
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    href: '/admin',
    labelKey: 'dashboard',
    icon: LayoutDashboard,
    permission: null,
  },
  {
    href: '/admin/users',
    labelKey: 'users',
    icon: Users,
    permission: 'users.read',
  },
]

export function AdminSidebar({
  permissions,
  appName,
}: {
  permissions: readonly string[]
  appName: string
}) {
  const t = useTranslations('AdminNav')
  const pathname = usePathname()
  const allowed = new Set(permissions)
  const items = NAV_ITEMS.filter(
    (item) => item.permission === null || allowed.has(item.permission)
  )

  return (
    <aside className='flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground'>
      <div className='flex h-14 items-center gap-2 border-b border-sidebar-border px-4'>
        <span className='truncate font-semibold tracking-tight'>{appName}</span>
        <span className='rounded bg-sidebar-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-sidebar-primary uppercase'>
          Admin
        </span>
      </div>
      <nav className='flex-1 space-y-1 overflow-y-auto p-2'>
        {items.map((item) => {
          const active =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              )}
            >
              <Icon className='size-4 shrink-0' />
              {t(item.labelKey)}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
