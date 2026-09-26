import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { HTML_LANG, LOCALE, translate, type Key, type Lang } from './i18n'
import { seedChecks, type QualityCheck } from './quality'
import { DAY } from './sim'

export type Theme = 'light' | 'dark' | 'auto'
export type TextSize = 'md' | 'lg' | 'xl'

type Prefs = { lang: Lang; theme: Theme; textSize: TextSize }
type Data = {
  people: number
  tankL: number
  lastTankClean: number | null
  checks: QualityCheck[]
  demoStorm: boolean
  demoAdvisory: boolean
}

const PREFS_KEY = 'imaq:prefs'
const DATA_KEY = 'imaq:data'

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
    people: 6,
    tankL: 1800,
    lastTankClean: now - 220 * DAY,
    checks: seedChecks(now),
    demoStorm: false,
    demoAdvisory: false,
  }
}

type Ctx = Prefs &
  Data & {
    now: number
    t: (key: Key, vars?: Record<string, string | number>) => string
    locale: string
    setPrefs: (p: Partial<Prefs>) => void
    setData: (d: Partial<Data>) => void
    addCheck: (c: QualityCheck) => void
    reset: () => void
  }

const StoreCtx = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => Date.now())
  const [prefs, setPrefsState] = useState<Prefs>(() => read(PREFS_KEY, { lang: 'en', theme: 'auto', textSize: 'md' }))
  const [data, setDataState] = useState<Data>(() => read(DATA_KEY, defaultData(Date.now())))

  // Tick every minute so "used today" and forecasts stay current.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
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

  const setPrefs = useCallback((p: Partial<Prefs>) => setPrefsState((s) => ({ ...s, ...p })), [])
  const setData = useCallback((d: Partial<Data>) => setDataState((s) => ({ ...s, ...d })), [])
  const addCheck = useCallback((c: QualityCheck) => setDataState((s) => ({ ...s, checks: [...s.checks, c] })), [])
  const reset = useCallback(() => setDataState(defaultData(Date.now())), [])

  const value = useMemo<Ctx>(
    () => ({
      ...prefs,
      ...data,
      now,
      locale: LOCALE[prefs.lang],
      t: (key, vars) => translate(prefs.lang, key, vars),
      setPrefs,
      setData,
      addCheck,
      reset,
    }),
    [prefs, data, now, setPrefs, setData, addCheck, reset],
  )

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
