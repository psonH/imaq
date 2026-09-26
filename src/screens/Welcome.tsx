import { Check, Droplets, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { cn } from '../lib/cn'
import { LANG_LABEL, type Lang } from '../lib/i18n'
import type { Need } from '../lib/requests'
import { useStore } from '../lib/store'

// Two short steps: language first (with big buttons that show each language in
// its own script), then the few facts the forecast and the plant need.
export function Welcome() {
  const s = useStore()
  const { t } = s
  const [step, setStep] = useState<1 | 2>(1)
  const finish = () => s.setPrefs({ onboarded: true })

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand text-brand-foreground" aria-hidden="true">
          <Droplets className="size-8" />
        </span>
        <div>
          <p className="font-heading text-3xl font-bold">
            Imaq <span lang="iu-Cans">ᐃᒪᖅ</span>
          </p>
          <p className="text-muted-foreground">{t('app.tagline')}</p>
        </div>
      </div>

      {step === 1 ? (
        <>
          <div>
            <h1 className="text-3xl font-bold">{t('welcome.title')}</h1>
            <p className="mt-2 text-lg">{t('welcome.body')}</p>
          </div>
          <fieldset className="space-y-3">
            <legend className="mb-3 text-xl font-bold">{t('welcome.lang')}</legend>
            {(['iu', 'en', 'fr'] as Lang[]).map((l) => (
              <label
                key={l}
                className={cn(
                  'flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 px-5 text-xl font-bold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring',
                  s.lang === l ? 'border-foreground bg-muted' : 'border-border hover:bg-muted',
                )}
              >
                <input type="radio" name="welcome-lang" className="sr-only" checked={s.lang === l} onChange={() => s.setPrefs({ lang: l })} aria-label={LANG_LABEL[l]} />
                <span lang={l === 'iu' ? 'iu-Cans' : l}>{LANG_LABEL[l]}</span>
                {s.lang === l && <Check aria-hidden="true" className="size-7" strokeWidth={3} />}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="brand" size="lg" className="flex-1" onClick={() => setStep(2)}>
              {t('welcome.next')}
            </Button>
            <Button variant="ghost" size="lg" onClick={finish}>
              {t('welcome.skip')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold">{t('welcome.home')}</h1>
          <Card>
            <CardContent className="space-y-6 pt-5">
              <div>
                <label htmlFor="house" className="text-lg font-semibold">
                  {t('welcome.house')}
                </label>
                <input
                  id="house"
                  inputMode="numeric"
                  autoComplete="off"
                  value={s.house}
                  onChange={(e) => s.setData({ house: e.target.value.slice(0, 6) })}
                  className="mt-2 block min-h-14 w-full rounded-xl border-2 bg-card px-4 text-2xl font-bold tabular-nums"
                />
              </div>
              <PeopleStepper />
              <NeedsPicker legend={t('welcome.needs')} hint={t('welcome.needsHint')} />
            </CardContent>
          </Card>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="lg" onClick={() => setStep(1)}>
              {t('welcome.back')}
            </Button>
            <Button variant="brand" size="lg" className="flex-1" onClick={finish}>
              {t('welcome.start')}
            </Button>
          </div>
        </>
      )}
    </main>
  )
}

export function PeopleStepper() {
  const s = useStore()
  const { t } = s
  return (
    <div>
      <p id="people-label" className="text-lg font-semibold">
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
  )
}

export function NeedsPicker({ legend, hint }: { legend: string; hint?: string }) {
  const s = useStore()
  const { t } = s
  const toggle = (n: Need) => s.setData({ needs: s.needs.includes(n) ? s.needs.filter((x) => x !== n) : [...s.needs, n] })
  return (
    <fieldset>
      <legend className="text-lg font-semibold">{legend}</legend>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {(['elder', 'infant', 'medical'] as Need[]).map((n) => {
          const on = s.needs.includes(n)
          return (
            <label
              key={n}
              className={cn(
                'flex min-h-12 cursor-pointer items-center gap-2 rounded-full border-2 px-4 font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring',
                on ? 'border-foreground bg-primary text-primary-foreground' : 'border-border hover:bg-muted',
              )}
            >
              <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(n)} />
              {on && <Check aria-hidden="true" className="size-5" strokeWidth={3} />}
              {t(`need.${n}`)}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
