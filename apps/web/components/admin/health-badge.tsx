import { cn } from '@workspace/ui/lib/utils'

import type { HealthStatus } from '@/features/admin-monitoring/health-queries'

const DOT: Record<HealthStatus, string> = {
  ok: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  down: 'bg-destructive',
  unconfigured: 'bg-muted-foreground/40',
}

/**
 * A health indicator: a status dot + a label (e.g. "Operational · 4 ms"). The
 * status is conveyed by text too (the label), not color alone, for WCAG.
 */
export function HealthBadge({
  status,
  label,
}: {
  status: HealthStatus
  label: string
}) {
  return (
    <span className='inline-flex items-center gap-2 text-sm font-medium'>
      <span
        className={cn('size-2.5 shrink-0 rounded-full', DOT[status])}
        aria-hidden='true'
      />
      {label}
    </span>
  )
}
