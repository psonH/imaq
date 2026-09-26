import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

// Native <dialog>: focus is trapped, Esc closes it, and the page behind is inert.
export function Dialog({ open, onClose, title, children, closeLabel }: { open: boolean; onClose: () => void; title: string; children: ReactNode; closeLabel: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="dialog-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-foreground/40"
    >
      <div className="flex items-center justify-between gap-3 border-b p-5">
        <h2 id="dialog-title" className="text-lg font-bold">
          {title}
        </h2>
        <button type="button" onClick={onClose} aria-label={closeLabel} className="grid size-11 place-items-center rounded-full hover:bg-muted">
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </dialog>
  )
}
