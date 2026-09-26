import { Check } from 'lucide-react'
import { cn } from '../lib/cn'
import type { Key } from '../lib/i18n'
import { STEPS, type ReqStatus } from '../lib/requests'
import { useStore } from '../lib/store'

// Progress of one request: Asked → Truck booked → On the way → Done.
// Done steps show a check, the current step is filled and bold, later steps are
// outlined, so progress never depends on colour.
export function Timeline({ status }: { status: ReqStatus }) {
  const { t } = useStore()
  const current = status === 'queued' ? 0 : STEPS.indexOf(status)
  return (
    <ol className="grid grid-cols-4 gap-1">
      {STEPS.map((step, i) => {
        const done = i < current || (i === current && step === 'delivered')
        const active = i === current && !done
        const label = i === 0 && status === 'queued' ? t('st.queued') : t(`st.${step}` as Key)
        return (
          <li key={step} className="flex flex-col items-center gap-1 text-center" aria-current={active ? 'step' : undefined}>
            <div className="flex w-full items-center">
              <span className={cn('h-1 flex-1 rounded-full', i === 0 ? 'opacity-0' : i <= current ? 'bg-brand' : 'bg-border')} aria-hidden="true" />
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-bold',
                  done && 'border-brand bg-brand text-brand-foreground',
                  active && 'border-foreground bg-foreground text-background',
                  !done && !active && 'border-border text-muted-foreground',
                )}
                aria-hidden="true"
              >
                {done ? <Check className="size-5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn('h-1 flex-1 rounded-full', i === STEPS.length - 1 ? 'opacity-0' : i < current ? 'bg-brand' : 'bg-border')} aria-hidden="true" />
            </div>
            <span className={cn('text-xs leading-tight sm:text-sm', active ? 'font-bold text-foreground' : done ? 'text-foreground' : 'text-muted-foreground')}>
              {label}
              {done && <span className="sr-only"> ✓</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
