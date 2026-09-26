// Delivery planner for the water plant. Pure functions, no imports, so they run
// in the browser and under `node --test` alike.
//
// Model: each home has a "due day" — the last service day on or before the day
// its tank reaches reserve. Every day we pick the homes due today or tomorrow
// (plus open requests below 85 % full), give each stop to the truck with the
// most shift time left, cap the day by the water the plant has, and record the
// homes that were due but could not be reached.

export type Risk = 'low' | 'medium' | 'high' | 'none' // none = no service that day

export type Day = { date: number; risk: Risk }

export type Home = {
  id: string
  house: string
  route: number
  people: number
  capacity: number // L
  level: number // L now
  perDay: number // L used per day
  requested?: boolean
}

export type Truck = { id: string; capacity: number; shiftMin: number; inService: boolean }

export type Plant = {
  productionPerDay: number
  storageMax: number
  storageNow: number
  fillMin: number // filling a truck at the plant
  travelMin: number // plant ↔ town per load
  stopMin: number // per house
}

export type Why = 'requested' | 'reserve' | 'weather' | 'predicted'

export type Stop = { home: Home; litres: number; why: Why }
export type Load = { stops: Stop[]; litres: number }
export type TruckDay = { truck: Truck; minutesUsed: number; minutesAvailable: number; loads: Load[] }
export type PlanDay = {
  day: Day
  shiftFactor: number
  trucks: TruckDay[]
  missed: Home[]
  shortfallMin: number
  delivered: number // L
  storageEnd: number // L
  pulledForward: number // homes served early because of a storm
}

export const RESERVE = 0.2 // share of the tank kept back for safety
export const REQUEST_BELOW = 0.85 // requests are served when the tank is below this

export function shiftFactor(risk: Risk) {
  return risk === 'low' ? 1 : risk === 'medium' ? 0.7 : 0
}

/** Days (from index 0 = today) until the home reaches its reserve line. */
export function daysToReserve(h: Pick<Home, 'level' | 'capacity' | 'perDay'>) {
  return (h.level - h.capacity * RESERVE) / Math.max(1, h.perDay)
}

/**
 * Due day: the last day with trucks running (shift factor > 0) on or before the
 * day the home reaches reserve. Returns 0 when it is already late.
 */
export function dueDay(h: Pick<Home, 'level' | 'capacity' | 'perDay'>, days: Day[]) {
  const reserveDay = Math.min(days.length - 1, Math.floor(daysToReserve(h)))
  for (let d = reserveDay; d >= 0; d--) if (shiftFactor(days[d].risk) > 0) return d
  return 0
}

/** True if a storm or no-service day sits between the due day and the reserve day. */
function pulledByWeather(h: Home, days: Day[], due: number) {
  const reserveDay = Math.min(days.length - 1, Math.floor(daysToReserve(h)))
  for (let d = due + 1; d <= reserveDay; d++) if (days[d].risk === 'high') return true
  return false
}

