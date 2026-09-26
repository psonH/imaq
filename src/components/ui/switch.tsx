import { cn } from '../../lib/cn'

export function Switch({ checked, onChange, label, onText, offText }: { checked: boolean; onChange: (v: boolean) => void; label: string; onText: string; offText: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between gap-4 rounded-lg py-2 text-left"
    >
      <span className="font-medium">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{checked ? onText : offText}</span>
        <span className={cn('relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 transition-colors', checked ? 'border-brand bg-brand' : 'border-border bg-muted')}>
          <span className={cn('inline-block size-5 rounded-full bg-card shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
        </span>
      </span>
    </button>
  )
}
