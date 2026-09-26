import { CloudSnow, Droplets, Sun, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { StatusIcon, STATUS_STYLE } from '../components/StatusIcon'
import { TankGauge } from '../components/TankGauge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { cn } from '../lib/cn'
import { fmtDateTime, fmtNum, fmtTime } from '../lib/format'
import type { Reason } from '../lib/quality'
import { HOUR, conservationBudget, WHO_BASIC_LPPD } from '../lib/sim'
import { canSpeak, speak, stopSpeaking } from '../lib/speak'
import { useStore } from '../lib/store'
import type { useWater } from '../lib/useWater'
import type { WeatherState } from '../lib/weather'

type Water = ReturnType<typeof useWater>

export function Home({ water, weather, onTest }: { water: Water; weather: WeatherState; onTest: () => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <QualityCard water={water} onTest={onTest} />
      {/* A coming storm is the most time-sensitive thing on the screen, so it moves up. */}
      {water.storm && <StormCard water={water} weather={weather} />}
      <TankCard water={water} />
      <TodayCard water={water} />
      {!water.storm && <StormCard water={water} weather={weather} />}
    </div>
  )
}

function useReasonText(reasons: Reason[], v?: number | null, n?: number) {
  const { t, locale } = useStore()
  return reasons.map((r) =>
    t(`reason.${r}` as const, { v: v != null ? fmtNum(v, locale, 1) : '', n: n ?? 0 }),
  )
}

function QualityCard({ water, onTest }: { water: Water; onTest: () => void }) {
  const { t, locale, lang, now } = useStore()
  const { status, reasons } = water.quality
  const [speaking, setSpeaking] = useState(false)
  const ageDays = water.lastCheck ? Math.floor((now - water.lastCheck.t) / 86_400_000) : 0
  const lines = useReasonText(reasons, water.lastCheck?.chlorine, ageDays)
  const S = STATUS_STYLE[status]
  const headline = t(`status.${status}`)

  const toggleSpeak = () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    speak([headline, ...lines].join('. '), lang, () => setSpeaking(false))
  }

  return (
    <Card className={cn('border-2 md:col-span-2', S.ring)} aria-labelledby="quality-title">
      <div className={cn('flex flex-col gap-4 rounded-t-xl p-5 sm:flex-row sm:items-center', S.bg)}>
        <StatusIcon status={status} className="size-16 shrink-0" />
        <div className="min-w-0 flex-1" aria-live="polite">
          <h2 id="quality-title" className="text-3xl font-bold leading-tight">
            {headline}
          </h2>
          <ul className="mt-1 space-y-1">
            {lines.map((l) => (
              <li key={l} className="text-base">
                {l}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 p-5">
        <Button variant="brand" size="lg" onClick={onTest}>
          <Droplets /> {t('testWater')}
        </Button>
        {canSpeak(lang) ? (
          <Button variant="outline" size="lg" onClick={toggleSpeak} aria-pressed={speaking}>
            {speaking ? <VolumeX /> : <Volume2 />} {speaking ? t('stop') : t('listen')}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">{t('listen.unavailable')}</p>
        )}
        {water.lastCheck && <p className="text-sm text-muted-foreground sm:ml-auto">{t('lastChecked', { date: fmtDateTime(water.lastCheck.t, locale) })}</p>}
      </div>
    </Card>
  )
}

function TankCard({ water }: { water: Water }) {
  const { t, locale, tankL, people } = useStore()
  const { fc } = water
  const pct = fc.level / tankL
  const days = fc.daysLeft
  const litres = t('tank.litres', { l: fmtNum(fc.level, locale), c: fmtNum(tankL, locale), p: Math.round(pct * 100) })
  return (
    <Card aria-labelledby="tank-title">
      <CardHeader>
        <CardTitle id="tank-title">{t('tank.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-5">
        <TankGauge pct={pct} label={litres} />
        <div className="min-w-0">
          {fc.level <= 0 ? (
            <p className="text-2xl font-bold">{t('tank.empty')}</p>
          ) : (
            <p>
              <span className="block text-6xl font-bold tabular-nums leading-none">{fmtNum(days, locale, 1)}</span>
              <span className="mt-1 block text-lg font-semibold">{days < 1.05 && days >= 0.95 ? t('tank.dayUnit') : t('tank.daysUnit')}</span>
            </p>
          )}
          <p className="mt-3 tabular-nums">{litres}</p>
          {fc.emptyAt && <p className="mt-1 text-sm text-muted-foreground">{t('tank.emptyAt', { date: fmtDateTime(fc.emptyAt, locale) })}</p>}
          <p className="mt-1 text-sm text-muted-foreground">{t('perPerson', { l: fmtNum(fc.level / people, locale) })}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function TodayCard({ water }: { water: Water }) {
  const { t, locale, people } = useStore()
  const { usedToday, typicalByNow } = water.fc
  const diff = typicalByNow > 0 ? Math.round(((usedToday - typicalByNow) / typicalByNow) * 100) : 0
  const cmp = Math.abs(diff) < 5 ? t('today.same') : diff > 0 ? t('today.more', { pct: diff }) : t('today.less', { pct: -diff })
  const fill = Math.min(100, (usedToday / Math.max(usedToday, typicalByNow, 1)) * 100)
  const typicalMark = Math.min(100, (typicalByNow / Math.max(usedToday, typicalByNow, 1)) * 100)
  return (
    <Card aria-labelledby="today-title">
      <CardHeader>
        <CardTitle id="today-title">{t('today.title')}</CardTitle>
        <CardDescription>{t('today.typical', { l: fmtNum(typicalByNow, locale) })}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums">{t('today.used', { l: fmtNum(usedToday, locale) })}</p>
        <p className="mt-1 font-semibold">{cmp}</p>
        <div className="relative mt-4 h-4 rounded-full bg-muted" aria-hidden="true">
          <div className="h-4 rounded-full bg-brand" style={{ width: `${fill}%` }} />
          <div className="absolute -top-1 h-6 w-1 rounded bg-foreground" style={{ left: `calc(${typicalMark}% - 2px)` }} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t('perPerson', { l: fmtNum(usedToday / people, locale) })}</p>
      </CardContent>
    </Card>
  )
}

function StormCard({ water, weather }: { water: Water; weather: WeatherState }) {
  const { t, locale, people } = useStore()
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
      <Card aria-labelledby="storm-title" className="md:col-span-2">
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
  const budget = conservationBudget(fc.level, Date.now(), until, people)
  const cut = Math.max(0, Math.round((1 - budget.perDay / fc.expectedDaily) * 100))
  const enough = budget.perDay >= fc.expectedDaily
  const tooLow = budget.perPerson < WHO_BASIC_LPPD
  const tips = ['tip.jugs', 'tip.laundry', 'tip.shower', 'tip.dishes'] as const

  return (
    <Card aria-labelledby="storm-title" className="border-2 border-foreground md:col-span-2">
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
