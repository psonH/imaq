import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Droplets, Gauge, Sun, Truck, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { RequestCard } from '../components/RequestCard'
import { StatusIcon, STATUS_STYLE } from '../components/StatusIcon'
import { TankGauge } from '../components/TankGauge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { cn } from '../lib/cn'
import { fmtDateTime, fmtNum } from '../lib/format'
import type { Key } from '../lib/i18n'
import { CHLORINE, type WaterStatus } from '../lib/quality'
import { conservationBudget, HOUR } from '../lib/sim'
import { canSpeak, speak, stopSpeaking } from '../lib/speak'
import { useStore } from '../lib/store'
import type { useWater } from '../lib/useWater'
import type { WeatherState } from '../lib/weather'

type Water = ReturnType<typeof useWater>
type Go = (tab: 'deliveries' | 'usage') => void
type Tone = WaterStatus | 'neutral'

const SKY_ICON = { clear: Sun, cloudy: Cloud, fog: CloudFog, rain: CloudRain, snow: CloudSnow, storm: CloudLightning }

export function Home({ water, weather, go }: { water: Water; weather: WeatherState; go: Go }) {
  const s = useStore()
  return (
    <div className="space-y-4">
      <Summary water={water} weather={weather} go={go} />
      {!water.openWater && (
        // On phones the sidebar isn't there, so the request button lives here.
        <Button
          variant="brand"
          size="lg"
          className="w-full lg:hidden"
          onClick={() => s.requestDelivery({ type: 'water', auto: false, reason: 'manual', daysLeft: water.fc.daysLeft })}
        >
          <Truck /> {s.t('side.request')}
        </Button>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <WaterLevelCard water={water} />
        <ContaminationCard water={water} />
      </div>
      {(water.openWater || water.openSewage) && (
        <div className="grid gap-4 md:grid-cols-2">
          {water.openWater && <RequestCard type="water" open={water.openWater} daysLeft={water.fc.daysLeft} />}
          {water.openSewage && <RequestCard type="sewage" open={water.openSewage} daysLeft={water.fc.sewageDaysLeft} />}
        </div>
      )}
    </div>
  )
}

const TONE: Record<Tone, string> = {
  safe: 'border-success bg-success/10',
  check: 'border-warning bg-warning/10',
  unsafe: 'border-destructive bg-destructive/10',
  neutral: 'border-border bg-muted',
}

/** One status pill: colour + icon shape + words, and a tap takes you to the detail. */
function Pill({ tone, icon, label, value, onClick }: { tone: Tone; icon?: React.ReactNode; label: string; value: string; onClick?: () => void }) {
  const body = (
    <>
      <span className="shrink-0 [&_svg]:size-7">{icon ?? (tone === 'neutral' ? null : <StatusIcon status={tone} className="size-7" />)}</span>
      <span className="min-w-0 text-left leading-tight">
        <span className="block text-sm text-muted-foreground">{label}</span>
        <span className="block text-lg font-bold">{value}</span>
      </span>
    </>
  )
  const cls = cn('flex h-full min-h-16 w-full items-center gap-3 rounded-full border-2 px-5 py-2', TONE[tone])
  return (
    <li>
      {onClick ? (
        <button type="button" onClick={onClick} className={cn(cls, 'hover:shadow-sm')}>
          {body}
        </button>
      ) : (
        <span className={cls}>{body}</span>
      )}
    </li>
  )
}

function Summary({ water, weather, go }: { water: Water; weather: WeatherState; go: Go }) {
  const s = useStore()
  const { t, locale, lang, now, tankL, people } = s
  const { fc, quality, storm, openWater } = water
  const [speaking, setSpeaking] = useState(false)

  const pct = Math.round((fc.level / tankL) * 100)
  const levelTone: Tone = fc.daysLeft < 0.5 ? 'unsafe' : fc.daysLeft <= Math.max(2, s.alertDays) ? 'check' : 'safe'
  const levelValue = fc.level <= 0 ? t('glance.empty') : t('pill.levelValue', { p: pct, n: fmtNum(fc.daysLeft, locale, 1) })

  const dispatchTone: Tone = openWater
    ? openWater.status === 'scheduled' || openWater.status === 'onTheWay'
      ? 'safe'
      : 'check'
    : fc.daysLeft <= s.alertDays
      ? 'unsafe'
      : 'neutral'
  const dispatchValue = !openWater
    ? t('pill.notRequested')
    : openWater.status === 'scheduled' && openWater.eta
      ? t('pill.bookedAt', { time: fmtDateTime(openWater.eta, locale) })
      : t(`st.${openWater.status}` as Key)

  const stormNow = storm && storm.start <= now
  const weatherTone: Tone = storm ? (stormNow ? 'unsafe' : 'check') : weather.source === 'unavailable' && !s.demoStorm ? 'neutral' : 'safe'
  const weatherValue = storm
    ? stormNow
      ? t('pill.stormNow')
      : t('pill.stormAt', { time: fmtDateTime(storm.start, locale) })
    : weather.current
      ? t('weather.status', { sky: t(`sky.${weather.current.sky}` as Key), temp: weather.current.tempC })
      : weather.source === 'unavailable'
        ? t('weather.unavailable')
        : t('weather.none')

  // Plain-language storm status: how much water a day lasts until trucks run again.
  let stormLine = ''
  if (storm) {
    const budget = conservationBudget(fc.level, now, storm.end + 12 * HOUR, people)
    const vars = { start: fmtDateTime(storm.start, locale), end: fmtDateTime(storm.end, locale), l: fmtNum(budget.perDay, locale) }
    stormLine = budget.perDay < fc.expectedDaily ? t('weather.stormSave', vars) : t('weather.stormOk', vars)
  }

  const summary = [
    `${t('pill.quality')}: ${t(`status.${quality.status}`)}`,
    `${t('pill.level')}: ${levelValue}`,
    `${t('pill.dispatch')}: ${dispatchValue}`,
    `${t('pill.weather')}: ${weatherValue}`,
    stormLine,
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

  return (
    <section aria-labelledby="summary-title" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h1 id="summary-title" className="text-2xl font-bold">
          {t('home.summary')}
        </h1>
        {canSpeak(lang) && (
          <Button variant="outline" onClick={toggleSpeak} aria-pressed={speaking}>
            {speaking ? <VolumeX /> : <Volume2 />} {speaking ? t('stop') : t('listen')}
          </Button>
        )}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite">
        <Pill tone={quality.status} label={t('pill.quality')} value={t(`status.${quality.status}`)} />
        <Pill tone={levelTone} label={t('pill.level')} value={levelValue} onClick={() => go('usage')} />
        <Pill
          tone={dispatchTone}
          icon={dispatchTone === 'neutral' ? <Truck aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" /> : undefined}
          label={t('pill.dispatch')}
          value={dispatchValue}
          onClick={() => go('deliveries')}
        />
        <Pill
          tone={weatherTone}
          icon={
            storm ? (
              <CloudSnow aria-hidden="true" className={cn('size-5 shrink-0', STATUS_STYLE[stormNow ? 'unsafe' : 'check'].fg)} />
            ) : (
              (() => {
                const Icon = weather.current ? SKY_ICON[weather.current.sky] : Sun
                return <Icon aria-hidden="true" className="size-5 shrink-0 text-success" />
              })()
            )
          }
          label={t('pill.weather')}
          value={weatherValue}
        />
      </ul>
      {stormLine && <p className="flex items-start gap-2 font-semibold">{stormLine}</p>}
    </section>
  )
}

function WaterLevelCard({ water }: { water: Water }) {
  const { t, locale, tankL, sewageL } = useStore()
  const { fc } = water
  const pct = fc.level / tankL
  const litres = t('tank.litres', { l: fmtNum(fc.level, locale), c: fmtNum(tankL, locale), p: Math.round(pct * 100) })
  return (
    <Card aria-labelledby="level-title">
      <CardHeader className="flex-row items-center gap-3">
        <Gauge aria-hidden="true" className="size-6 shrink-0 text-brand" />
        <CardTitle id="level-title">{t('level.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-5">
        <TankGauge pct={pct} label={litres} />
        <div className="min-w-0 space-y-2">
          <p className="text-6xl font-bold tabular-nums leading-none">{Math.round(pct * 100)}%</p>
          <p className="tabular-nums">{t('tank.litres', { l: fmtNum(fc.level, locale), c: fmtNum(tankL, locale), p: Math.round(pct * 100) }).replace(/ \(.*\)$/, '')}</p>
          <p className="text-lg font-semibold">{fc.level <= 0 ? t('tank.empty') : t('level.left', { n: fmtNum(fc.daysLeft, locale, 1) })}</p>
          {fc.emptyAt && <p className="text-sm text-muted-foreground">{t('tank.emptyAt', { date: fmtDateTime(fc.emptyAt, locale) })}</p>}
          <p className="border-t pt-2 text-sm">
            {fc.sewageFull
              ? t('alert.sewageFull')
              : t('level.sewage', { p: Math.round((fc.sewage / sewageL) * 100), n: fmtNum(fc.sewageDaysLeft, locale, 1) })}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ContaminationCard({ water }: { water: Water }) {
  const { t, locale, now } = useStore()
  const { status, reasons } = water.quality
  const last = water.lastCheck
  const ageDays = last ? Math.floor((now - last.t) / 86_400_000) : 0
  const reason = t(`reason.${reasons[0]}` as const, { v: last?.chlorine != null ? fmtNum(last.chlorine, locale, 1) : '', n: ageDays })
  const S = STATUS_STYLE[status]

  // Chlorine scale 0–5 mg/L with the safe band marked.
  const MAX = 5
  const pos = (v: number) => `${(Math.min(v, MAX) / MAX) * 100}%`
  const value = last?.chlorine

  return (
    <Card aria-labelledby="cont-title">
      <CardHeader className="flex-row items-center gap-3">
        <Droplets aria-hidden="true" className="size-6 shrink-0 text-brand" />
        <CardTitle id="cont-title">{t('cont.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn('flex items-center gap-3 rounded-lg border-2 p-3', S.ring, S.bg)}>
          <StatusIcon status={status} className="size-10 shrink-0" />
          <div>
            <p className="text-2xl font-bold leading-tight">{t(`cont.${status}` as Key)}</p>
            <p className="font-semibold">{t(`status.${status}`)}</p>
          </div>
        </div>

        <div>
          <p className="flex items-baseline justify-between gap-2">
            <span className="font-semibold">{t('cont.chlorine')}</span>
            <span className="text-2xl font-bold tabular-nums">{value != null ? `${fmtNum(value, locale, 1)} ${t('mgL')}` : t('cont.noReading')}</span>
          </p>
          <div className="relative mt-3 h-3 rounded-full bg-muted" aria-hidden="true">
            <div className="absolute inset-y-0 rounded-full bg-success/40" style={{ left: pos(CHLORINE.min), right: `calc(100% - ${pos(CHLORINE.max)})` }} />
            {value != null && (
              <div className="absolute -top-1.5 h-6 w-1.5 -translate-x-1/2 rounded-full bg-foreground ring-2 ring-card" style={{ left: pos(value) }} />
            )}
          </div>
          <div className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground" aria-hidden="true">
            <span>0</span>
            <span>{MAX}+</span>
          </div>
          <p className="text-sm text-muted-foreground">{t('cont.range', { min: fmtNum(CHLORINE.min, locale, 1), max: fmtNum(CHLORINE.max, locale, 0) })}</p>
        </div>

        <p className="text-sm">{reason}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {last && <p className="text-xs text-muted-foreground">{t('lastChecked', { date: fmtDateTime(last.t, locale) })}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
