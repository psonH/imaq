import {
  CalendarCheck,
  CircleCheck,
  Clock,
  CloudSnow,
  Database,
  Download,
  OctagonX,
  Phone,
  Plus,
  Printer,
  Smartphone,
  TrendingDown,
  TriangleAlert,
  Truck,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog } from '../components/ui/dialog'
import { Segmented } from '../components/ui/segmented'
import { Switch } from '../components/ui/switch'
import { cn } from '../lib/cn'
import { fmtDay, fmtDateTime, fmtNum } from '../lib/format'
import type { Key } from '../lib/i18n'
import { deliverBy, type Advice, type Risk, type Why } from '../lib/planner'
import { isOpen, litresNow, newId, toCsv, type Req, type ReqSource } from '../lib/requests'
import { HOUR } from '../lib/sim'
import { useStore } from '../lib/store'
import type { usePlan } from '../lib/usePlan'

type PlanData = ReturnType<typeof usePlan>

export function SampleBadge() {
  const { t, house } = useStore()
  return (
    <Badge variant="muted" title={t('sample.body', { house })}>
      <Database aria-hidden="true" /> {t('sample.badge')}
    </Badge>
  )
}

const SOURCE_ICON: Record<ReqSource, typeof Phone> = { app: Smartphone, phone: Phone, sample: Database }

// ───────────────────────────── Requests ─────────────────────────────

