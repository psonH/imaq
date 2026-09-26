import { Bell, Droplets, Truck } from 'lucide-react'
import { useState } from 'react'
import { RequestCard } from '../components/RequestCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Segmented } from '../components/ui/segmented'
import { Switch } from '../components/ui/switch'
import { fmtDateTime, fmtNum } from '../lib/format'
import type { Key } from '../lib/i18n'
import { isOpen } from '../lib/requests'
import { useStore } from '../lib/store'
import type { useWater } from '../lib/useWater'

type Water = ReturnType<typeof useWater>

export function Deliveries({ water }: { water: Water }) {
  const s = useStore()
  const { t, locale } = s
  const [permission, setPermission] = useState(() => ('Notification' in window ? Notification.permission : 'denied'))
  const past = water.mine.filter((r) => !isOpen(r)).slice(0, 8)

  const togglePhone = async (on: boolean) => {
    if (!on) return s.setPrefs({ notify: false })
    if (!('Notification' in window)) return
    const p = await Notification.requestPermission()
    setPermission(p)
    s.setPrefs({ notify: p === 'granted' })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('del.title')}</h1>
      <p className="text-lg">{s.autoRequest ? t('del.autoOn', { n: fmtNum(s.alertDays, locale, 1) }) : t('del.autoOff')}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <RequestCard type="water" open={water.openWater} daysLeft={water.fc.daysLeft} primary />
        <RequestCard type="sewage" open={water.openSewage} daysLeft={water.fc.sewageDaysLeft} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card aria-labelledby="alerts-title">
          <CardHeader className="flex-row items-center gap-3">
            <Bell aria-hidden="true" className="size-6 shrink-0 text-brand" />
            <CardTitle id="alerts-title">{t('del.alerts')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-2 font-semibold" aria-hidden="true">
                {t('del.alertAt')}
              </p>
              <Segmented
                name="alertDays"
                label={t('del.alertAt')}
                value={String(s.alertDays)}
                onChange={(v) => s.setData({ alertDays: Number(v) })}
                options={[1, 1.5, 2].map((d) => ({ value: String(d), label: t(d === 1 ? 'glance.day' : 'glance.days', { n: fmtNum(d, locale, d % 1 ? 1 : 0) }) }))}
              />
            </div>
            <Switch label={t('del.autoRequest')} checked={s.autoRequest} onChange={(v) => s.setData({ autoRequest: v })} onText={t('on')} offText={t('off')} />
            <Switch label={t('del.phoneAlerts')} checked={s.notify && permission === 'granted'} onChange={togglePhone} onText={t('on')} offText={t('off')} />
            {permission === 'denied' && <p className="text-sm text-muted-foreground">{t('del.phoneBlocked')}</p>}
          </CardContent>
        </Card>

        <Card aria-labelledby="past-title">
          <CardHeader>
            <CardTitle id="past-title">{t('del.history')}</CardTitle>
            {!past.length && <CardDescription>—</CardDescription>}
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {past.map((r) => {
                const Icon = r.type === 'water' ? Droplets : Truck
                return (
                  <li key={r.id} className="flex items-center gap-3 py-3">
                    <Icon aria-hidden="true" className="size-6 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{t(r.type === 'water' ? 'del.water' : 'del.sewage')}</p>
                      <p className="text-sm text-muted-foreground">{fmtDateTime(r.createdAt, locale)}</p>
                    </div>
                    <p className="text-sm font-semibold">{t(`st.${r.status}` as Key)}</p>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
