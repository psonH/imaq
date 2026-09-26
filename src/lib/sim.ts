// Simulated household tank sensor + the analysis the app runs on it.
// In a real home this data comes from a level sensor on the water tank
// (e.g. a waterproof ultrasonic sensor on the tank lid) sampled every hour.

export const HOUR = 3_600_000
export const DAY = 24 * HOUR

export type Reading = { t: number; level: number; sewage: number } // litres in each tank, hourly
export type Household = { people: number; tankL: number; sewageL: number }

// Share of a day's water used in each hour (sums to 1): quiet overnight,
// morning and evening peaks.
export const HOUR_PROFILE = (() => {
  const w = [0.3, 0.2, 0.2, 0.2, 0.3, 0.8, 2.2, 3.4, 3.0, 2.0, 1.6, 1.8, 2.4, 1.8, 1.4, 1.5, 2.0, 3.0, 3.4, 3.2, 2.6, 2.0, 1.2, 0.6]
  const sum = w.reduce((a, b) => a + b, 0)
  return w.map((x) => x / sum)
})()

// Sunday = 0. Saturday is laundry day in this simulated home.
const WEEKDAY_FACTOR = [1.1, 0.95, 0.95, 1.0, 0.95, 1.0, 1.3]

const LITRES_PER_PERSON = 55

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function startOfHour(t: number) {
  const d = new Date(t)
  d.setMinutes(0, 0, 0)
  return d.getTime()
}

export function startOfDay(t: number) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Hourly water-tank and sewage-tank readings from 30 days before `anchor` up to
 * `now`. Deterministic, so the demo is stable. Before the anchor, trucks visit
 * Mon–Sat 08:00–17:00 when a tank needs it, except on past storm days (so the
 * history shows what running low looks like). The last water delivery is pinned
 * about 2.9 days before the anchor and the last pump-out about 4 days before, so
 * the demo opens with a half-full tank. After that, only deliveries and pump-outs
 * the plant actually marks as done (through the app) change the tanks.
 */
export function generateReadings(
  h: Household,
  now: number,
  opts: { anchor: number; deliveries?: number[]; pumpOuts?: number[] },
  days = 30,
): Reading[] {
  const end = startOfHour(now)
  const anchor = startOfHour(opts.anchor)
  const start = startOfDay(anchor - days * DAY)
  const rand = mulberry32(214)
  const stormDays = new Set([startOfDay(anchor - 17 * DAY), startOfDay(anchor - 16 * DAY), startOfDay(anchor - 6 * DAY)])
  const pinnedDelivery = startOfHour(anchor - 70 * HOUR)
  const pinnedPump = startOfHour(anchor - 98 * HOUR)
  const deliveries = new Set((opts.deliveries ?? []).map(startOfHour))
  const pumpOuts = new Set((opts.pumpOuts ?? []).map(startOfHour))
  const daily = h.people * LITRES_PER_PERSON

  const out: Reading[] = []
  let level = h.tankL * 0.8
  let sewage = h.sewageL * 0.3
  for (let t = start; t <= end; t += HOUR) {
    const d = new Date(t)
    const hr = d.getHours()
    const dow = d.getDay()
    const inWindow = dow !== 0 && hr >= 8 && hr <= 17
    const storm = stormDays.has(startOfDay(t))
    const history = t < pinnedDelivery - DAY

    if (t === pinnedDelivery || deliveries.has(t)) level = h.tankL
    else if (history && inWindow && !storm && level < h.tankL * 0.3 && rand() < 0.35) level = h.tankL

    if (t === pinnedPump || pumpOuts.has(t)) sewage = h.sewageL * 0.05
    else if (t < pinnedPump - DAY && inWindow && !storm && sewage > h.sewageL * 0.7 && rand() < 0.35) sewage = h.sewageL * 0.05

    // A full sewage tank stops all water use in the house.
    const want = daily * HOUR_PROFILE[hr] * WEEKDAY_FACTOR[dow] * (0.75 + rand() * 0.5)
    const use = sewage >= h.sewageL ? 0 : Math.min(level, want)
    level -= use
    sewage = Math.min(h.sewageL, sewage + use * 0.95)
    out.push({ t, level: Math.round(level), sewage: Math.round(sewage) })
  }
  return out
}

