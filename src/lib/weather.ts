// Blizzard detection from the free Open-Meteo forecast (open data, no key).
// Environment Canada calls it a blizzard when winds of 40 km/h or more cause
// visibility of 400 m or less in snow or blowing snow for several hours. We flag
// risk hours with strong wind plus falling snow or low visibility, and treat a
// run of 4+ risk hours as a storm that can stop water trucks.

import { HOUR } from './sim'

export const INUKJUAK = { lat: 58.4533, lon: -78.1083 }

export type StormWindow = { start: number; end: number; maxGust: number }
export type WeatherState = {
  fetchedAt: number | null
  storm: StormWindow | null
  source: 'live' | 'cached' | 'demo' | 'unavailable'
}

const CACHE_KEY = 'imaq:weather'

type Hourly = {
  time: number[]
  wind_speed_10m: number[]
  wind_gusts_10m: number[]
  snowfall: number[]
  visibility?: number[]
}

export function findStorm(h: Hourly): StormWindow | null {
  let run: StormWindow | null = null
  let hours = 0
  for (let i = 0; i < h.time.length; i++) {
    const windy = h.wind_speed_10m[i] >= 40 || h.wind_gusts_10m[i] >= 60
    const snowy = h.snowfall[i] > 0 || (h.visibility?.[i] ?? 10_000) < 1000
    const t = h.time[i] * 1000
    if (windy && snowy) {
      if (!run) {
        run = { start: t, end: t + HOUR, maxGust: h.wind_gusts_10m[i] }
        hours = 0
      }
      run.end = t + HOUR
      run.maxGust = Math.max(run.maxGust, h.wind_gusts_10m[i])
      hours++
    } else if (run) {
      if (hours >= 4) return run
      run = null
    }
  }
  return run && hours >= 4 ? run : null
}

export async function loadWeather(): Promise<WeatherState> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${INUKJUAK.lat}&longitude=${INUKJUAK.lon}` +
    `&hourly=wind_speed_10m,wind_gusts_10m,snowfall,visibility&forecast_days=3&timeformat=unixtime&wind_speed_unit=kmh`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    const json = (await res.json()) as { hourly: Hourly }
    const now = Date.now()
    const state: WeatherState = { fetchedAt: now, storm: findStorm(json.hourly), source: 'live' }
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(state))
    } catch {}
    return state
  } catch {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as WeatherState | null
      if (cached) return { ...cached, source: 'cached' }
    } catch {}
    return { fetchedAt: null, storm: null, source: 'unavailable' }
  }
}

/** Demo storm lasting 54 hours, like a long Hudson Bay blizzard. */
export function demoStorm(start: number): StormWindow {
  return { start, end: start + 54 * HOUR, maxGust: 85 }
}

/** When the demo storm is switched on, it starts 6 hours from now. */
export function demoStormStart(now: number) {
  return Math.ceil((now + 6 * HOUR) / HOUR) * HOUR
}
