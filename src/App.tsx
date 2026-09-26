import { BarChart3, Droplets, ExternalLink, Home as HomeIcon, Settings as SettingsIcon, Truck, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { StatusIcon } from './components/StatusIcon'
import { RequestWater } from './components/RequestWater'
import { cn } from './lib/cn'
import { LANG_LABEL, LANG_SHORT, type Key, type Lang } from './lib/i18n'
import { useStore } from './lib/store'
import { useAutoRequests } from './lib/useAutoRequests'
import { useWater } from './lib/useWater'
import { loadWeather, type WeatherState } from './lib/weather'
import { Deliveries } from './screens/Deliveries'
import { Home } from './screens/Home'
import { Plant } from './screens/Plant'
import { Settings } from './screens/Settings'
import { Usage } from './screens/Usage'
import { Welcome } from './screens/Welcome'

type Tab = 'home' | 'deliveries' | 'usage' | 'settings' | 'plant'
type Water = ReturnType<typeof useWater>

const TABS: { id: Exclude<Tab, 'plant'>; icon: typeof HomeIcon; label: Key }[] = [
  { id: 'home', icon: HomeIcon, label: 'nav.home' },
  { id: 'deliveries', icon: Truck, label: 'nav.deliveries' },
  { id: 'usage', icon: BarChart3, label: 'nav.usage' },
  { id: 'settings', icon: SettingsIcon, label: 'nav.settings' },
]
const ALL: Tab[] = ['home', 'deliveries', 'usage', 'settings', 'plant']

function tabFromHash(): Tab {
  const h = location.hash.slice(1) as Tab
  return ALL.includes(h) ? h : 'home'
}

export default function App() {
  const s = useStore()
  const { t } = s
  const [tab, setTab] = useState<Tab>(tabFromHash)
  const [weather, setWeather] = useState<WeatherState>({ fetchedAt: null, storm: null, current: null, source: 'unavailable' })
  const water = useWater(weather)
  const plant = tab === 'plant'

  // Only the household tab asks for deliveries; the plant tab just watches.
  useAutoRequests(water, !plant)

  // Weather is checked automatically on open, every 30 minutes, and on reconnect.
  useEffect(() => {
    loadWeather().then(setWeather)
    const id = setInterval(() => loadWeather().then(setWeather), 30 * 60_000)
    return () => clearInterval(id)
  }, [s.online])

  // Deep links (#usage, #plant…) work for demos and shared links.
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

  const banners = (!s.online || (s.demoAdvisory && !plant) || s.lang === 'iu') && (
    <div className="space-y-2 pb-4">
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
  )

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        {t('skip')}
      </a>

      {!plant && <Sidebar tab={tab} setTab={setTab} water={water} />}

      {/* Top bar: phones and tablets in the household app, every width in the plant view. */}
      <header className={cn('sticky top-0 z-30 border-b bg-background/95 backdrop-blur', !plant && 'lg:hidden')}>
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Brand subtitle={plant ? t('plant.title') : `${t('app.tagline')} · ${t('plant.house', { n: s.house })}`} />
          <div className="ml-auto">
            <LangSwitch />
          </div>
        </div>
      </header>

      <div className={cn(!plant && 'lg:pl-72')}>
        <main id="main" tabIndex={-1} className={cn('mx-auto w-full max-w-6xl px-4 pt-4 outline-none lg:px-8 lg:pt-8', plant ? 'pb-10' : 'pb-28 lg:pb-10')}>
          {banners}
          {tab === 'home' && <Home water={water} weather={weather} go={setTab} />}
          {tab === 'deliveries' && <Deliveries water={water} />}
          {tab === 'usage' && <Usage water={water} />}
          {tab === 'settings' && <Settings />}
          {tab === 'plant' && <Plant storm={water.storm} />}
        </main>
      </div>

      {!plant && (
        <nav aria-label="Imaq" className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-2xl grid-cols-4">
            {TABS.map((x) => {
              const Icon = x.icon
              const active = tab === x.id
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setTab(x.id)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={t(x.label)}
                  className={cn('flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold sm:text-xs', active ? 'text-foreground' : 'text-muted-foreground')}
                >
                  <span className={cn('grid h-8 w-12 place-items-center rounded-full', active && 'bg-muted')}>
                    <Icon aria-hidden="true" className="size-6" strokeWidth={active ? 2.5 : 2} />
                  </span>
                  <span className={cn('max-w-full truncate', active && 'underline decoration-2 underline-offset-4')}>{t(x.label)}</span>
                </button>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}

function Brand({ subtitle }: { subtitle: string }) {
  return (
    <a href="#home" className="flex min-w-0 items-center gap-2 rounded-xl">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground" aria-hidden="true">
        <Droplets className="size-6" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block font-heading text-xl font-bold">
          Imaq <span lang="iu-Cans">ᐃᒪᖅ</span>
        </span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </a>
  )
}

function LangSwitch() {
  const s = useStore()
  return (
    <div className="flex gap-1 rounded-full bg-muted p-1" role="group" aria-label="Language / Langue / ᐅᖃᐅᓯᖅ">
      {(['iu', 'en', 'fr'] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => s.setPrefs({ lang: l })}
          aria-pressed={s.lang === l}
          aria-label={LANG_LABEL[l]}
          lang={l === 'iu' ? 'iu-Cans' : l}
          className={cn(
            'min-h-10 min-w-11 flex-1 rounded-full px-3 text-sm font-bold',
            s.lang === l ? 'bg-card text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {LANG_SHORT[l]}
        </button>
      ))}
    </div>
  )
}

// Desktop sidebar: brand, the one main action (request water), navigation, language.
function Sidebar({ tab, setTab, water }: { tab: Tab; setTab: (t: Tab) => void; water: Water }) {
  const s = useStore()
  const { t } = s
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col gap-6 border-r bg-card p-5 lg:flex" aria-label="Imaq">
      <Brand subtitle={`${t('app.tagline')} · ${t('plant.house', { n: s.house })}`} />

      <RequestWater water={water} />

      <nav aria-label="Imaq">
        <ul className="space-y-1">
          {TABS.map((x) => {
            const Icon = x.icon
            const active = tab === x.id
            return (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => setTab(x.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 w-full items-center gap-3 rounded-full px-4 text-left font-semibold',
                    active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={active ? 2.5 : 2} />
                  {t(x.label)}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-auto space-y-3">
        <LangSwitch />
        <a
          href="#plant"
          target="_blank"
          rel="noopener"
          className="flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ExternalLink aria-hidden="true" className="size-4" /> {t('side.plant')}
        </a>
      </div>
    </aside>
  )
}
