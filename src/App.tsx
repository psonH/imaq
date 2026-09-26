import { BarChart3, Droplets, Home as HomeIcon, Settings as SettingsIcon, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { StatusIcon } from './components/StatusIcon'
import { cn } from './lib/cn'
import { LANG_LABEL, LANG_SHORT, type Key, type Lang } from './lib/i18n'
import { useStore } from './lib/store'
import { useWater } from './lib/useWater'
import { loadWeather, type WeatherState } from './lib/weather'
import { Check } from './screens/Check'
import { Home } from './screens/Home'
import { Settings } from './screens/Settings'
import { Usage } from './screens/Usage'

type Tab = 'home' | 'check' | 'usage' | 'settings'

const TABS: { id: Tab; icon: typeof HomeIcon; label: Key }[] = [
  { id: 'home', icon: HomeIcon, label: 'nav.home' },
  { id: 'check', icon: Droplets, label: 'nav.check' },
  { id: 'usage', icon: BarChart3, label: 'nav.usage' },
  { id: 'settings', icon: SettingsIcon, label: 'nav.settings' },
]

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
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
  return online
}

export default function App() {
  const s = useStore()
  const { t } = s
  const [tab, setTab] = useState<Tab>(() => (location.hash.slice(1) as Tab) || 'home')
  const [weather, setWeather] = useState<WeatherState>({ fetchedAt: null, storm: null, source: 'unavailable' })
  const online = useOnline()
  const water = useWater(weather)

  useEffect(() => {
    loadWeather().then(setWeather)
    const id = setInterval(() => loadWeather().then(setWeather), 30 * 60_000)
    return () => clearInterval(id)
  }, [online])

  // Deep links (#check, #usage…) work for demos and shared links.
  useEffect(() => {
    const onHash = () => {
      const h = location.hash.slice(1) as Tab
      if (TABS.some((x) => x.id === h)) setTab(h)
    }
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    history.replaceState(null, '', `#${tab}`)
    window.scrollTo({ top: 0 })
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [tab])

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        {t('skip')}
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-xl bg-brand text-brand-foreground" aria-hidden="true">
              <Droplets className="size-6" />
            </span>
            <div className="leading-tight">
              <p className="font-heading text-xl font-bold">
                Imaq <span lang="iu-Cans">ᐃᒪᖅ</span>
              </p>
              <p className="text-xs text-muted-foreground">{t('app.tagline')}</p>
            </div>
          </div>
          <nav aria-label={t('nav.home')} className="ml-6 hidden gap-1 md:flex">
            {TABS.map((x) => (
              <TabButton key={x.id} tab={x} active={tab === x.id} onClick={() => setTab(x.id)} variant="top" />
            ))}
          </nav>
          <div className="ml-auto flex gap-1 rounded-full bg-muted p-1" role="group" aria-label="Language / Langue / ᐅᖃᐅᓯᖅ">
            {(['iu', 'en', 'fr'] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => s.setPrefs({ lang: l })}
                aria-pressed={s.lang === l}
                aria-label={LANG_LABEL[l]}
                lang={l === 'iu' ? 'iu-Cans' : l}
                className={cn(
                  'min-h-10 min-w-11 rounded-full px-3 text-sm font-bold',
                  s.lang === l ? 'bg-card text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {LANG_SHORT[l]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {(!online || s.demoAdvisory || s.lang === 'iu') && (
        <div className="mx-auto w-full max-w-7xl space-y-2 px-4 pt-4">
          {s.demoAdvisory && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border-2 border-destructive bg-destructive/10 p-4">
              <StatusIcon status="unsafe" className="size-8 shrink-0" />
              <div>
                <p className="text-lg font-bold">{t('advisory.title')}</p>
                <p>{t('advisory.body')}</p>
              </div>
            </div>
          )}
          {!online && (
            <p role="status" className="flex items-center gap-2 rounded-xl bg-muted p-3 font-semibold">
              <WifiOff aria-hidden="true" className="size-5" /> {t('offline')}
            </p>
          )}
          {s.lang === 'iu' && <p className="rounded-xl bg-muted p-3 text-sm" lang="en">{t('iuNote')}</p>}
        </div>
      )}

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 pb-28 outline-none md:pb-10">
        {tab === 'home' && <Home water={water} weather={weather} onTest={() => setTab('check')} />}
        {tab === 'check' && <Check checks={water.checks} />}
        {tab === 'usage' && <Usage water={water} />}
        {tab === 'settings' && <Settings />}
      </main>

      <nav aria-label={t('nav.home')} className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {TABS.map((x) => (
            <TabButton key={x.id} tab={x} active={tab === x.id} onClick={() => setTab(x.id)} variant="bottom" />
          ))}
        </div>
      </nav>
    </div>
  )
}

function TabButton({ tab, active, onClick, variant }: { tab: (typeof TABS)[number]; active: boolean; onClick: () => void; variant: 'top' | 'bottom' }) {
  const { t } = useStore()
  const Icon = tab.icon
  if (variant === 'top') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        className={cn('flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold', active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}
      >
        <Icon aria-hidden="true" className="size-5" /> {t(tab.label)}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={t(tab.label)}
      className={cn('flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold', active ? 'text-foreground' : 'text-muted-foreground')}
    >
      <span className={cn('grid h-8 w-14 place-items-center rounded-full', active && 'bg-muted')}>
        <Icon aria-hidden="true" className="size-6" strokeWidth={active ? 2.5 : 2} />
      </span>
      <span className={cn(active && 'underline decoration-2 underline-offset-4')}>{t(tab.label)}</span>
    </button>
  )
}
