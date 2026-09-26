import { useEffect, useMemo, useState } from 'react'
import { plan, recommend, riskFromWeather, type Day, type Home } from './planner'
import { FLEET, PLANT, SERVICE_DAYS, SHIFT_MIN, sampleHomes } from './plantData'
import { isOpen, litresNow } from './requests'
import { DAY, startOfDay } from './sim'
import { useStore } from './store'
import type { useWater } from './useWater'
import { loadDaily, typicalDay, type DailyState } from './weather'

type Water = ReturnType<typeof useWater>
const TRUCKS_KEY = 'imaq:trucks'

function readTrucks(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(TRUCKS_KEY) || '{}')
  } catch {
    return {}
  }
}

/** Everything the plant screens need: 7 days of risk, homes, trucks, the plan. */
export function usePlan(water: Water) {
  const s = useStore()
  const [daily, setDaily] = useState<DailyState>({ days: [], source: 'typical', fetchedAt: null })
  const [inService, setInService] = useState<Record<string, boolean>>(readTrucks)

  useEffect(() => {
    loadDaily().then(setDaily)
  }, [s.online])

  const setTruck = (id: string, on: boolean) => {
    const next = { ...inService, [id]: on }
    setInService(next)
    try {
      localStorage.setItem(TRUCKS_KEY, JSON.stringify(next))
    } catch {}
  }

  const today = startOfDay(s.now)
  const storm = water.storm

  const days: Day[] = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = today + i * DAY
        const wx = daily.days.find((d) => startOfDay(d.date) === startOfDay(date)) ?? typicalDay(date)
        const service = SERVICE_DAYS.includes(new Date(date).getDay())
        let risk = riskFromWeather(wx, service)
        // A blizzard (live or demo) covering most of the working day stops the trucks.
        if (service && storm && storm.start < date + 17 * 3_600_000 && storm.end > date + 8 * 3_600_000) risk = 'high'
        return { date, risk }
      }),
    [today, daily, storm],
  )

  const trucks = useMemo(() => FLEET.map((t) => ({ ...t, inService: inService[t.id] ?? t.inService })), [inService])

  const openWater = useMemo(() => s.requests.filter((r) => r.type === 'water' && isOpen(r)), [s.requests])

  const homes: Home[] = useMemo(() => {
    const byHouse = new Map(sampleHomes().filter((h) => h.house !== s.house).map((h) => [h.house, h]))
    // The one live home: this household, straight from its tank readings.
    byHouse.set(s.house, { id: 'live', house: s.house, route: 2, people: s.people, capacity: s.tankL, level: water.fc.level, perDay: Math.max(1, water.fc.expectedDaily) })
    for (const r of openWater) {
      const h = byHouse.get(r.house)
      const left = litresNow(r, s.now)
      if (h) byHouse.set(r.house, { ...h, requested: true, level: r.house === s.house ? h.level : (left ?? h.level) })
      else if (r.capacity && left !== undefined)
        byHouse.set(r.house, { id: `r-${r.id}`, house: r.house, route: 1, people: r.people, capacity: r.capacity, level: left, perDay: r.perDay ?? r.people * 90, requested: true })
    }
    return [...byHouse.values()]
  }, [s.house, s.people, s.tankL, water.fc.level, water.fc.expectedDaily, openWater, s.now])

  const result = useMemo(() => plan(homes, trucks, PLANT, days), [homes, trucks, days])
  const advice = useMemo(() => recommend(result, trucks, PLANT, SHIFT_MIN), [result, trucks])

  return { days, homes, trucks, setTruck, plan: result, advice, weatherSource: daily.source }
}
