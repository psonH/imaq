import { ArrowLeft, BarChart3, ClipboardList, Droplets, ExternalLink, Home as HomeIcon, Route, Settings as SettingsIcon, Truck, WifiOff } from 'lucide-react'
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
import { PlantPlan, PlantRequests } from './screens/Plant'
import { usePlan } from './lib/usePlan'
import { Settings } from './screens/Settings'
import { Usage } from './screens/Usage'
import { Welcome } from './screens/Welcome'

type Tab = 'home' | 'deliveries' | 'usage' | 'settings' | 'plant'
type PlantTab = 'requests' | 'plan'

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
  const [plantTab, setPlantTab] = useState<PlantTab>('requests')
  const planData = usePlan(water)

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

  // Household and plant share one shell: sidebar on desktop, top bar + bottom nav on phones.
  const nav: NavItem[] = plant
    ? [
        { id: 'requests', icon: ClipboardList, label: t('pnav.requests') },
        { id: 'plan', icon: Route, label: t('pnav.plan') },
      ]
    : TABS.map((x) => ({ id: x.id, icon: x.icon, label: t(x.label) }))
  const active = plant ? plantTab : tab
  const select = (id: string) => (plant ? setPlantTab(id as PlantTab) : setTab(id as Tab))
  const subtitle = plant ? t('plant.title') : `${t('app.tagline')} · ${t('plant.house', { n: s.house })}`

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        {t('skip')}
      </a>

      <Sidebar
        subtitle={subtitle}
        items={nav}
        active={active}
        onSelect={select}
        action={plant ? null : <RequestWater water={water} />}
        footer={
          plant ? (
            <a href="#home" className="flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
              <ArrowLeft aria-hidden="true" className="size-4" /> {t('plant.back')}
            </a>
          ) : (
            <a
              href="#plant"
              target="_blank"
              rel="noopener"
              className="flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ExternalLink aria-hidden="true" className="size-4" /> {t('side.plant')}
            </a>
          )
        }
      />

      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur print:hidden lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Brand subtitle={subtitle} />
          <div className="ml-auto">
            <LangSwitch />
          </div>
        </div>
      </header>

      <div className="lg:pl-72 print:pl-0">
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 pt-4 pb-28 outline-none lg:px-8 lg:pt-8 lg:pb-10 print:p-0">
          {banners}
          {tab === 'home' && <Home water={water} weather={weather} go={setTab} />}
          {tab === 'deliveries' && <Deliveries water={water} />}
          {tab === 'usage' && <Usage water={water} />}
          {tab === 'settings' && <Settings />}
          {plant && plantTab === 'requests' && <PlantRequests data={planData} />}
          {plant && plantTab === 'plan' && <PlantPlan data={planData} />}
        </main>
      </div>

      <nav aria-label="Imaq" className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur print:hidden lg:hidden">
        <div className="mx-auto grid max-w-2xl" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
          {nav.map((x) => {
            const Icon = x.icon
            const on = active === x.id
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => select(x.id)}
                aria-current={on ? 'page' : undefined}
                aria-label={x.label}
                className={cn('flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold sm:text-xs', on ? 'text-foreground' : 'text-muted-foreground')}
              >
                <span className={cn('grid h-8 w-12 place-items-center rounded-full', on && 'bg-muted')}>
                  <Icon aria-hidden="true" className="size-6" strokeWidth={on ? 2.5 : 2} />
                </span>
                <span className={cn('max-w-full truncate', on && 'underline decoration-2 underline-offset-4')}>{x.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

type NavItem = { id: string; icon: typeof HomeIcon; label: string }

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

// Desktop sidebar: brand, the main action (household: request water), navigation, language.
function Sidebar({
  subtitle,
  items,
  active,
  onSelect,
  action,
  footer,
}: {
  subtitle: string
  items: NavItem[]
  active: string
  onSelect: (id: string) => void
  action: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col gap-6 overflow-y-auto border-r bg-card p-5 lg:flex print:hidden" aria-label="Imaq">
      <Brand subtitle={subtitle} />
      {action}
      <nav aria-label="Imaq">
        <ul className="space-y-1">
          {items.map((x) => {
            const Icon = x.icon
            const on = active === x.id
            return (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => onSelect(x.id)}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 w-full items-center gap-3 rounded-full px-4 text-left font-semibold',
                    on ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={on ? 2.5 : 2} />
                  {x.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="mt-auto space-y-3">
        <LangSwitch />
        {footer}
      </div>
    </aside>
  )
}
