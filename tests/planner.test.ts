import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deliverBy, dueDay, plan, type Day, type Home, type Plant, type Risk, type Truck } from '../src/lib/planner.ts'

const DAY = 86_400_000
const days = (risks: Risk[]): Day[] => risks.map((risk, i) => ({ date: i * DAY, risk }))
const plant: Plant = { productionPerDay: 240_000, storageMax: 600_000, storageNow: 420_000, fillMin: 20, travelMin: 10, stopMin: 8 }
const trucks: Truck[] = [
  { id: 'W-1', capacity: 9000, shiftMin: 600, inService: true },
  { id: 'W-2', capacity: 9000, shiftMin: 600, inService: true },
]

function homes(n: number, level = 400, capacity = 1800, perDay = 300): Home[] {
  return Array.from({ length: n }, (_, i) => ({ id: `h${i}`, house: String(100 + i), route: i % 4, people: 5, capacity, level, perDay }))
}

test('trucks stay within their shifts', () => {
  const p = plan(homes(200), trucks, plant, days(['low', 'low', 'low']))
  for (const d of p) for (const t of d.trucks) assert.ok(t.minutesUsed <= t.minutesAvailable, `${t.truck.id} used ${t.minutesUsed} of ${t.minutesAvailable}`)
})

test('deliveries never exceed the water the plant has', () => {
  const tight: Plant = { ...plant, storageNow: 5000, productionPerDay: 3000 }
  const p = plan(homes(40), trucks, tight, days(['low', 'low']))
  assert.ok(p[0].delivered <= 5000 + 3000)
})

test('homes are pulled ahead of a storm', () => {
  // Reaches reserve on day 2, which is a storm: must be served by day 1.
  const h: Home = { id: 'a', house: '1', route: 0, people: 4, capacity: 1800, level: 1200, perDay: 400 }
  assert.equal(dueDay(h, days(['low', 'low', 'high', 'low'])), 1)
  const p = plan([h], trucks, plant, days(['low', 'low', 'high', 'low']))
  const servedBy = p.findIndex((d) => d.trucks.some((t) => t.loads.some((l) => l.stops.length)))
  assert.ok(servedBy >= 0 && servedBy <= 1, `served on day ${servedBy}`)
})

test('deliver-by skips days with no service', () => {
  // Reserve reached on day 3 (a Sunday, no service): deliver by day 2.
  const h = { capacity: 1800, level: 1400, perDay: 330 }
  const ds = days(['low', 'low', 'low', 'none', 'low'])
  assert.equal(deliverBy(h, ds), ds[2].date)
})

test('the plan never delivers more than homes need', () => {
  const hs = homes(30)
  const p = plan(hs, trucks, plant, days(['low', 'low', 'low']))
  for (const d of p) {
    const stops = d.trucks.flatMap((t) => t.loads.flatMap((l) => l.stops))
    const ids = stops.map((s) => s.home.id)
    assert.equal(new Set(ids).size, ids.length, 'a home is served at most once a day')
    for (const s of stops) assert.ok(s.litres <= s.home.capacity - s.home.level + 1)
  }
})

test('a late home on a no-service day gets the next service day', () => {
  const h = { capacity: 1800, level: 100, perDay: 400 } // already below reserve
  const ds = days(['none', 'low', 'low'])
  assert.equal(deliverBy(h, ds), ds[1].date)
})
