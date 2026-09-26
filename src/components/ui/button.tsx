import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

// Pill buttons (2one rule), 48px minimum touch target, colour set by variant only.
const VARIANT = {
  default: 'bg-primary text-primary-foreground hover:opacity-90',
  brand: 'bg-brand text-brand-foreground hover:opacity-90',
  outline: 'border-2 border-border bg-card text-foreground hover:bg-muted',
  ghost: 'text-foreground hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
} as const

const SIZE = {
  default: 'min-h-12 px-5 text-base',
  lg: 'min-h-14 px-6 text-lg',
  icon: 'size-12',
} as const

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT
  size?: keyof typeof SIZE
}

export function Button({ variant = 'default', size = 'default', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    />
  )
}
