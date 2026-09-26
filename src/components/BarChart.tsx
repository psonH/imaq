import { cn } from '../lib/cn'

export type Bar = { key: string | number; label: string; value: number; title: string }

function niceMax(v: number) {
  if (v <= 0) return 10
  const step = v > 400 ? 100 : v > 100 ? 50 : v > 20 ? 10 : 5
  return Math.ceil(v / step) * step
}

// Value axis always starts at 0. Highlighted bars also get a text marker, so the
// highlight never depends on colour.
export function BarChart({
  bars,
  unit,
  avg,
  avgLabel,
  highlight = [],
  highlightLabel,
  labelEvery = 1,
  summary,
  height = 'h-44',
}: {
  bars: Bar[]
  unit: string
  avg?: number
  avgLabel?: string
  highlight?: (string | number)[]
  highlightLabel?: string
  labelEvery?: number
  summary: string
  height?: string
}) {
  const max = niceMax(Math.max(...bars.map((b) => b.value), avg ?? 0))
  const ticks = [max, max / 2, 0]
  return (
    <figure className="m-0">
      <div className="flex gap-2" role="img" aria-label={summary}>
        <div className={cn('flex flex-col justify-between text-right text-xs tabular-nums text-muted-foreground', height)} aria-hidden="true">
          {ticks.map((tk) => (
            <span key={tk} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {tk} {unit}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className={cn('relative flex items-end gap-[3px] border-b-2 border-foreground/60', height)} aria-hidden="true">
            {ticks.slice(0, 2).map((tk) => (
              <div key={tk} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${(tk / max) * 100}%` }} />
            ))}
            {bars.map((b) => {
              const hi = highlight.includes(b.key)
              return (
                <div key={b.key} className="relative flex h-full flex-1 items-end" title={b.title}>
                  <div
                    className={cn('w-full rounded-t-sm', hi ? 'bg-brand' : 'bg-muted-foreground/70')}
                    style={{ height: `${Math.max(1, (b.value / max) * 100)}%` }}
                  />
                </div>
              )
            })}
            {avg !== undefined && (
              <div className="pointer-events-none absolute inset-x-0 border-t-2 border-foreground" style={{ bottom: `${(avg / max) * 100}%` }}>
                <span className="absolute -top-5 right-0 rounded bg-card px-1 text-xs font-semibold">
                  {avgLabel} {Math.round(avg)} {unit}
                </span>
              </div>
            )}
          </div>
          <div className="mt-1 flex gap-[3px] text-[11px] text-muted-foreground" aria-hidden="true">
            {bars.map((b, i) => (
              <span key={b.key} className="flex flex-1 justify-center overflow-visible whitespace-nowrap">
                <span className={cn(highlight.includes(b.key) && 'font-bold text-foreground underline decoration-2 underline-offset-4')}>
                  {i % labelEvery === 0 ? b.label : ''}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
      {highlightLabel && highlight.length > 0 && (
        <figcaption className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block size-3 rounded-sm bg-brand" aria-hidden="true" />
          <span className="font-bold text-foreground underline decoration-2 underline-offset-4">{highlightLabel}</span>
        </figcaption>
      )}
    </figure>
  )
}
