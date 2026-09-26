import { ArrowRight, CloudSnow, Droplets, Sun, Truck, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { RequestCard } from '../components/RequestCard'
import { StatusIcon, STATUS_STYLE } from '../components/StatusIcon'
import { TankGauge } from '../components/TankGauge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { cn } from '../lib/cn'
import { fmtDateTime, fmtNum, fmtTime } from '../lib/format'
import type { Key } from '../lib/i18n'
import { conservationBudget, HOUR, WHO_BASIC_LPPD } from '../lib/sim'
import { canSpeak, speak, stopSpeaking } from '../lib/speak'
import { useStore } from '../lib/store'
import type { useWater } from '../lib/useWater'
import type { WeatherState } from '../lib/weather'

type Water = ReturnType<typeof useWater>
type Go = (tab: 'check' | 'deliveries') => void

export function Home({ water, weather, go }: { water: Water; weather: WeatherState; go: Go }) {
  const next = useNextStep(water)
  return (
    <div className="space-y-4">
      <NextStep water={water} next={next} go={go} />
      {water.storm && <StormCard water={water} weather={weather} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <QualityTile water={water} go={go} />
        <WaterTile water={water} />
        <SewageTile water={water} />
      </div>
      {(water.openWater || water.openSewage) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {water.openWater && <RequestCard type="water" open={water.openWater} daysLeft={water.fc.daysLeft} />}
          {water.openSewage && <RequestCard type="sewage" open={water.openSewage} daysLeft={water.fc.sewageDaysLeft} />}
        </div>
      )}
      {!water.storm && <StormCard water={water} weather={weather} />}
    </div>
  )
}

type NextKey =
  | 'next.boil'
  | 'next.dontDrink'
  | 'next.sewageFull'
  | 'next.request'
  | 'next.save'
  | 'next.test'
  | 'next.waiting'
  | 'next.booked'
  | 'next.onTheWay'
  | 'next.allGood'
type Next = { key: NextKey; tone: 'unsafe' | 'check' | 'safe'; action?: 'test' | 'water' | 'sewage' | 'deliveries'; eta?: number }

/** The single most important thing for the household to do right now. */
function useNextStep(water: Water): Next {
  const s = useStore()
  const { fc, quality, storm, openWater, openSewage } = water
  if (s.demoAdvisory) return { key: 'next.boil', tone: 'unsafe', action: 'test' }
  if (quality.status === 'unsafe') return { key: 'next.dontDrink', tone: 'unsafe', action: 'test' }
  if (fc.sewageFull && !openSewage) return { key: 'next.sewageFull', tone: 'unsafe', action: 'sewage' }
  if (fc.daysLeft <= s.alertDays && !openWater) return { key: 'next.request', tone: 'check', action: 'water' }
  if (storm && conservationBudget(fc.level, s.now, storm.end + 12 * HOUR, s.people).perDay < fc.expectedDaily)
    return { key: 'next.save', tone: 'check' }
  if (quality.status === 'check') return { key: 'next.test', tone: 'check', action: 'test' }
  const open = openWater ?? openSewage
  if (open) {
    if (open.status === 'onTheWay') return { key: 'next.onTheWay', tone: 'safe', action: 'deliveries' }
    if (open.status === 'scheduled') return { key: 'next.booked', tone: 'safe', action: 'deliveries', eta: open.eta }
    return { key: 'next.waiting', tone: 'safe', action: 'deliveries' }
  }
  return { key: 'next.allGood', tone: 'safe', action: 'test' }
}

function NextStep({ water, next, go }: { water: Water; next: Next; go: Go }) {
  const s = useStore()
  const { t, lang, locale } = s
  const [speaking, setSpeaking] = useState(false)
  const S = STATUS_STYLE[next.tone]
  const headline = t(next.key, { time: next.eta ? fmtDateTime(next.eta, locale) : '' })

  // Everything on this screen, read aloud in one go for people who prefer listening.
  const summary = [
    t(`status.${water.quality.status}`),
    headline,
    water.fc.level > 0 ? t('summary.left', { n: fmtNum(water.fc.daysLeft, locale, 1) }) : t('alert.empty'),
    water.fc.sewageFull ? t('alert.sewageFull') : t('summary.sewage', { n: fmtNum(water.fc.sewageDaysLeft, locale, 1) }),
    water.openWater ? t('summary.booked', { status: t(`st.${water.openWater.status}` as Key) }) : '',
  ]
    .filter(Boolean)
    .join('. ')

  const toggleSpeak = () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    speak(summary, lang, () => setSpeaking(false))
  }

  const action = next.action
  const actionButton =
    action === 'test' ? (
      <Button variant={next.tone === 'safe' ? 'outline' : 'brand'} size="lg" onClick={() => go('check')}>
        <Droplets /> {t('testWater')}
      </Button>
    ) : action === 'water' || action === 'sewage' ? (
      <Button
        variant="brand"
        size="lg"
        onClick={() => s.requestDelivery({ type: action, auto: false, reason: 'manual', daysLeft: action === 'water' ? water.fc.daysLeft : water.fc.sewageDaysLeft })}
      >
        {action === 'water' ? <Droplets /> : <Truck />} {t(action === 'water' ? 'del.requestWater' : 'del.requestSewage')}
      </Button>
    ) : action === 'deliveries' ? (
      <Button variant="outline" size="lg" onClick={() => go('deliveries')}>
        {t('nav.deliveries')} <ArrowRight />
      </Button>
    ) : null

  return (
    <Card className={cn('border-2', S.ring)} aria-labelledby="next-title">
      <div className={cn('flex items-center gap-4 rounded-t-xl p-5', S.bg)} aria-live="polite">
        <StatusIcon status={next.tone} className="size-14 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide">{t('home.next')}</p>
          <h2 id="next-title" className="text-2xl font-bold leading-tight sm:text-3xl">
            {headline}
          </h2>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 p-5">
        {actionButton}
        {canSpeak(lang) ? (
          <Button variant="outline" size="lg" onClick={toggleSpeak} aria-pressed={speaking}>
            {speaking ? <VolumeX /> : <Volume2 />} {speaking ? t('stop') : t('listen')}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">{t('listen.unavailable')}</p>
        )}
      </div>
    </Card>
  )
}

