// Delivery requests shared between the household app and the water-plant view.
// Demo transport only: both sides live in the same browser and sync through
// localStorage + the `storage` event (see store.tsx). A server API can replace
// the few functions that read and write them.

import { HOUR } from './sim'
import { sampleHomes } from './plantData'

export type ReqType = 'water' | 'sewage'
export type ReqStatus = 'queued' | 'sent' | 'scheduled' | 'onTheWay' | 'delivered' | 'cancelled'
export type ReqSource = 'app' | 'phone' | 'sample'
export type Need = 'elder' | 'infant' | 'medical'
export type ReqReason = 'low' | 'storm' | 'manual' | 'full'

export type Req = {
  id: string
  house: string
  type: ReqType
  status: ReqStatus
  source: ReqSource
  createdAt: number // requested at
  updatedAt: number
  auto: boolean
  reason: ReqReason
  people: number
  needs: Need[]
  daysLeft: number // at the time of the request
  capacity?: number // L
  litresLeft?: number // L at the time of the request
  perDay?: number // L used per day
  eta?: number // planned delivery time
  truck?: string // e.g. "W-2"
  deliveredAt?: number
}

export const OPEN: ReqStatus[] = ['queued', 'sent', 'scheduled', 'onTheWay']
export const STEPS: ReqStatus[] = ['sent', 'scheduled', 'onTheWay', 'delivered']
export const MY_HOUSE_DEFAULT = '214'

export function isOpen(r: Req) {
  return OPEN.includes(r.status)
}

export function newId() {
  return Math.random().toString(36).slice(2, 10)
}

/** Water left now, projected from the level at request time and daily use. */
export function litresNow(r: Req, now: number) {
  if (r.litresLeft === undefined || r.perDay === undefined) return undefined
  return Math.max(0, Math.round(r.litresLeft - (r.perDay * (now - r.createdAt)) / (24 * HOUR)))
}

/** 12 sample requests from the lowest sample homes (a mix of app and phone). */
export function seedRequests(anchor: number): Req[] {
  const homes = sampleHomes()
    .filter((h) => h.house !== MY_HOUSE_DEFAULT)
    .sort((a, b) => a.level / a.capacity - b.level / b.capacity)
    .slice(0, 12)
  return homes.map((h, i) => {
    const t = anchor - (1 + ((i * 5) % 11)) * HOUR
    return {
      id: `seed-${h.house}`,
      house: h.house,
      type: 'water',
      status: 'sent',
      source: i % 3 === 0 ? 'phone' : 'sample',
      createdAt: t,
      updatedAt: t,
      auto: false,
      reason: 'low',
      people: h.people,
      needs: [],
      daysLeft: h.level / h.perDay,
      capacity: h.capacity,
      litresLeft: h.level,
      perDay: h.perDay,
    }
  })
}

/** Anonymised CSV for council and funding reports (no names, house numbers only). */
export function toCsv(reqs: Req[]) {
  const head = ['house', 'type', 'source', 'status', 'requested', 'updated', 'wait_hours', 'days_left_at_request', 'people', 'truck', 'planned_for', 'delivered_at']
  const iso = (t?: number) => (t ? new Date(t).toISOString() : '')
  const rows = reqs.map((r) => [
    r.house,
    r.type,
    r.source,
    r.status,
    iso(r.createdAt),
    iso(r.updatedAt),
    ((r.updatedAt - r.createdAt) / HOUR).toFixed(1),
    r.daysLeft.toFixed(1),
    r.people,
    r.truck ?? '',
    iso(r.eta),
    iso(r.deliveredAt),
  ])
  return [head, ...rows].map((row) => row.join(',')).join('\n')
}