/** Litres used per calendar day (refills ignored). */
export function dailyUse(readings: Reading[]) {
  const map = new Map<number, number>()
  for (let i = 1; i < readings.length; i++) {
    const drop = readings[i - 1].level - readings[i].level
    const day = startOfDay(readings[i].t)
    map.set(day, (map.get(day) ?? 0) + (drop > 0 ? drop : 0))
  }
  return [...map.entries()].map(([day, litres]) => ({ day, litres: Math.round(litres) }))
}

/** Average litres used in each hour of the day over the last `days` days. */
export function hourPattern(readings: Reading[], days = 14) {
  const cutoff = readings[readings.length - 1].t - days * DAY
  const sums = Array(24).fill(0)
  const counts = Array(24).fill(0)
  for (let i = 1; i < readings.length; i++) {
    if (readings[i].t < cutoff) continue
    const drop = readings[i - 1].level - readings[i].level
    if (drop < 0) continue
    const hr = new Date(readings[i].t).getHours()
    sums[hr] += drop
    counts[hr]++
  }
  return sums.map((s, i) => (counts[i] ? s / counts[i] : 0))
}

/** Average litres per weekday (Sunday = 0) over complete days. */
export function weekdayPattern(days: { day: number; litres: number }[]) {
  const sums = Array(7).fill(0)
  const counts = Array(7).fill(0)
  for (const d of days) {
    const dow = new Date(d.day).getDay()
    sums[dow] += d.litres
    counts[dow]++
  }
  return sums.map((s, i) => (counts[i] ? s / counts[i] : 0))
}

/** Stretches where the tank was below 10 % — times the home ran low. */
export function lowEvents(readings: Reading[], tankL: number) {
  const events: { start: number; end: number; empty: boolean }[] = []
  let cur: { start: number; end: number; empty: boolean } | null = null
  for (const r of readings) {
    if (r.level < tankL * 0.1) {
      if (!cur) cur = { start: r.t, end: r.t, empty: false }
      cur.end = r.t
      if (r.level === 0) cur.empty = true
    } else if (cur) {
      events.push(cur)
      cur = null
    }
  }
  if (cur) events.push(cur)
  return events
}

/**
 * Expected daily use: mean of the last 7 complete days. Projects forward hour by
 * hour with the household's own hour + weekday shape to estimate when the tank
 * runs dry.
 */
export function forecast(readings: Reading[], now: number, sewageL: number) {
  const days = dailyUse(readings)
  const today = startOfDay(now)
  const complete = days.filter((d) => d.day < today).slice(-7)
  const expectedDaily = complete.reduce((a, d) => a + d.litres, 0) / Math.max(1, complete.length)
  const avgWeekday = WEEKDAY_FACTOR.reduce((a, b) => a + b, 0) / 7

  // Hours until `litres` are used up at the household's usual hourly pace.
  const project = (litres: number, factor: number) => {
    let left = litres
    let t = startOfHour(now)
    let hours = 0
    while (left > 0 && hours < 24 * 21) {
      t += HOUR
      const d = new Date(t)
      left -= expectedDaily * factor * HOUR_PROFILE[d.getHours()] * (WEEKDAY_FACTOR[d.getDay()] / avgWeekday)
      hours++
    }
    return { at: left <= 0 ? t : null, days: hours / 24 }
  }

  const last = readings[readings.length - 1]
  const water = project(last.level, 1)
  const sewage = project(sewageL - last.sewage, 0.95)
  // Water expected to be used between now and the end of today, at the usual pace.
  const usedToday = days.find((d) => d.day === today)?.litres ?? 0
  const hourNow = new Date(now).getHours()
  const typicalByNow = expectedDaily * HOUR_PROFILE.slice(0, hourNow + 1).reduce((a, b) => a + b, 0)

  return {
    level: last.level,
    sewage: last.sewage,
    expectedDaily,
    emptyAt: water.at,
    daysLeft: water.days,
    sewageFullAt: sewage.at,
    sewageDaysLeft: sewage.days,
    sewageFull: last.sewage >= sewageL,
    usedToday,
    typicalByNow,
  }
}

/** Litres per day the household can use so the tank lasts until `until`. */
export function conservationBudget(level: number, now: number, until: number, people: number) {
  const days = Math.max(0.25, (until - now) / DAY)
  const perDay = level / days
  return { perDay, perPerson: perDay / people }
}

/** WHO basic-access level: about 20 L per person per day for drinking and basic hygiene. */
export const WHO_BASIC_LPPD = 20