function Tile({ id, title, children, footer }: { id: string; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Card aria-labelledby={id} className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle id={id} className="text-base text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {children}
        {footer && <div className="mt-auto">{footer}</div>}
      </CardContent>
    </Card>
  )
}

function QualityTile({ water, go }: { water: Water; go: Go }) {
  const { t, locale, now } = useStore()
  const { status, reasons } = water.quality
  const ageDays = water.lastCheck ? Math.floor((now - water.lastCheck.t) / 86_400_000) : 0
  const reason = t(`reason.${reasons[0]}` as const, { v: water.lastCheck?.chlorine != null ? fmtNum(water.lastCheck.chlorine, locale, 1) : '', n: ageDays })
  return (
    <Tile
      id="tile-quality"
      title={t('glance.water')}
      footer={
        <Button variant="ghost" className="-ml-3" onClick={() => go('check')}>
          {t('testWater')} <ArrowRight />
        </Button>
      }
    >
      <div className="flex items-center gap-3">
        <StatusIcon status={status} className="size-12 shrink-0" />
        <p className="text-2xl font-bold leading-tight">{t(`status.${status}`)}</p>
      </div>
      <p className="text-sm">{reason}</p>
      {water.lastCheck && <p className="text-xs text-muted-foreground">{t('lastChecked', { date: fmtDateTime(water.lastCheck.t, locale) })}</p>}
    </Tile>
  )
}

function WaterTile({ water }: { water: Water }) {
  const { t, locale, tankL } = useStore()
  const { fc } = water
  const pct = fc.level / tankL
  const litres = t('tank.litres', { l: fmtNum(fc.level, locale), c: fmtNum(tankL, locale), p: Math.round(pct * 100) })
  const days = fmtNum(fc.daysLeft, locale, 1)
  return (
    <Tile id="tile-water" title={t('glance.left')}>
      <div className="flex items-center gap-4">
        <TankGauge pct={pct} label={litres} size="sm" />
        <div>
          {fc.level <= 0 ? (
            <p className="text-3xl font-bold">{t('glance.empty')}</p>
          ) : (
            <p className="text-4xl font-bold tabular-nums leading-none">{t(fc.daysLeft >= 0.95 && fc.daysLeft < 1.05 ? 'glance.day' : 'glance.days', { n: days })}</p>
          )}
          <p className="mt-2 text-sm tabular-nums">{litres}</p>
        </div>
      </div>
      {fc.emptyAt && <p className="text-sm text-muted-foreground">{t('tank.emptyAt', { date: fmtDateTime(fc.emptyAt, locale) })}</p>}
    </Tile>
  )
}

