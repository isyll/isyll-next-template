import type { ComponentProps } from 'react'

import { cn } from '@workspace/ui/lib/utils'

function Label({ className, ...props }: ComponentProps<'label'>) {
  return (
    // Design-system <label> primitive: consumers associate it with a control
    // via `htmlFor` at the call site (e.g. <Label htmlFor="email">), which the
    // rule cannot see from this generic wrapper.
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <label
      data-slot='label'
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export { Label }
