import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { HTML_LANG, LOCALE, translate, type Key, type Lang } from './i18n'
import { seedChecks, type QualityCheck } from './quality'
import { isOpen, MY_HOUSE_DEFAULT, newId, seedOtherRequests, type Need, type Req, type ReqStatus } from './requests'
import { DAY, HOUR } from './sim'

export type Theme = 'light' | 'dark' | 'auto'
export type TextSize = 'md' | 'lg' | 'xl'

type Prefs = { v: 2; lang: Lang; theme: Theme; textSize: TextSize; onboarded: boolean; notify: boolean }

const DEFAULT_PREFS: Prefs = { v: 2, lang: 'en', theme: 'light', textSize: 'md', onboarded: false, notify: false }

// Light is the default. Prefs saved before v2 defaulted to "match phone", so move them to light once.
function readPrefs(): Prefs {
  const p = read<Prefs>(PREFS_KEY, DEFAULT_PREFS)
  return p.v === 2 ? p : { ...p, v: 2, theme: 'light' }
}

type Data = {
  house: string
  people: number
  needs: Need[]
  tankL: number
  sewageL: number
  lastTankClean: number | null
  checks: QualityCheck[]
  alertDays: number
  autoRequest: boolean
  anchor: number // when the simulated history ends; time after it is "live"
  demoOffsetH: number // demo: hours skipped ahead
  demoStorm: number | null // demo: start time of a simulated blizzard
  demoAdvisory: boolean
}

// Shared with the water-plant view (other tab, same browser).
type Shared = { requests: Req[]; deliveries: number[]; pumpOuts: number[] }

const PREFS_KEY = 'imaq:prefs'
const DATA_KEY = 'imaq:data'
const SHARED_KEY = 'imaq:shared'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function defaultData(now: number): Data {
  return {
    house: MY_HOUSE_DEFAULT,
    people: 6,
    needs: [],
    tankL: 1800,
    sewageL: 2300,
    lastTankClean: now - 220 * DAY,
    checks: seedChecks(now),
    alertDays: 1.5,
    autoRequest: true,
    anchor: now,
    demoOffsetH: 0,
    demoStorm: null,
    demoAdvisory: false,
  }
}

function defaultShared(now: number): Shared {
  return { requests: seedOtherRequests(now), deliveries: [], pumpOuts: [] }
}

type NewReq = Pick<Req, 'type' | 'auto' | 'reason' | 'daysLeft'>

type Ctx = Prefs &
  Data &
  Shared & {
    now: number
    online: boolean
    t: (key: Key, vars?: Record<string, string | number>) => string
    locale: string
    setPrefs: (p: Partial<Prefs>) => void
    setData: (d: Partial<Data>) => void
    addCheck: (c: QualityCheck) => void
    requestDelivery: (r: NewReq) => Req
    setRequestStatus: (id: string, status: ReqStatus, eta?: number) => void
    skipAhead: (hours: number) => void
    reset: () => void
  }

const StoreCtx = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [clock, setClock] = useState(() => Date.now())
  const [online, setOnline] = useState(() => navigator.onLine)
  const [prefs, setPrefsState] = useState<Prefs>(readPrefs)
  const [data, setDataState] = useState<Data>(() => read(DATA_KEY, defaultData(Date.now())))
  const [shared, setSharedState] = useState<Shared>(() => read(SHARED_KEY, defaultShared(Date.now())))

  const now = clock + data.demoOffsetH * HOUR

  // Tick every 30 s so "used today", forecasts and request timers stay current.
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    addEventListener('online', on)
    addEventListener('offline', off)
    return () => {
      removeEventListener('online', on)
      removeEventListener('offline', off)
    }
  }, [])

  // Another tab (the plant view) changed something: pick it up.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.newValue) return
      try {
        if (e.key === SHARED_KEY) setSharedState(JSON.parse(e.newValue))
        if (e.key === DATA_KEY) setDataState(JSON.parse(e.newValue))
      } catch {}
    }
    addEventListener('storage', onStorage)
    return () => removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    write(PREFS_KEY, prefs)
    const root = document.documentElement
    root.lang = HTML_LANG[prefs.lang]
    root.dataset.text = prefs.textSize
    const dark = prefs.theme === 'dark' || (prefs.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
    root.classList.toggle('dark', dark)
  }, [prefs])

  useEffect(() => write(DATA_KEY, data), [data])
  useEffect(() => write(SHARED_KEY, shared), [shared])

  // Back online: send anything that waited in the outbox.
  useEffect(() => {
    if (!online) return
    setSharedState((s) =>
      s.requests.some((r) => r.status === 'queued')
        ? { ...s, requests: s.requests.map((r) => (r.status === 'queued' ? { ...r, status: 'sent', updatedAt: Date.now() } : r)) }
        : s,
    )
  }, [online])

  const setPrefs = useCallback((p: Partial<Prefs>) => setPrefsState((s) => ({ ...s, ...p })), [])
  const setData = useCallback((d: Partial<Data>) => setDataState((s) => ({ ...s, ...d })), [])
  const addCheck = useCallback((c: QualityCheck) => setDataState((s) => ({ ...s, checks: [...s.checks, c] })), [])

  const requestDelivery = useCallback(
    (r: NewReq) => {
      const req: Req = {
        ...r,
        id: newId(),
        house: data.house,
        status: navigator.onLine ? 'sent' : 'queued',
        createdAt: now,
        updatedAt: now,
        people: data.people,
        needs: data.needs,
      }
      setSharedState((s) => ({ ...s, requests: [...s.requests, req] }))
      return req
    },
    [data.house, data.people, data.needs, now],
  )

  const setRequestStatus = useCallback(
    (id: string, status: ReqStatus, eta?: number) => {
      setSharedState((s) => {
        const req = s.requests.find((r) => r.id === id)
        if (!req) return s
        const mine = req.house === data.house
        const delivered = status === 'delivered' && mine
        return {
          requests: s.requests.map((r) => (r.id === id ? { ...r, status, updatedAt: now, eta: eta ?? r.eta } : r)),
          deliveries: delivered && req.type === 'water' ? [...s.deliveries, now] : s.deliveries,
          pumpOuts: delivered && req.type === 'sewage' ? [...s.pumpOuts, now] : s.pumpOuts,
        }
      })
    },
    [data.house, now],
  )

  // Demo: jump the clock forward. The sample homes in the plant queue move with
  // it, so their waiting times stay realistic.
  const skipAhead = useCallback((hours: number) => {
    setDataState((s) => ({ ...s, demoOffsetH: s.demoOffsetH + hours }))
    setSharedState((s) => ({
      ...s,
      requests: s.requests.map((r) =>
        r.id.startsWith('seed-') && isOpen(r) ? { ...r, createdAt: r.createdAt + hours * HOUR, updatedAt: r.updatedAt + hours * HOUR } : r,
      ),
    }))
  }, [])

  const reset = useCallback(() => {
    const t = Date.now()
    setDataState((s) => ({ ...defaultData(t), house: s.house, people: s.people, needs: s.needs }))
    setSharedState(defaultShared(t))
  }, [])

  const value = useMemo<Ctx>(
    () => ({
      ...prefs,
      ...data,
      ...shared,
      now,
      online,
      locale: LOCALE[prefs.lang],
      t: (key, vars) => translate(prefs.lang, key, vars),
      setPrefs,
      setData,
      addCheck,
      requestDelivery,
      setRequestStatus,
      skipAhead,
      reset,
    }),
    [prefs, data, shared, now, online, setPrefs, setData, addCheck, requestDelivery, setRequestStatus, skipAhead, reset],
  )

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
