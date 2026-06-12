import type { ReactNode } from 'react'

/**
 * Consistent empty/degraded state for admin lists and panels — a bordered,
 * muted message. Replaces the three ad-hoc empty renderings the console pages
 * had grown.
 */
export function EmptyState({
  children,
  icon,
}: {
  children: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className='flex flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-card p-8 text-center text-sm text-muted-foreground'>
      {icon ? <div aria-hidden='true'>{icon}</div> : null}
      <p>{children}</p>
    </div>
  )
}
