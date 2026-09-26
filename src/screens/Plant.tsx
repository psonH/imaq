import { ArrowLeft, CloudSnow, Download, Droplets, Truck } from 'lucide-react'
import { useMemo } from 'react'
import { StatusIcon } from '../components/StatusIcon'
import { Timeline } from '../components/Timeline'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { cn } from '../lib/cn'
import { fmtDateTime, fmtNum, fmtTime } from '../lib/format'
import type { Key } from '../lib/i18n'
import { isOpen, nextSlot, priority, toCsv, type Req } from '../lib/requests'
import { HOUR, startOfDay } from '../lib/sim'
import { useStore } from '../lib/store'
import type { StormWindow } from '../lib/weather'

export function Plant({ storm }: { storm: StormWindow | null }) {
  const s = useStore()
  const { t, locale, now } = s

  const open = useMemo(
    () =>
      s.requests
        .filter(isOpen)
        .map((r) => ({ r, p: priority(r, now, storm) }))
        .sort((a, b) => b.p.score - a.p.score),
    [s.requests, now, storm],
  )
  const doneToday = s.requests.filter((r) => r.status === 'delivered' && r.updatedAt >= startOfDay(now))
  const urgent = open.filter(({ r }) => r.daysLeft < 1).length
  const priorityHomes = open.filter(({ r }) => r.needs.length > 0).length

  const download = () => {
    const blob = new Blob([toCsv(s.requests)], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `imaq-deliveries-${new Date(now).toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{t('plant.title')}</p>
          <h1 className="text-2xl font-bold">{t('plant.subtitle')}</h1>
        </div>
        <a href="#home" className="inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-border px-5 font-semibold hover:bg-muted">
          <ArrowLeft aria-hidden="true" className="size-5" /> {t('plant.back')}
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={t('plant.open')} value={open.length} />
        <Stat label={t('plant.urgent')} value={urgent} />
        <Stat label={t('plant.priority')} value={priorityHomes} />
        <Stat label={t('plant.done')} value={doneToday.length} />
      </div>

      {storm && storm.end > now && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border-2 border-foreground bg-muted p-4">
          <CloudSnow aria-hidden="true" className="size-8 shrink-0" />
          <p className="text-lg font-semibold">{t('plant.storm', { start: fmtDateTime(storm.start, locale) })}</p>
        </div>
      )}

      <section aria-labelledby="queue-title" className="space-y-3">
        <h2 id="queue-title" className="text-lg font-bold">
          {t('plant.queue')}
        </h2>
        {open.length === 0 && <p className="text-muted-foreground">{t('plant.empty')}</p>}
        <ol className="grid gap-3 lg:grid-cols-2">
          {open.map(({ r, p }, i) => (
            <li key={r.id}>
              <QueueItem r={r} rank={i + 1} score={p.score} reasons={p.reasons} storm={storm} />
            </li>
          ))}
        </ol>
      </section>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{t('plant.export')}</CardTitle>
            <CardDescription>{t('plant.exportBody')}</CardDescription>
          </div>
          <Button variant="outline" onClick={download}>
            <Download /> CSV
          </Button>
        </CardHeader>
      </Card>
    </div>
  )
}

function QueueItem({ r, rank, score, reasons, storm }: { r: Req; rank: number; score: number; reasons: string[]; storm: StormWindow | null }) {
  const s = useStore()
  const { t, locale, now } = s
  const mine = r.house === s.house
  const Icon = r.type === 'water' ? Droplets : Truck
  const waitH = Math.max(0, Math.round((now - r.createdAt) / HOUR))
  const urgent = r.daysLeft < 1

  // Book the next truck slot, but before the storm if one is coming.
  const book = () => {
    let eta = nextSlot(now)
    if (storm && storm.start > now && eta >= storm.start) eta = Math.max(now + HOUR, storm.start - 2 * HOUR)
    s.setRequestStatus(r.id, 'scheduled', eta)
  }

  const action =
    r.status === 'sent' || r.status === 'queued' ? (
      <Button variant="brand" onClick={book}>
        {t('plant.book')}
      </Button>
    ) : r.status === 'scheduled' ? (
      <Button variant="default" onClick={() => s.setRequestStatus(r.id, 'onTheWay')}>
        <Truck /> {t('plant.leave')}
      </Button>
    ) : (
      <Button variant="default" onClick={() => s.setRequestStatus(r.id, 'delivered')}>
        {t(r.type === 'water' ? 'plant.deliver' : 'plant.pump')}
      </Button>
    )

  return (
    <Card className={cn('h-full', urgent && 'border-2 border-foreground', mine && 'ring-2 ring-brand')}>
      <CardHeader className="flex-row items-start gap-3 pb-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-lg font-bold tabular-nums" aria-label={`#${rank}`}>
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="flex flex-wrap items-center gap-2">
            <Icon aria-hidden="true" className="size-5 text-brand" />
            {t('plant.house', { n: r.house })}
            {mine && <span className="rounded-full border-2 border-brand px-2 text-xs font-bold">{t('plant.you')}</span>}
          </CardTitle>
          <CardDescription>
            {t(r.type === 'water' ? 'del.water' : 'del.sewage')} · {t('plant.people', { n: r.people })} · {t('plant.waiting', { h: waitH })}
          </CardDescription>
        </div>
        <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-sm font-bold tabular-nums text-primary-foreground">{t('plant.score', { n: score })}</span>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="flex items-center gap-2 font-semibold">
          {urgent && <StatusIcon status="unsafe" className="size-5" />}
          {t('plant.left', { n: fmtNum(r.daysLeft, locale, 1) })}
        </p>
        <ul className="flex flex-wrap gap-2" aria-label="Priority reasons">
          {reasons.map((k) => (
            <li key={k} className="rounded-full border px-3 py-1 text-sm font-medium">
              {t(`why.${k}` as Key)}
            </li>
          ))}
        </ul>
        <Timeline status={r.status} />
        {r.eta && r.status !== 'sent' && <p className="text-sm font-semibold">{t('plant.eta', { time: fmtTime(r.eta, locale) })}</p>}
        <div className="flex flex-wrap gap-2">{action}</div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
    </Card>
  )
}
