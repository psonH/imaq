import { useMemo } from 'react'
import { evaluate } from './quality'
import { isOpen } from './requests'
import { dailyUse, forecast, generateReadings, startOfHour } from './sim'
import { useStore } from './store'
import { demoStorm, type WeatherState } from './weather'

/** Everything the household screens derive from tanks, tests, requests and forecast. */
export function useWater(weather: WeatherState) {
  const s = useStore()
  const hour = startOfHour(s.now)

  const readings = useMemo(
    () => generateReadings({ people: s.people, tankL: s.tankL, sewageL: s.sewageL }, hour, { anchor: s.anchor, deliveries: s.deliveries, pumpOuts: s.pumpOuts }),
    [s.people, s.tankL, s.sewageL, hour, s.anchor, s.deliveries, s.pumpOuts],
  )
  const days = useMemo(() => dailyUse(readings), [readings])
  const fc = useMemo(() => forecast(readings, s.now, s.sewageL), [readings, s.now, s.sewageL])

  const sorted = useMemo(() => [...s.checks].sort((a, b) => a.t - b.t), [s.checks])
  const lastCheck = sorted[sorted.length - 1]
  const quality = evaluate(lastCheck, { advisory: s.demoAdvisory, now: s.now, lastTankClean: s.lastTankClean })

  const rawStorm = s.demoStorm ? demoStorm(s.demoStorm) : weather.storm
  // A storm that has already passed no longer matters.
  const storm = rawStorm && rawStorm.end > s.now ? rawStorm : null
  const stormSource = s.demoStorm ? ('demo' as const) : weather.source

  const mine = useMemo(() => s.requests.filter((r) => r.house === s.house).sort((a, b) => b.createdAt - a.createdAt), [s.requests, s.house])
  const openWater = mine.find((r) => r.type === 'water' && isOpen(r))
  const openSewage = mine.find((r) => r.type === 'sewage' && isOpen(r))

  return { readings, days, fc, checks: sorted, lastCheck, quality, storm, stormSource, mine, openWater, openSewage }
}