function SewageTile({ water }: { water: Water }) {
  const { t, locale, sewageL } = useStore()
  const { fc } = water
  const pct = fc.sewage / sewageL
  return (
    <Tile id="tile-sewage" title={t('glance.sewage')}>
      <div className="flex items-center gap-4">
        <TankGauge pct={pct} label={t('glance.pct', { p: Math.round(pct * 100) })} size="sm" tone="muted" />
        <div>
          <p className="text-3xl font-bold leading-tight">
            {fc.sewageFull ? t('glance.full') : t('glance.fullIn', { n: fmtNum(fc.sewageDaysLeft, locale, 1) })}
          </p>
          <p className="mt-2 text-sm tabular-nums">{t('glance.pct', { p: Math.round(pct * 100) })}</p>
        </div>
      </div>
      {fc.sewageFull && (
        <p role="alert" className="flex items-start gap-2 text-sm font-semibold text-destructive">
          <StatusIcon status="unsafe" className="size-5 shrink-0" /> {t('alert.sewageFull')}
        </p>
      )}
    </Tile>
  )
}

function StormCard({ water, weather }: { water: Water; weather: WeatherState }) {
  const { t, locale, people, now } = useStore()
  const { storm, stormSource, fc } = water

  const sourceLine =
    stormSource === 'demo'
      ? t('weather.demo')
      : weather.source === 'live' && weather.fetchedAt
        ? t('weather.live', { time: fmtTime(weather.fetchedAt, locale) })
        : weather.source === 'cached' && weather.fetchedAt
          ? t('weather.cached', { time: fmtDateTime(weather.fetchedAt, locale) })
          : t('weather.unavailable')

  if (!storm) {
    return (
      <Card aria-labelledby="storm-title">
        <CardContent className="flex items-center gap-4 pt-5">
          <Sun aria-hidden="true" className="size-8 shrink-0 text-muted-foreground" />
          <div>
            <h2 id="storm-title" className="font-bold">
              {t('weather.none')}
            </h2>
            <p className="text-sm text-muted-foreground">{sourceLine}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Trucks restart about 12 hours after the storm clears (snow clearing).
  const until = storm.end + 12 * HOUR
  const budget = conservationBudget(fc.level, now, until, people)
  const cut = Math.max(0, Math.round((1 - budget.perDay / fc.expectedDaily) * 100))
  const enough = budget.perDay >= fc.expectedDaily
  const tooLow = budget.perPerson < WHO_BASIC_LPPD
  const tips = ['tip.jugs', 'tip.laundry', 'tip.shower', 'tip.dishes'] as const

  return (
    <Card aria-labelledby="storm-title" className="border-2 border-foreground">
      <CardHeader className="flex-row items-start gap-4">
        <CloudSnow aria-hidden="true" className="size-10 shrink-0" />
        <div>
          <CardTitle id="storm-title" className="text-2xl">
            {t('storm.title')}
          </CardTitle>
          <p className="font-semibold tabular-nums">{t('storm.window', { start: fmtDateTime(storm.start, locale), end: fmtDateTime(storm.end, locale) })}</p>
          <CardDescription>{sourceLine}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div>
          <p>{t('storm.body', { until: fmtDateTime(until, locale) })}</p>
          {enough ? (
            <p className="mt-3 flex items-center gap-2 text-lg font-semibold">
              <StatusIcon status="safe" className="size-6" /> {t('storm.enough')}
            </p>
          ) : (
            <div className="mt-3 rounded-lg bg-muted p-4">
              <p className="text-2xl font-bold tabular-nums">{t('storm.budget', { l: fmtNum(budget.perDay, locale) })}</p>
              <p className="mt-1 tabular-nums">{t('storm.perPerson', { l: fmtNum(budget.perPerson, locale), pct: cut })}</p>
              {tooLow && (
                <p role="alert" className="mt-3 flex items-start gap-2 font-semibold text-destructive">
                  <StatusIcon status="unsafe" className="mt-0.5 size-5 shrink-0" /> {t('storm.tooLow')}
                </p>
              )}
            </div>
          )}
        </div>
        <div>
          <h3 className="font-bold">{t('storm.tips')}</h3>
          <ul className="mt-2 space-y-2">
            {tips.map((k) => (
              <li key={k} className="flex items-start gap-2">
                <Droplets aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand" />
                {t(k)}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
