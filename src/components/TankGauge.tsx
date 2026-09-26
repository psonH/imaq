import { useId } from 'react'
import { cn } from '../lib/cn'

// Tank drawn as a vessel with its fill level. The number beside it carries the
// meaning; the drawing is a quick visual for people who read icons first.
export function TankGauge({ pct, label, size = 'md', tone = 'brand' }: { pct: number; label: string; size?: 'sm' | 'md'; tone?: 'brand' | 'muted' }) {
  const clip = useId()
  const p = Math.max(0, Math.min(1, pct))
  const inner = 148
  const fillH = inner * p
  return (
    <svg viewBox="0 0 96 170" className={cn('w-auto shrink-0', size === 'sm' ? 'h-28' : 'h-44')} role="img" aria-label={label}>
      <rect x="18" y="2" width="60" height="10" rx="4" className="fill-muted stroke-border" strokeWidth="2" />
      <rect x="6" y="12" width="84" height="154" rx="18" className="fill-muted stroke-foreground" strokeWidth="3" />
      <clipPath id={clip}>
        <rect x="9" y="15" width="78" height={inner} rx="15" />
      </clipPath>
      <rect x="9" y={15 + inner - fillH} width="78" height={fillH} className={tone === 'brand' ? 'fill-brand' : 'fill-muted-foreground'} clipPath={`url(#${clip})`} />
      {[0.25, 0.5, 0.75].map((m) => (
        <line key={m} x1="70" x2="87" y1={15 + inner * (1 - m)} y2={15 + inner * (1 - m)} className="stroke-foreground" strokeWidth="2" opacity="0.5" />
      ))}
    </svg>
  )
}
