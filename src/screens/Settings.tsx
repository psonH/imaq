import { Minus, Plus, RotateCcw } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Segmented } from '../components/ui/segmented'
import { Switch } from '../components/ui/switch'
import { fmtNum } from '../lib/format'
import { LANG_LABEL, type Lang } from '../lib/i18n'
import { useStore, type TextSize, type Theme } from '../lib/store'

const TANK_SIZES = [1100, 1500, 1800, 2300]

export function Settings() {
  const s = useStore()
  const { t, locale } = s
  const cleanValue = s.lastTankClean ? new Date(s.lastTankClean).toISOString().slice(0, 10) : ''

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <h1 className="text-2xl font-bold lg:col-span-2">{t('settings.title')}</h1>

      <Card>
        <CardContent className="space-y-6 pt-5">
          <Group label={t('settings.language')} id="lang">
            <Segmented<Lang>
              name="lang"
              label={t('settings.language')}
              value={s.lang}
              onChange={(lang) => s.setPrefs({ lang })}
              options={(['iu', 'en', 'fr'] as Lang[]).map((l) => ({ value: l, label: LANG_LABEL[l], lang: l === 'iu' ? 'iu-Cans' : l }))}
            />
          </Group>
          <Group label={t('settings.textSize')} id="text">
            <Segmented<TextSize>
              name="text"
              label={t('settings.textSize')}
              value={s.textSize}
              onChange={(textSize) => s.setPrefs({ textSize })}
              options={[
                { value: 'md', label: 'A', ariaLabel: t('settings.textNormal') },
                { value: 'lg', label: 'A+', ariaLabel: t('settings.textLarge') },
                { value: 'xl', label: 'A++', ariaLabel: t('settings.textLargest') },
              ]}
            />
          </Group>
          <Group label={t('settings.theme')} id="theme">
            <Segmented<Theme>
              name="theme"
              label={t('settings.theme')}
              value={s.theme}
              onChange={(theme) => s.setPrefs({ theme })}
              options={[
                { value: 'light', label: t('settings.light') },
                { value: 'dark', label: t('settings.dark') },
                { value: 'auto', label: t('settings.auto') },
              ]}
            />
          </Group>
        </CardContent>
      </Card>

      <Card aria-labelledby="home-settings">
        <CardHeader>
          <CardTitle id="home-settings">{t('settings.home')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p id="people-label" className="font-semibold">
              {t('settings.people')}
            </p>
            <div className="mt-2 flex items-center gap-4" role="group" aria-labelledby="people-label">
              <Button variant="outline" size="icon" onClick={() => s.setData({ people: Math.max(1, s.people - 1) })} aria-label={t('settings.fewer')}>
                <Minus />
              </Button>
              <output className="min-w-12 text-center text-4xl font-bold tabular-nums" aria-live="polite">
                {s.people}
              </output>
              <Button variant="outline" size="icon" onClick={() => s.setData({ people: Math.min(20, s.people + 1) })} aria-label={t('settings.more')}>
                <Plus />
              </Button>
            </div>
          </div>
          <Group label={t('settings.tank')} id="tank">
            <Segmented
              name="tank"
              label={t('settings.tank')}
              value={String(s.tankL)}
              onChange={(v) => s.setData({ tankL: Number(v) })}
              options={TANK_SIZES.map((l) => ({ value: String(l), label: `${fmtNum(l, locale)} L` }))}
            />
          </Group>
          <div>
            <label htmlFor="tank-clean" className="font-semibold">
              {t('settings.tankClean')}
            </label>
            <input
              id="tank-clean"
              type="date"
              value={cleanValue}
              onChange={(e) => s.setData({ lastTankClean: e.target.value ? new Date(e.target.value + 'T12:00').getTime() : null })}
              className="mt-2 block min-h-12 w-full rounded-lg border-2 bg-card px-4 text-base"
            />
          </div>
        </CardContent>
      </Card>

      <Card aria-labelledby="demo-settings">
        <CardHeader>
          <CardTitle id="demo-settings">{t('settings.demo')}</CardTitle>
          <CardDescription>{t('settings.demoBody')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Switch label={t('settings.demoStorm')} checked={s.demoStorm} onChange={(v) => s.setData({ demoStorm: v })} onText={t('on')} offText={t('off')} />
          <Switch label={t('settings.demoAdvisory')} checked={s.demoAdvisory} onChange={(v) => s.setData({ demoAdvisory: v })} onText={t('on')} offText={t('off')} />
          <Button variant="outline" onClick={s.reset} className="mt-2">
            <RotateCcw /> {t('settings.reset')}
          </Button>
        </CardContent>
      </Card>

      <Card aria-labelledby="about">
        <CardHeader>
          <CardTitle id="about">{t('settings.about')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('settings.aboutBody')}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function Group({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <p id={`${id}-label`} className="mb-2 font-semibold" aria-hidden="true">
        {label}
      </p>
      {children}
    </div>
  )
}
