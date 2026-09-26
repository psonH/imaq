import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const VARIANT = {
  outline: 'border-border',
  success: 'border-success bg-success/10',
  warning: 'border-warning bg-warning/10',
  destructive: 'border-destructive bg-destructive/10',
  muted: 'border-transparent bg-muted',
} as const

// Always pass an icon and words as children; the colour only reinforces them.
export function Badge({ variant = 'outline', className, ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof VARIANT }) {
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap [&_svg]:size-4', VARIANT[variant], className)} {...props} />
}
