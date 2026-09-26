// Blizzard detection from the free Open-Meteo forecast (open data, no key).
// Environment Canada calls it a blizzard when winds of 40 km/h or more cause
// visibility of 400 m or less in snow or blowing snow for several hours. We flag
// risk hours with strong wind plus falling snow or low visibility, and treat a
// run of 4+ risk hours as a storm that can stop water trucks.

import { HOUR } from './sim'

export const INUKJUAK = { lat: 58.4533, lon: -78.1083 }

export type StormWindow = { start: number; end: number; maxGust: number }
export type Sky = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm'
export type Current = { tempC: number; windKmh: number; sky: Sky }
export type WeatherState = {
  fetchedAt: number | null
  storm: StormWindow | null
  current: Current | null
  source: 'live' | 'cached' | 'demo' | 'unavailable' | 'loading'
}

// WMO weather codes (used by Open-Meteo) grouped into a few plain words.
export function skyFromCode(code: number): Sky {
  if (code === 0) return 'clear'
  if (code <= 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'storm'
  return 'rain'
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

// Last saved weather, shown instantly on open (and offline) until the live check returns.
export function cachedWeather(): WeatherState {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as WeatherState | null
    if (c) return { ...c, current: c.current ?? null, source: 'cached' }
  } catch {}
  return { fetchedAt: null, storm: null, current: null, source: 'loading' }
}

export async function loadWeather(): Promise<WeatherState> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${INUKJUAK.lat}&longitude=${INUKJUAK.lon}` +
    `&current=temperature_2m,wind_speed_10m,weather_code&hourly=wind_speed_10m,wind_gusts_10m,snowfall,visibility&forecast_days=3&timeformat=unixtime&wind_speed_unit=kmh`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    const json = (await res.json()) as { hourly: Hourly; current?: { temperature_2m: number; wind_speed_10m: number; weather_code: number } }
    const now = Date.now()
    const c = json.current
    const current = c ? { tempC: Math.round(c.temperature_2m), windKmh: Math.round(c.wind_speed_10m), sky: skyFromCode(c.weather_code) } : null
    const state: WeatherState = { fetchedAt: now, storm: findStorm(json.hourly), current, source: 'live' }
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(state))
    } catch {}
    return state
  } catch {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as WeatherState | null
      if (cached) return { ...cached, source: 'cached' }
    } catch {}
    return { fetchedAt: null, storm: null, current: null, source: 'unavailable' }
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

// Daily forecast for the plant's 7-day delivery plan. Falls back to the last
// saved forecast, then to typical weather for the month, and says which it is.
export type DailyWx = { date: number; gustMax: number; windMax: number; snowCm: number; tempMin: number; rainMm: number }
export type DailyState = { days: DailyWx[]; source: 'live' | 'cached' | 'typical'; fetchedAt: number | null }

const DAILY_KEY = 'imaq:weather-daily'

export async function loadDaily(): Promise<DailyState> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${INUKJUAK.lat}&longitude=${INUKJUAK.lon}` +
    `&daily=wind_gusts_10m_max,wind_speed_10m_max,snowfall_sum,temperature_2m_min,rain_sum&forecast_days=14&timezone=America%2FToronto&timeformat=unixtime`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    const d = (await res.json()).daily as Record<string, number[]>
    const days = d.time.map((t, i) => ({
      date: t * 1000,
      gustMax: d.wind_gusts_10m_max[i] ?? 0,
      windMax: d.wind_speed_10m_max[i] ?? 0,
      snowCm: d.snowfall_sum[i] ?? 0,
      tempMin: d.temperature_2m_min[i] ?? 0,
      rainMm: d.rain_sum[i] ?? 0,
    }))
    const state: DailyState = { days, source: 'live', fetchedAt: Date.now() }
    try {
      localStorage.setItem(DAILY_KEY, JSON.stringify(state))
    } catch {}
    return state
  } catch {
    try {
      const cached = JSON.parse(localStorage.getItem(DAILY_KEY) || 'null') as DailyState | null
      if (cached) return { ...cached, source: 'cached' }
    } catch {}
    return { days: [], source: 'typical', fetchedAt: null }
  }
}

// Rough monthly normals for Inukjuak (min °C, typical gust km/h), used only when
// no forecast is available.
const TYPICAL = [
  [-29, 45], [-30, 45], [-26, 45], [-17, 45], [-6, 40], [1, 35], [5, 35], [6, 35], [3, 40], [-3, 45], [-12, 50], [-23, 50],
]
export function typicalDay(date: number): DailyWx {
  const [tempMin, gust] = TYPICAL[new Date(date).getMonth()]
  return { date, gustMax: gust, windMax: gust * 0.6, snowCm: 0, tempMin, rainMm: 0 }
}
