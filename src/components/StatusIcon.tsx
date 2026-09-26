import { CircleCheck, OctagonX, TriangleAlert } from 'lucide-react'
import type { WaterStatus } from '../lib/quality'
import { cn } from '../lib/cn'

// Status is never colour alone: each state has its own colour AND shape, like
// road signs. circle + check = good · triangle = attention · octagon = stop
export const STATUS_STYLE: Record<WaterStatus, { icon: typeof CircleCheck; fg: string; bg: string; ring: string }> = {
  safe: { icon: CircleCheck, fg: 'text-success', bg: 'bg-success/10', ring: 'border-success' },
  check: { icon: TriangleAlert, fg: 'text-warning', bg: 'bg-warning/10', ring: 'border-warning' },
  unsafe: { icon: OctagonX, fg: 'text-destructive', bg: 'bg-destructive/10', ring: 'border-destructive' },
}

export function StatusIcon({ status, className }: { status: WaterStatus; className?: string }) {
  const S = STATUS_STYLE[status]
  return <S.icon aria-hidden="true" className={cn(S.fg, className)} strokeWidth={2.25} />
}
