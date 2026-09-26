import { BarChart3, Droplets, Home as HomeIcon, Settings as SettingsIcon, Truck, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { StatusIcon } from './components/StatusIcon'
import { cn } from './lib/cn'
import { LANG_LABEL, LANG_SHORT, type Key, type Lang } from './lib/i18n'
import { useStore } from './lib/store'
import { useAutoRequests } from './lib/useAutoRequests'
import { useWater } from './lib/useWater'
import { loadWeather, type WeatherState } from './lib/weather'
import { Check } from './screens/Check'
import { Deliveries } from './screens/Deliveries'
import { Home } from './screens/Home'
import { Plant } from './screens/Plant'
import { Settings } from './screens/Settings'
import { Usage } from './screens/Usage'
import { Welcome } from './screens/Welcome'

type Tab = 'home' | 'check' | 'deliveries' | 'usage' | 'settings' | 'plant'

const TABS: { id: Exclude<Tab, 'plant'>; icon: typeof HomeIcon; label: Key }[] = [
  { id: 'home', icon: HomeIcon, label: 'nav.home' },
  { id: 'check', icon: Droplets, label: 'nav.check' },
  { id: 'deliveries', icon: Truck, label: 'nav.deliveries' },
  { id: 'usage', icon: BarChart3, label: 'nav.usage' },
  { id: 'settings', icon: SettingsIcon, label: 'nav.settings' },
]
const ALL: Tab[] = ['home', 'check', 'deliveries', 'usage', 'settings', 'plant']

function tabFromHash(): Tab {
  const h = location.hash.slice(1) as Tab
  return ALL.includes(h) ? h : 'home'
}

export default function App() {
  const s = useStore()
  const { t } = s
  const [tab, setTab] = useState<Tab>(tabFromHash)
  const [weather, setWeather] = useState<WeatherState>({ fetchedAt: null, storm: null, source: 'unavailable' })
  const water = useWater(weather)
  const plant = tab === 'plant'

  // Only the household tab asks for deliveries; the plant tab just watches.
  useAutoRequests(water, !plant)

  useEffect(() => {
    loadWeather().then(setWeather)
    const id = setInterval(() => loadWeather().then(setWeather), 30 * 60_000)
    return () => clearInterval(id)
  }, [s.online])

  // Deep links (#check, #plant…) work for demos and shared links.
  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (location.hash.slice(1) !== tab) history.replaceState(null, '', `#${tab}`)
    window.scrollTo({ top: 0 })
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [tab])

  useEffect(() => {
    document.title = plant ? `${t('plant.title')} · Imaq` : 'Imaq · Household water'
  }, [plant, t])

  if (!plant && !s.onboarded) return <Welcome />

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        {t('skip')}
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <a href="#home" className="flex items-center gap-2 rounded-xl">
            <span className="grid size-10 place-items-center rounded-xl bg-brand text-brand-foreground" aria-hidden="true">
              <Droplets className="size-6" />
            </span>
            <span className="leading-tight">
              <span className="block font-heading text-xl font-bold">
                Imaq <span lang="iu-Cans">ᐃᒪᖅ</span>
              </span>
              <span className="block truncate text-xs text-muted-foreground">{plant ? t('plant.title') : `${t('app.tagline')} · ${t('plant.house', { n: s.house })}`}</span>
            </span>
          </a>
          {!plant && (
            <nav aria-label="Imaq" className="ml-4 hidden gap-1 lg:flex">
              {TABS.map((x) => (
                <TabButton key={x.id} tab={x} active={tab === x.id} onClick={() => setTab(x.id)} variant="top" />
              ))}
            </nav>
          )}
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

      {(!s.online || s.demoAdvisory || s.lang === 'iu') && (
        <div className="mx-auto w-full max-w-7xl space-y-2 px-4 pt-4">
          {s.demoAdvisory && !plant && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border-2 border-destructive bg-destructive/10 p-4">
              <StatusIcon status="unsafe" className="size-8 shrink-0" />
              <div>
                <p className="text-lg font-bold">{t('advisory.title')}</p>
                <p>{t('advisory.body')}</p>
              </div>
            </div>
          )}
          {!s.online && (
            <p role="status" className="flex items-center gap-2 rounded-xl bg-muted p-3 font-semibold">
              <WifiOff aria-hidden="true" className="size-5" /> {t('offline')}
            </p>
          )}
          {s.lang === 'iu' && (
            <p className="rounded-xl bg-muted p-3 text-sm" lang="en">
              {t('iuNote')}
            </p>
          )}
        </div>
      )}

      <main id="main" tabIndex={-1} className={cn('mx-auto w-full max-w-7xl flex-1 px-4 pt-4 outline-none', plant ? 'pb-10' : 'pb-28 lg:pb-10')}>
        {tab === 'home' && <Home water={water} weather={weather} go={setTab} />}
        {tab === 'check' && <Check checks={water.checks} />}
        {tab === 'deliveries' && <Deliveries water={water} />}
        {tab === 'usage' && <Usage water={water} />}
        {tab === 'settings' && <Settings />}
        {tab === 'plant' && <Plant storm={water.storm} />}
      </main>

      {!plant && (
        <nav aria-label="Imaq" className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-2xl grid-cols-5">
            {TABS.map((x) => (
              <TabButton key={x.id} tab={x} active={tab === x.id} onClick={() => setTab(x.id)} variant="bottom" />
            ))}
          </div>
        </nav>
      )}
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
        className={cn('flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 font-semibold', active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}
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
      className={cn('flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold sm:text-xs', active ? 'text-foreground' : 'text-muted-foreground')}
    >
      <span className={cn('grid h-8 w-12 place-items-center rounded-full', active && 'bg-muted')}>
        <Icon aria-hidden="true" className="size-6" strokeWidth={active ? 2.5 : 2} />
      </span>
      <span className={cn('max-w-full truncate', active && 'underline decoration-2 underline-offset-4')}>{t(tab.label)}</span>
    </button>
  )
}
