// Delivery requests shared between the household app and the water-plant view.
// In the prototype both sides live in the same browser and sync through
// localStorage; a real rollout would send these by SMS gateway or a small server.

import { DAY, HOUR } from './sim'
import type { StormWindow } from './weather'

export type ReqType = 'water' | 'sewage'
export type ReqStatus = 'queued' | 'sent' | 'scheduled' | 'onTheWay' | 'delivered' | 'cancelled'
export type Need = 'elder' | 'infant' | 'medical'
export type ReqReason = 'low' | 'storm' | 'manual' | 'full'

export type Req = {
  id: string
  house: string
  type: ReqType
  status: ReqStatus
  createdAt: number
  updatedAt: number
  auto: boolean
  reason: ReqReason
  people: number
  needs: Need[]
  daysLeft: number // at the time of the request
  eta?: number
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

/** Other homes already waiting, so the plant queue looks like a real morning. */
export function seedOtherRequests(anchor: number): Req[] {
  const mk = (house: string, type: ReqType, hoursAgo: number, daysLeft: number, people: number, needs: Need[], status: ReqStatus = 'sent'): Req => ({
    id: `seed-${house}-${type}`,
    house,
    type,
    status,
    createdAt: anchor - hoursAgo * HOUR,
    updatedAt: anchor - hoursAgo * HOUR,
    auto: true,
    reason: type === 'sewage' ? 'full' : 'low',
    people,
    needs,
    daysLeft,
  })
  return [
    mk('118', 'water', 5, 0.4, 9, ['infant']),
    mk('072', 'water', 3, 0.9, 4, ['elder', 'medical']),
    mk('305', 'sewage', 6, 0.6, 7, []),
    mk('241', 'water', 2, 1.4, 5, []),
    mk('156', 'water', 8, 1.1, 3, ['elder'], 'scheduled'),
    mk('409', 'sewage', 1, 1.3, 6, ['infant']),
    mk('027', 'water', 1, 1.8, 2, []),
  ]
}

export type PriorityReason = 'veryLow' | 'low' | 'crowded' | 'infant' | 'elder' | 'medical' | 'storm' | 'waiting'

/**
 * Priority score for the dispatch queue. Higher = deliver sooner. Transparent on
 * purpose: every point comes with a reason the dispatcher can read.
 */
export function priority(r: Req, now: number, storm: StormWindow | null) {
  const reasons: PriorityReason[] = []
  let score = Math.max(0, Math.min(60, (3 - r.daysLeft) * 20))
  if (r.daysLeft <= 0.5) {
    score += 20
    reasons.push('veryLow')
  } else if (r.daysLeft <= 1.5) reasons.push('low')
  if (r.people >= 6) {
    score += Math.min(10, r.people) * 2
    reasons.push('crowded')
  }
  if (r.needs.includes('medical')) {
    score += 25
    reasons.push('medical')
  }
  if (r.needs.includes('infant')) {
    score += 20
    reasons.push('infant')
  }
  if (r.needs.includes('elder')) {
    score += 15
    reasons.push('elder')
  }
  if (storm && storm.start > now && storm.start - now < DAY) {
    score += 15
    reasons.push('storm')
  }
  const waitH = (now - r.createdAt) / HOUR
  if (waitH >= 4) {
    score += Math.min(10, waitH)
    reasons.push('waiting')
  }
  return { score: Math.round(score), reasons }
}

/** Next truck slot: top of the next hour within 08:00–17:00, Mon–Sat. */
export function nextSlot(now: number) {
  let t = Math.ceil((now + HOUR) / HOUR) * HOUR
  for (let i = 0; i < 24 * 8; i++) {
    const d = new Date(t)
    if (d.getDay() !== 0 && d.getHours() >= 8 && d.getHours() <= 16) return t
    t += HOUR
  }
  return t
}

/** Anonymised CSV for council and funding reports (no names, house numbers only). */
export function toCsv(reqs: Req[]) {
  const head = ['house', 'type', 'status', 'requested', 'updated', 'wait_hours', 'days_left_at_request', 'people', 'needs', 'automatic', 'reason']
  const rows = reqs.map((r) => [
    r.house,
    r.type,
    r.status,
    new Date(r.createdAt).toISOString(),
    new Date(r.updatedAt).toISOString(),
    ((r.updatedAt - r.createdAt) / HOUR).toFixed(1),
    r.daysLeft.toFixed(1),
    r.people,
    r.needs.join(' '),
    r.auto ? 'yes' : 'no',
    r.reason,
  ])
  return [head, ...rows].map((row) => row.join(',')).join('\n')
}
