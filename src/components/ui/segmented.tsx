import { cn } from '../../lib/cn'

// Single-choice control built on native radios: arrow keys, screen readers and
// forms all work without extra code.
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  name,
}: {
  label: string
  name: string
  value: T
  options: { value: T; label: string; lang?: string; ariaLabel?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap gap-1 rounded-full bg-muted p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'relative flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full px-4 text-sm font-semibold whitespace-nowrap has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring',
              value === o.value ? 'bg-card text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
              aria-label={o.ariaLabel ?? o.label}
            />
            <span lang={o.lang}>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