export function PlantRequests({ data }: { data: PlanData }) {
  const s = useStore()
  const { t, locale, now } = s
  const [filter, setFilter] = useState<'open' | 'delivered'>('open')
  const [adding, setAdding] = useState(false)
  const [cancelling, setCancelling] = useState<Req | null>(null)

  const rows = useMemo(() => {
    const homeByHouse = new Map(data.homes.map((h) => [h.house, h]))
    return s.requests
      .filter((r) => (filter === 'open' ? isOpen(r) : r.status === 'delivered'))
      .map((r) => {
        const home = homeByHouse.get(r.house)
        const left = r.house === s.house ? home?.level : litresNow(r, now)
        const capacity = r.capacity ?? home?.capacity
        const by = r.type === 'water' && home ? deliverBy(home, data.days) : undefined
        return { r, left, capacity, by }
      })
      .sort((a, b) => (a.by ?? Infinity) - (b.by ?? Infinity) || a.r.createdAt - b.r.createdAt)
  }, [s.requests, filter, data.homes, data.days, s.house, now])

  const download = () => {
    const blob = new Blob([toCsv(s.requests)], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `imaq-requests-${new Date(now).toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{t('pr.title')}</h1>
          <SampleBadge />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={download}>
            <Download /> CSV
          </Button>
          <Button variant="brand" onClick={() => setAdding(true)}>
            <Plus /> {t('pr.add')}
          </Button>
        </div>
      </div>

      <div className="w-full sm:w-80">
        <Segmented
          name="req-filter"
          label={t('pr.filter')}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'open', label: t('pr.open') },
            { value: 'delivered', label: t('pr.delivered') },
          ]}
        />
      </div>

      <Card className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="p-6 text-muted-foreground">{t('pr.empty')}</p>
        ) : (
          <table className="w-full min-w-[48rem] text-left">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-semibold">{t('pr.house')}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{t('pr.requested')}</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">{t('pr.left')}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{t('pr.by')}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{t('pr.status')}</th>
                <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">{t('pr.actions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ r, left, capacity, by }) => {
                const source = r.house === s.house ? 'app' : (r.source ?? 'app')
                const SrcIcon = SOURCE_ICON[source]
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-semibold tabular-nums">
                        <SrcIcon aria-hidden="true" className="size-4 text-muted-foreground" />
                        <span className="sr-only">{t(`src.${source}` as Key)}: </span>
                        {r.house}
                      </span>
                      {r.type === 'sewage' && <span className="text-sm text-muted-foreground">{t('pr.sewage')}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{fmtDateTime(r.createdAt, locale)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {left !== undefined ? `${fmtNum(left, locale)} L` : '—'}
                      {left !== undefined && capacity ? <span className="block text-sm text-muted-foreground">{Math.round((left / capacity) * 100)}%</span> : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{by ? fmtDay(by, locale) : '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge r={r} />
                    </td>
                    <td className="px-4 py-3">
                      {isOpen(r) && (
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" className="min-h-11 whitespace-nowrap px-4 text-sm" onClick={() => s.setRequestStatus(r.id, 'delivered')}>
                            <CircleCheck /> {t('pr.markDelivered')}
                          </Button>
                          <Button variant="ghost" className="min-h-11 px-3 text-sm" onClick={() => setCancelling(r)} aria-label={`${t('pr.cancel')} ${r.house}`}>
                            <X /> {t('pr.cancel')}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <AddPhoneRequest open={adding} onClose={() => setAdding(false)} />

      <Dialog open={!!cancelling} onClose={() => setCancelling(null)} title={t('pr.cancelTitle')} closeLabel={t('pr.close')}>
        <p>{t('pr.cancelBody', { house: cancelling?.house ?? '' })}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setCancelling(null)}>
            {t('pr.keep')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (cancelling) s.setRequestStatus(cancelling.id, 'cancelled')
              setCancelling(null)
            }}
          >
            <X /> {t('pr.confirmCancel')}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

function StatusBadge({ r }: { r: Req }) {
  const { t, locale } = useStore()
  if (r.status === 'scheduled')
    return (
      <Badge variant="outline">
        <CalendarCheck aria-hidden="true" /> {t('pst.planned', { date: r.eta ? fmtDay(r.eta, locale) : '', truck: r.truck ?? '' })}
      </Badge>
    )
  if (r.status === 'onTheWay')
    return (
      <Badge variant="outline">
        <Truck aria-hidden="true" /> {t('pst.onTheWay')}
      </Badge>
    )
  if (r.status === 'delivered')
    return (
      <Badge variant="muted">
        <CircleCheck aria-hidden="true" /> {t('pst.delivered')}
      </Badge>
    )
  if (r.status === 'cancelled')
    return (
      <Badge variant="muted">
        <X aria-hidden="true" /> {t('pst.cancelled')}
      </Badge>
    )
  return (
    <Badge variant="warning">
      <Clock aria-hidden="true" /> {t('pst.new')}
    </Badge>
  )
}

const TANKS = [1600, 1800, 2000, 2270]

function AddPhoneRequest({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore()
  const { t, locale } = s
  const [house, setHouse] = useState('')
  const [people, setPeople] = useState(4)
  const [tank, setTank] = useState(1800)
  const [pct, setPct] = useState(30)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!house.trim()) return
    const perDay = people * 90
    const litres = Math.round((tank * pct) / 100)
    s.addRequest({
      id: newId(),
      house: house.trim(),
      type: 'water',
      status: 'sent',
      source: 'phone',
      createdAt: s.now,
      updatedAt: s.now,
      auto: false,
      reason: 'manual',
      people,
      needs: [],
      daysLeft: litres / perDay,
      capacity: tank,
      litresLeft: litres,
      perDay,
    })
    setHouse('')
    onClose()
  }

  const field = 'mt-1 block min-h-11 w-full rounded-lg border-2 bg-card px-3 text-base'
  return (
    <Dialog open={open} onClose={onClose} title={t('pr.add')} closeLabel={t('pr.close')}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="ph-house" className="font-semibold">{t('welcome.house')}</label>
          <input id="ph-house" required inputMode="numeric" autoComplete="off" value={house} onChange={(e) => setHouse(e.target.value.slice(0, 6))} className={field} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ph-people" className="font-semibold">{t('pr.people')}</label>
            <select id="ph-people" value={people} onChange={(e) => setPeople(Number(e.target.value))} className={field}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ph-tank" className="font-semibold">{t('pr.tank')}</label>
            <select id="ph-tank" value={tank} onChange={(e) => setTank(Number(e.target.value))} className={field}>
              {TANKS.map((l) => (
                <option key={l} value={l}>{fmtNum(l, locale)} L</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="ph-level" className="font-semibold">
            {t('pr.levelNow')}: <span className="tabular-nums">{pct}%</span>
          </label>
          <input id="ph-level" type="range" min={0} max={100} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="mt-2 block w-full accent-current" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('pr.close')}</Button>
          <Button type="submit" variant="default"><Phone /> {t('pr.save')}</Button>
        </div>
      </form>
    </Dialog>
  )
}

// ─────────────────────────── Delivery plan ───────────────────────────

const RISK_ICON: Record<Risk, typeof CircleCheck> = { low: CircleCheck, medium: TriangleAlert, high: OctagonX, none: X }
const RISK_VARIANT = { low: 'success', medium: 'warning', high: 'destructive', none: 'muted' } as const
const WHY: Record<Why, { icon: typeof Phone; variant: 'outline' | 'warning' }> = {
  requested: { icon: Phone, variant: 'outline' },
  reserve: { icon: TriangleAlert, variant: 'warning' },
  weather: { icon: CloudSnow, variant: 'warning' },
  predicted: { icon: TrendingDown, variant: 'outline' },
}

export function PlantPlan({ data }: { data: PlanData }) {
  const s = useStore()
  const { t, locale } = s
  const [dayIdx, setDayIdx] = useState(0)
  const [confirmed, setConfirmed] = useState<{ day: number; n: number } | null>(null)
  const d = data.plan[dayIdx]
  const dayName = (i: number) => fmtDay(data.days[i].date, locale)

  const stops = d.trucks.flatMap((tr) => tr.loads.flatMap((l) => l.stops))
  const usedTrucks = d.trucks.filter((tr) => tr.loads.length).length

  const confirmDay = () => {
    let n = 0
    d.trucks.forEach((tr) =>
      tr.loads.forEach((load, li) =>
        load.stops.forEach((stop) => {
          if (!stop.home.requested) return
          const req = s.requests.find((r) => r.house === stop.home.house && r.type === 'water' && isOpen(r))
          if (!req) return
          // Loads run from 09:00, about 1.5 h each; today's never start in the past.
          const start = Math.max(d.day.date + 9 * HOUR, Math.ceil((s.now + HOUR) / HOUR) * HOUR)
          s.setRequestStatus(req.id, 'scheduled', start + li * 1.5 * HOUR, tr.truck.id)
          n++
        }),
      ),
    )
    setConfirmed({ day: dayIdx, n })
  }

  const wxLine = t(data.weatherSource === 'live' ? 'pp.wxLive' : data.weatherSource === 'cached' ? 'pp.wxCached' : 'pp.wxTypical')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <h1 className="text-2xl font-bold">{t('pp.title')}</h1>
        <SampleBadge />
        <p className="w-full text-sm text-muted-foreground">{wxLine}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] print:hidden">
        <Card aria-labelledby="attention-title">
          <CardHeader>
            <CardTitle id="attention-title">{t('pp.attention')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.advice.map((a, i) => (
                <AdviceItem key={i} a={a} dayName={dayName} />
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card aria-labelledby="trucks-title">
          <CardHeader>
            <CardTitle id="trucks-title">{t('pp.trucks')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.trucks.map((tr) => (
              <Switch
                key={tr.id}
                label={`${tr.id} · ${fmtNum(tr.capacity, locale)} L`}
                checked={tr.inService}
                onChange={(on) => data.setTruck(tr.id, on)}
                onText={t('pp.inService')}
                offText={t('pp.maintenance')}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="days-title" className="space-y-4">
        <h2 id="days-title" className="sr-only">{t('pp.days')}</h2>
        <div role="tablist" aria-label={t('pp.days')} className="flex gap-2 overflow-x-auto pb-1 print:hidden">
          {data.days.map((day, i) => {
            const Icon = RISK_ICON[day.risk]
            const active = i === dayIdx
            return (
              <button
                key={day.date}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls="day-panel"
                onClick={() => setDayIdx(i)}
                className={cn(
                  'flex min-h-14 shrink-0 flex-col items-start justify-center rounded-xl border-2 px-4 text-left',
                  active ? 'border-foreground bg-muted' : 'border-border hover:bg-muted',
                )}
              >
                <span className="font-bold tabular-nums">{dayName(i)}</span>
                <span className="flex items-center gap-1 text-sm">
                  <Icon aria-hidden="true" className="size-4" /> {t(`risk.${day.risk}` as Key)}
                </span>
              </button>
            )
          })}
        </div>

        <div id="day-panel" role="tabpanel" aria-label={dayName(dayIdx)} className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Badge variant={RISK_VARIANT[d.day.risk]}>
              {(() => {
                const Icon = RISK_ICON[d.day.risk]
                return <Icon aria-hidden="true" />
              })()}
              {t(`risk.${d.day.risk}` as Key)}
            </Badge>
            <p className="font-semibold tabular-nums">
              {d.shiftFactor > 0 ? t('pp.summary', { stops: stops.length, trucks: usedTrucks, litres: fmtNum(d.delivered, locale) }) : t('pp.noService')}
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">{t('pp.storage', { litres: fmtNum(d.storageEnd, locale) })}</p>
          </div>

          {d.missed.length > 0 && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border-2 border-destructive bg-destructive/10 p-4 print:hidden">
              <OctagonX aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-destructive" />
              <div>
                <p className="font-bold">{t('pp.unreached', { n: d.missed.length })}</p>
                <p className="text-sm tabular-nums">
                  {t('pp.unreachedBody', { houses: d.missed.slice(0, 24).map((h) => h.house).join(', ') + (d.missed.length > 24 ? '…' : '') })}
                </p>
              </div>
            </div>
          )}

          {d.shiftFactor > 0 && stops.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <Button variant="default" onClick={confirmDay}>
                <CalendarCheck /> {t('pp.confirm')}
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer /> {t('pp.print')}
              </Button>
              {confirmed?.day === dayIdx && (
                <p role="status" className="flex items-center gap-2 font-semibold">
                  <CircleCheck aria-hidden="true" className="size-5 text-success" /> {t('pp.confirmed', { n: confirmed.n })}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-2 print:block">
            {d.trucks.map((tr) => {
              const pct = tr.minutesAvailable ? Math.round((tr.minutesUsed / tr.minutesAvailable) * 100) : 0
              return (
                <Card key={tr.truck.id} className="print:mb-6 print:break-inside-avoid print:shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck aria-hidden="true" className="size-5 text-brand" />
                      <span className="hidden print:inline">{t('pp.sheet', { day: dayName(dayIdx), truck: tr.truck.id })}</span>
                      <span className="print:hidden">{tr.truck.id}</span>
                    </CardTitle>
                    <CardDescription className="tabular-nums">{t('pp.time', { used: tr.minutesUsed, avail: tr.minutesAvailable })}</CardDescription>
                    <div
                      role="progressbar"
                      aria-label={`${tr.truck.id}: ${t('pp.time', { used: tr.minutesUsed, avail: tr.minutesAvailable })}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={pct}
                      className="mt-2 h-2.5 rounded-full bg-muted print:hidden"
                    >
                      <div className="h-2.5 rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {tr.loads.length === 0 && <p className="text-muted-foreground">{t('pp.noStops')}</p>}
                    {tr.loads.map((load, li) => (
                      <div key={li}>
                        <h3 className="mb-2 text-sm font-bold tabular-nums">{t('pp.load', { n: li + 1, litres: fmtNum(load.litres, locale) })}</h3>
                        <ol className="divide-y rounded-lg border">
                          {load.stops.map((stop) => {
                            const W = WHY[stop.why]
                            return (
                              <li key={stop.home.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                                <span className="text-sm text-muted-foreground">{t('pp.route', { n: stop.home.route })}</span>
                                <span className="font-semibold tabular-nums">
                                  {t('plant.house', { n: stop.home.house })}
                                  {stop.home.house === s.house && <span className="ml-1 text-sm font-normal text-muted-foreground">({t('plant.you')})</span>}
                                </span>
                                <span className="tabular-nums">{fmtNum(stop.litres, locale)} L</span>
                                <Badge variant={W.variant} className="ml-auto">
                                  <W.icon aria-hidden="true" /> {t(`why.${stop.why}` as Key)}
                                </Badge>
                              </li>
                            )
                          })}
                        </ol>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

function AdviceItem({ a, dayName }: { a: Advice; dayName: (i: number) => string }) {
  const { t, locale } = useStore()
  if (a.kind === 'ok')
    return (
      <li className="flex items-start gap-2">
        <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" /> {t('adv.ok')}
      </li>
    )
  const text =
    a.kind === 'addTime'
      ? t('adv.addTime', { day: dayName(a.day), hours: a.hours, shifts: a.shifts, n: a.homes })
      : a.kind === 'noService'
        ? t('adv.noService', { day: dayName(a.day), n: a.homes })
        : a.kind === 'storm'
          ? t('adv.storm', { day: dayName(a.day), n: a.homes })
          : a.kind === 'storage'
            ? t('adv.storage', { day: dayName(a.day), litres: fmtNum(a.litres, locale) })
            : t('adv.maintenance', { trucks: a.trucks.join(', ') })
  const Icon = a.kind === 'storm' ? CloudSnow : a.kind === 'maintenance' ? Truck : TriangleAlert
  return (
    <li className="flex items-start gap-2">
      <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', a.kind === 'maintenance' ? 'text-muted-foreground' : 'text-warning')} /> {text}
    </li>
  )
}
