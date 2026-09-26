import { useEffect, useRef } from 'react'
import type { Key } from './i18n'
import { conservationBudget, HOUR, WHO_BASIC_LPPD } from './sim'
import { useStore } from './store'
import type { useWater } from './useWater'

type Water = ReturnType<typeof useWater>

export async function notify(title: string, body: string) {
  try {
    navigator.vibrate?.(200)
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, { body, icon: 'icon.svg', tag: 'imaq' })
    else new Notification(title, { body, icon: 'icon.svg' })
  } catch {}
}

/**
 * Watches the tanks and the forecast. When water runs low, a blizzard would
 * outlast the tank, or the sewage tank is nearly full, it asks the water plant
 * for a truck — once — and tells the household. Also announces status changes
 * the plant makes (booked, on the way, delivered).
 */
export function useAutoRequests(water: Water, enabled: boolean) {
  const s = useStore()
  const fired = useRef<Record<string, number>>({})
  const seen = useRef<Record<string, string>>({})

  const recentlyCancelled = (type: 'water' | 'sewage') =>
    water.mine.some((r) => r.type === type && r.status === 'cancelled' && s.now - r.updatedAt < 12 * HOUR)

  const fire = (key: string, run: () => void) => {
    if (fired.current[key] && Date.now() - fired.current[key] < 60_000) return
    fired.current[key] = Date.now()
    run()
  }

  useEffect(() => {
    if (!enabled || !s.onboarded || !s.autoRequest) return
    const { fc, storm, openWater, openSewage } = water

    if (!openWater && !recentlyCancelled('water')) {
      const stormShort =
        storm && storm.start > s.now && conservationBudget(fc.level, s.now, storm.end + 12 * HOUR, s.people).perPerson < WHO_BASIC_LPPD
      const low = fc.daysLeft <= s.alertDays
      if (low || stormShort) {
        fire('water', () => {
          s.requestDelivery({ type: 'water', auto: true, reason: stormShort && !low ? 'storm' : 'low', daysLeft: fc.daysLeft })
          if (s.notify) notify(s.t('notify.requested'), s.t(stormShort && !low ? 'alert.stormAsked' : 'alert.lowAsked'))
        })
      }
    }

    if (!openSewage && !recentlyCancelled('sewage') && (fc.sewageFull || fc.sewageDaysLeft <= s.alertDays)) {
      fire('sewage', () => {
        s.requestDelivery({ type: 'sewage', auto: true, reason: 'full', daysLeft: fc.sewageDaysLeft })
        if (s.notify) notify(s.t('notify.requested'), s.t('alert.sewageAsked'))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, water.fc.daysLeft, water.fc.sewageDaysLeft, water.openWater?.id, water.openSewage?.id, water.storm?.start, s.autoRequest, s.alertDays, s.onboarded])

  // Tell the household when the plant updates one of its requests.
  useEffect(() => {
    if (!enabled) return
    for (const r of water.mine) {
      const prev = seen.current[r.id]
      seen.current[r.id] = r.status
      if (prev && prev !== r.status && r.status !== 'cancelled') {
        if (s.notify) notify(s.t(`del.${r.type}` as Key), s.t(`st.${r.status}` as Key))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [water.mine])
}
