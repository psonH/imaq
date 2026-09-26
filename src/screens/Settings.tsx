import { ExternalLink, FastForward, RotateCcw } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Segmented } from '../components/ui/segmented'
import { Switch } from '../components/ui/switch'
import { fmtNum } from '../lib/format'
import { LANG_LABEL, type Lang } from '../lib/i18n'
import { useStore, type TextSize } from '../lib/store'
import { demoStormStart } from '../lib/weather'
import { NeedsPicker, PeopleStepper } from './Welcome'

const TANK_SIZES = [1100, 1500, 1800, 2300]
const SEWAGE_SIZES = [1500, 2300, 3000]

export function Settings() {
  const s = useStore()
  const { t, locale } = s
  const cleanValue = s.lastTankClean ? new Date(s.lastTankClean).toISOString().slice(0, 10) : ''

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <h1 className="text-2xl font-bold lg:col-span-2">{t('settings.title')}</h1>

      <Card>
        <CardContent className="space-y-6 pt-5">
          <Group label={t('settings.language')}>
            <Segmented<Lang>
              name="lang"
              label={t('settings.language')}
              value={s.lang}
              onChange={(lang) => s.setPrefs({ lang })}
              options={(['iu', 'en', 'fr'] as Lang[]).map((l) => ({ value: l, label: LANG_LABEL[l], lang: l === 'iu' ? 'iu-Cans' : l }))}
            />
          </Group>
          <Group label={t('settings.textSize')}>
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
        </CardContent>
      </Card>

      <Card aria-labelledby="home-settings">
        <CardHeader>
          <CardTitle id="home-settings">{t('settings.home')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label htmlFor="house-settings" className="font-semibold">
              {t('settings.house')}
            </label>
            <input
              id="house-settings"
              inputMode="numeric"
              autoComplete="off"
              value={s.house}
              onChange={(e) => s.setData({ house: e.target.value.slice(0, 6) })}
              className="mt-2 block min-h-12 w-full rounded-lg border-2 bg-card px-4 text-lg font-semibold tabular-nums"
            />
          </div>
          <PeopleStepper />
          <NeedsPicker legend={t('settings.needs')} hint={t('welcome.needsHint')} />
          <Group label={t('settings.tank')}>
            <Segmented
              name="tank"
              label={t('settings.tank')}
              value={String(s.tankL)}
              onChange={(v) => s.setData({ tankL: Number(v) })}
              options={TANK_SIZES.map((l) => ({ value: String(l), label: `${fmtNum(l, locale)} L` }))}
            />
          </Group>
          <Group label={t('settings.sewage')}>
            <Segmented
              name="sewage"
              label={t('settings.sewage')}
              value={String(s.sewageL)}
              onChange={(v) => s.setData({ sewageL: Number(v) })}
              options={SEWAGE_SIZES.map((l) => ({ value: String(l), label: `${fmtNum(l, locale)} L` }))}
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
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => s.skipAhead(12)}>
              <FastForward /> {t('settings.skip')}
            </Button>
            {s.demoOffsetH > 0 && <p className="text-sm text-muted-foreground">{t('settings.skipped', { n: s.demoOffsetH })}</p>}
          </div>
          <Switch
            label={t('settings.demoStorm')}
            checked={!!s.demoStorm}
            onChange={(v) => s.setData({ demoStorm: v ? demoStormStart(s.now) : null })}
            onText={t('on')}
            offText={t('off')}
          />
          <Switch label={t('settings.demoAdvisory')} checked={s.demoAdvisory} onChange={(v) => s.setData({ demoAdvisory: v })} onText={t('on')} offText={t('off')} />
          <div className="rounded-lg bg-muted p-4">
            <a
              href="#plant"
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-border bg-card px-5 font-semibold hover:bg-background"
            >
              <ExternalLink aria-hidden="true" className="size-5" /> {t('settings.plant')}
            </a>
            <p className="mt-2 text-sm text-muted-foreground">{t('settings.plantBody')}</p>
          </div>
          <Button variant="ghost" onClick={s.reset}>
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

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-semibold" aria-hidden="true">
        {label}
      </p>
      {children}
    </div>
  )
}