export function plan(homesIn: Home[], trucks: Truck[], plant: Plant, days: Day[]): PlanDay[] {
  const homes = homesIn.map((h) => ({ ...h }))
  let storage = plant.storageNow
  const out: PlanDay[] = []

  for (let d = 0; d < days.length; d++) {
    const day = days[d]
    const factor = shiftFactor(day.risk)
    const view = days.slice(d) // re-plan from today each day

    const due = new Map(homes.map((h) => [h.id, dueDay(h, view)]))
    const eligible = homes
      .filter((h) => (due.get(h.id) ?? 99) <= 1 || (h.requested && h.level < h.capacity * REQUEST_BELOW))
      .sort(
        (a, b) =>
          (due.get(a.id) ?? 99) - (due.get(b.id) ?? 99) ||
          Number(!!b.requested) - Number(!!a.requested) ||
          a.level / a.capacity - b.level / b.capacity,
      )

    const fleet: TruckDay[] = trucks
      .filter((t) => t.inService)
      .map((t) => ({ truck: t, minutesUsed: 0, minutesAvailable: Math.round(t.shiftMin * factor), loads: [] }))
    const loadLeft = new Map<string, number>(fleet.map((f) => [f.truck.id, 0]))
    let water = storage + plant.productionPerDay
    let delivered = 0
    let pulledForward = 0
    const served = new Set<string>()

    if (factor > 0) {
      for (const h of eligible) {
        const litres = Math.max(0, Math.round(h.capacity - h.level))
        if (litres === 0 || litres > water) continue
        // Truck with the most time left that can still fit this stop.
        const options = fleet
          .map((f) => {
            const needsLoad = (loadLeft.get(f.truck.id) ?? 0) < litres
            const cost = plant.stopMin + (needsLoad ? plant.fillMin + plant.travelMin : 0)
            return { f, cost, needsLoad, left: f.minutesAvailable - f.minutesUsed }
          })
          .filter((o) => o.cost <= o.left && litres <= o.f.truck.capacity)
          .sort((a, b) => b.left - a.left)
        const pick = options[0]
        if (!pick) continue
        if (pick.needsLoad) {
          pick.f.loads.push({ stops: [], litres: 0 })
          loadLeft.set(pick.f.truck.id, pick.f.truck.capacity)
        }
        const load = pick.f.loads[pick.f.loads.length - 1]
        const dueD = due.get(h.id) ?? 99
        const why: Why = h.requested ? 'requested' : h.level <= h.capacity * RESERVE ? 'reserve' : pulledByWeather(h, view, dueD) ? 'weather' : 'predicted'
        if (why === 'weather') pulledForward++
        load.stops.push({ home: { ...h }, litres, why })
        load.litres += litres
        loadLeft.set(pick.f.truck.id, (loadLeft.get(pick.f.truck.id) ?? 0) - litres)
        pick.f.minutesUsed += pick.cost
        water -= litres
        delivered += litres
        served.add(h.id)
      }
    }

    // Within each load: by route, then house number.
    for (const f of fleet) for (const l of f.loads) l.stops.sort((a, b) => a.home.route - b.home.route || a.home.house.localeCompare(b.home.house, undefined, { numeric: true }))

    // Due today but not reached: missed. Estimate the truck time they needed.
    const missed = homes.filter((h) => (due.get(h.id) ?? 99) === 0 && !served.has(h.id))
    const avgLoadStops = 9000 / Math.max(1, avg(missed.map((h) => h.capacity - h.level)))
    const shortfallMin = Math.round(missed.length * (plant.stopMin + (plant.fillMin + plant.travelMin) / Math.max(1, avgLoadStops)))

    out.push({ day, shiftFactor: factor, trucks: fleet, missed: missed.map((h) => ({ ...h })), shortfallMin, delivered, storageEnd: 0, pulledForward })

    // Use first, then refill the homes that were served.
    for (const h of homes) {
      h.level = Math.max(0, h.level - h.perDay)
      if (served.has(h.id)) {
        h.level = h.capacity - h.perDay * 0.5 // delivered mid-day
        h.requested = false
      }
    }
    storage = Math.min(plant.storageMax, storage + plant.productionPerDay - delivered)
    out[out.length - 1].storageEnd = storage
  }
  return out
}

function avg(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 1
}

export type Advice =
  | { kind: 'addTime'; day: number; hours: number; shifts: number; homes: number }
  | { kind: 'noService'; day: number; homes: number }
  | { kind: 'storm'; day: number; homes: number }
  | { kind: 'storage'; day: number; litres: number }
  | { kind: 'maintenance'; trucks: string[] }
  | { kind: 'ok' }

/** Plain recommendations for the plant supervisor. */
export function recommend(p: PlanDay[], trucks: Truck[], plantCfg: Plant, shiftMin: number): Advice[] {
  const advice: Advice[] = []
  p.forEach((d, i) => {
    if (d.missed.length && d.shiftFactor > 0) {
      const hours = Math.ceil(d.shortfallMin / 60)
      advice.push({ kind: 'addTime', day: i, hours, shifts: Math.ceil(d.shortfallMin / shiftMin), homes: d.missed.length })
    } else if (d.missed.length) advice.push({ kind: 'noService', day: i, homes: d.missed.length })
    if (d.pulledForward) advice.push({ kind: 'storm', day: i, homes: d.pulledForward })
    if (d.storageEnd < plantCfg.storageMax * 0.25) advice.push({ kind: 'storage', day: i, litres: d.storageEnd })
  })
  const down = trucks.filter((t) => !t.inService).map((t) => t.id)
  if (down.length) advice.push({ kind: 'maintenance', trucks: down })
  if (!advice.length) advice.push({ kind: 'ok' })
  return advice
}

/** Deliver-by date for a request: its due day, skipping no-service and high-risk days. */
export function deliverBy(h: Pick<Home, 'level' | 'capacity' | 'perDay'>, days: Day[]) {
  return days[dueDay(h, days)]?.date ?? days[0].date
}

/** Daily delivery risk from forecast weather (thresholds from the plant brief). */
export function riskFromWeather(w: { gustMax: number; windMax: number; snowCm: number; tempMin: number; rainMm: number }, serviceDay: boolean): Risk {
  if (!serviceDay) return 'none'
  if (w.gustMax >= 70 || w.windMax >= 50 || w.snowCm >= 10) return 'high'
  if (w.gustMax >= 50 || w.snowCm >= 4 || w.tempMin <= -35 || w.rainMm >= 15) return 'medium'
  return 'low'
}
