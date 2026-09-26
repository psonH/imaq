import { CircleCheck, Truck } from 'lucide-react'
import { fmtDateTime } from '../lib/format'
import type { Key } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { useWater } from '../lib/useWater'
import { Timeline } from './Timeline'
import { Button } from './ui/button'

type Water = ReturnType<typeof useWater>

/**
 * The request button never disappears: once pressed it reads "Requested" and the
 * delivery's progress appears right below it.
 */
export function RequestWater({ water, className }: { water: Water; className?: string }) {
  const s = useStore()
  const { t, locale } = s
  const open = water.openWater

  return (
    <div className={className}>
      <Button
        variant={open ? 'outline' : 'brand'}
        size="lg"
        className="w-full"
        aria-disabled={!!open}
        onClick={() => !open && s.requestDelivery({ type: 'water', auto: false, reason: 'manual', daysLeft: water.fc.daysLeft })}
      >
        {open ? <CircleCheck /> : <Truck />} {open ? t('side.requested') : t('side.request')}
      </Button>
      {open && (
        <div className="mt-3 space-y-2" aria-live="polite">
          <p className="text-sm font-semibold">{t('del.water')}</p>
          <Timeline status={open.status} />
          <p className="font-bold">{t(`st.${open.status}` as Key)}</p>
          {open.eta && open.status !== 'delivered' && <p className="text-sm">{t('del.eta', { time: fmtDateTime(open.eta, locale) })}</p>}
        </div>
      )}
    </div>
  )
}
