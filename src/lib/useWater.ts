import { useMemo } from 'react'
import { evaluate } from './quality'
import { dailyUse, forecast, generateReadings, startOfHour } from './sim'
import { useStore } from './store'
import { demoStorm, type WeatherState } from './weather'

/** Everything the screens derive from the tank readings, checks and forecast. */
export function useWater(weather: WeatherState) {
  const s = useStore()
  const hour = startOfHour(s.now)

  const readings = useMemo(() => generateReadings({ people: s.people, tankL: s.tankL }, hour), [s.people, s.tankL, hour])
  const days = useMemo(() => dailyUse(readings), [readings])
  const fc = useMemo(() => forecast(readings, s.now), [readings, s.now])

  const sorted = useMemo(() => [...s.checks].sort((a, b) => a.t - b.t), [s.checks])
  const lastCheck = sorted[sorted.length - 1]
  const quality = evaluate(lastCheck, { advisory: s.demoAdvisory, now: s.now, lastTankClean: s.lastTankClean })

  const storm = s.demoStorm ? demoStorm(hour) : weather.storm
  const stormSource = s.demoStorm ? 'demo' : weather.source

  return { readings, days, fc, checks: sorted, lastCheck, quality, storm, stormSource }
}
