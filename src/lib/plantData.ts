// SAMPLE DATA for the water-plant view (badged "Sample data" in the UI).
// Settings chosen so the plan looks like a realistic Inukjuak week; replace
// with the plant's real fleet, routes and tank readings before use.

import type { Home, Plant, Truck } from './planner'

export const POPULATION = 1821 // Inukjuak, 2021 Census
export const SERVICE_DAYS = [1, 2, 3, 4, 5, 6] // Monday–Saturday

export const PLANT: Plant = {
  productionPerDay: 240_000,
  storageMax: 600_000,
  storageNow: 420_000,
  fillMin: 20,
  travelMin: 10,
  stopMin: 8,
}

export const SHIFT_MIN = 600 // 10-hour shifts

export const FLEET: Truck[] = [
  { id: 'W-1', capacity: 9000, shiftMin: SHIFT_MIN, inService: true },
  { id: 'W-2', capacity: 9000, shiftMin: SHIFT_MIN, inService: true },
  { id: 'W-3', capacity: 9000, shiftMin: SHIFT_MIN, inService: true },
  { id: 'W-4', capacity: 11000, shiftMin: SHIFT_MIN, inService: true },
  { id: 'W-5', capacity: 9000, shiftMin: SHIFT_MIN, inService: true },
  { id: 'W-6', capacity: 9000, shiftMin: SHIFT_MIN, inService: false },
]

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TANKS = [1600, 1800, 2000, 2270]

/** 420 homes: household sizes 1–9, tanks 1,600–2,270 L, 4 routes. Deterministic. */
export function sampleHomes(): Home[] {
  const rand = mulberry32(2021)
  return Array.from({ length: 420 }, (_, i) => {
    const people = 1 + Math.floor(rand() * 9)
    const capacity = TANKS[Math.floor(rand() * TANKS.length)]
    const perDay = Math.round(people * (70 + rand() * 40))
    const level = Math.round(capacity * (0.15 + rand() * 0.85))
    const house = String(1 + i).padStart(3, '0')
    return { id: `s-${house}`, house, route: 1 + (i % 4), people, capacity, level, perDay }
  })
}
