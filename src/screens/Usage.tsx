import { ArrowDownRight, ArrowRight, ArrowUpRight, Lightbulb, Table2, BarChart3 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BarChart } from '../components/BarChart'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Segmented } from '../components/ui/segmented'
import { fmtDay, fmtHour, fmtNum, fmtWeekday } from '../lib/format'
import { hourPattern, lowEvents, startOfDay, weekdayPattern } from '../lib/sim'
import { useStore } from '../lib/store'
import type { useWater } from '../lib/useWater'

type Water = ReturnType<typeof useWater>
type Period = '7' | '14' | '30'

export function Usage({ water }: { water: Water }) {
  const { t, locale, people, tankL, now } = useStore()
  const [period, setPeriod] = useState<Period>('14')
  const [asTable, setAsTable] = useState(false)
  const n = Number(period)

  const today = startOfDay(now)
  const complete = useMemo(() => water.days.filter((d) => d.day < today), [water.days, today])
  const current = complete.slice(-n)
  const previous = complete.slice(-2 * n, -n)
  const sum = (a: { litres: number }[]) => a.reduce((s, d) => s + d.litres, 0)
  const avg = sum(current) / Math.max(1, current.length)
  const prevAvg = sum(previous) / Math.max(1, previous.length)
  const change = previous.length ? Math.round(((avg - prevAvg) / prevAvg) * 100) : 0

  const weekday = useMemo(() => weekdayPattern(complete.slice(-28)), [complete])
  const weekAvg = weekday.reduce((a, b) => a + b, 0) / 7
  const busiest = weekday.indexOf(Math.max(...weekday))
  const hours = useMemo(() => hourPattern(water.readings, 14), [water.readings])
  const peaks = useMemo(() => {
    const morning = [...hours.keys()].slice(5, 12).sort((a, b) => hours[b] - hours[a])[0]
    const evening = [...hours.keys()].slice(15, 23).sort((a, b) => hours[b] - hours[a])[0]
    return [morning, evening]
  }, [hours])
  const overnight = hours.slice(1, 5).reduce((a, b) => a + b, 0) / 4
  const lows = useMemo(() => lowEvents(water.readings, tankL), [water.readings, tankL])

  const last7 = sum(complete.slice(-7))
  const prev7 = sum(complete.slice(-14, -7))
  const weekTrend = prev7 ? Math.round(((last7 - prev7) / prev7) * 100) : 0

  const insights = [
    Math.abs(weekTrend) < 5
      ? t('insight.trendFlat')
      : weekTrend > 0
        ? t('insight.trendUp', { pct: weekTrend })
        : t('insight.trendDown', { pct: -weekTrend }),
    t('insight.busiest', { day: fmtWeekday(busiest, locale), pct: Math.round((weekday[busiest] / weekAvg - 1) * 100) }),
    t('insight.peak', { h1: fmtHour(peaks[0]), h2: fmtHour(peaks[1]) }),
    overnight < avg * 0.01 ? t('insight.noLeak') : null,
    lows.length ? t('insight.lowEvents', { n: lows.length }) : null,
    t('insight.who', { l: fmtNum(avg / people, locale) }),
    // Store price seen in Inukjuak: $76.29 for 24 × 500 mL (12 L) ≈ $6.36 a litre.
    t('insight.bottled', { cost: fmtNum(people * 2 * (76.29 / 12), locale) }),
  ].filter(Boolean) as string[]

  const { usedToday, typicalByNow } = water.fc
  const todayDiff = typicalByNow > 0 ? Math.round(((usedToday - typicalByNow) / typicalByNow) * 100) : 0
  const todayCmp = Math.abs(todayDiff) < 5 ? t('today.same') : todayDiff > 0 ? t('today.more', { pct: todayDiff }) : t('today.less', { pct: -todayDiff })

  const ChangeIcon = Math.abs(change) < 5 ? ArrowRight : change > 0 ? ArrowUpRight : ArrowDownRight
  const labelEvery = n > 14 ? 5 : n > 7 ? 2 : 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('usage.title')}</h1>
        <div className="w-full sm:w-80">
          <Segmented
            name="period"
            label={t('usage.period')}
            value={period}
            onChange={setPeriod}
            options={(['7', '14', '30'] as Period[]).map((p) => ({ value: p, label: t('usage.days', { n: p }) }))}
          />
        </div>
      </div>

      <Card aria-labelledby="today-title" className="p-5">
        <h2 id="today-title" className="text-sm font-medium text-muted-foreground">
          {t('today.title')}
        </h2>
        <p className="mt-1 text-3xl font-bold tabular-nums">{t('today.used', { l: fmtNum(usedToday, locale) })}</p>
        <p className="mt-1 font-semibold">
          {todayCmp} · {t('today.typical', { l: fmtNum(typicalByNow, locale) })}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={t('usage.avgDay')} value={`${fmtNum(avg, locale)} L`} />
        <Stat label={t('usage.avgPerson')} value={`${fmtNum(avg / people, locale)} L`} />
        <Stat
          label={t('usage.change', { n })}
          value={`${change > 0 ? '+' : ''}${change} %`}
          icon={<ChangeIcon aria-hidden="true" className="size-6" />}
        />
        <Stat label={t('usage.ranLow')} value={String(lows.length)} sub={t('usage.ranLowSub')} />
      </div>

      <Card aria-labelledby="daily-title">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle id="daily-title">{t('usage.daily')}</CardTitle>
          <Button variant="ghost" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
            {asTable ? <BarChart3 /> : <Table2 />} {asTable ? t('usage.showChart') : t('usage.showTable')}
          </Button>
        </CardHeader>
        <CardContent>
          {asTable ? (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left">
                <caption className="sr-only">{t('usage.daily')}</caption>
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b">
                    <th scope="col" className="py-2 font-semibold">{t('usage.colDate')}</th>
                    <th scope="col" className="py-2 text-right font-semibold">{t('usage.colLitres')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...current].reverse().map((d) => (
                    <tr key={d.day} className="border-b last:border-0">
                      <td className="py-2">{fmtDay(d.day, locale)}</td>
                      <td className="py-2 text-right tabular-nums">{fmtNum(d.litres, locale)} L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <BarChart
              unit="L"
              avg={avg}
              avgLabel={t('usage.avgLine')}
              labelEvery={labelEvery}
              summary={`${t('usage.daily')}: ${t('usage.avgDay')} ${fmtNum(avg, locale)} L`}
              bars={current.map((d) => ({
                key: d.day,
                label: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d.day),
                value: d.litres,
                title: `${fmtDay(d.day, locale)}: ${fmtNum(d.litres, locale)} L`,
              }))}
            />
          )}
        </CardContent>
      </Card>


      <Card aria-labelledby="insights-title">
        <CardHeader className="flex-row items-center gap-3">
          <Lightbulb aria-hidden="true" className="size-6 shrink-0 text-brand" />
          <CardTitle id="insights-title">{t('usage.insights')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {insights.map((s) => (
              <li key={s} className="flex items-start gap-3">
                <span className="mt-2 size-2 shrink-0 rounded-full bg-foreground" aria-hidden="true" />
                {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-2 text-3xl font-bold tabular-nums">
        {icon}
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  )
}
