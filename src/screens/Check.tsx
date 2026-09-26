import { Check as CheckMark, GlassWater, Info } from 'lucide-react'
import { useRef, useState } from 'react'
import { StatusIcon, STATUS_STYLE } from '../components/StatusIcon'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { cn } from '../lib/cn'
import { fmtDateTime, fmtNum } from '../lib/format'
import { evaluate, STRIP_SWATCHES, type QualityCheck } from '../lib/quality'
import { useStore } from '../lib/store'

type Answer = boolean | null

export function Check({ checks }: { checks: QualityCheck[] }) {
  const { t, locale, addCheck, now, demoAdvisory, lastTankClean } = useStore()
  const [chlorine, setChlorine] = useState<number | null | undefined>(undefined)
  const [clear, setClear] = useState<Answer>(null)
  const [smellOk, setSmellOk] = useState<Answer>(null)
  const [saved, setSaved] = useState<QualityCheck | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const ready = chlorine !== undefined && clear !== null && smellOk !== null

  const save = () => {
    if (!ready) return
    const c: QualityCheck = { t: Date.now(), chlorine, clear, smellOk }
    addCheck(c)
    setSaved(c)
    requestAnimationFrame(() => resultRef.current?.focus())
  }

  const restart = () => {
    setChlorine(undefined)
    setClear(null)
    setSmellOk(null)
    setSaved(null)
  }

  const result = saved ? evaluate(saved, { advisory: demoAdvisory, now, lastTankClean }) : null

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t('check.title')}</h1>

        {result && saved ? (
          <Card className={cn('border-2', STATUS_STYLE[result.status].ring)}>
            <div ref={resultRef} tabIndex={-1} className={cn('flex items-center gap-4 rounded-xl p-5 outline-none', STATUS_STYLE[result.status].bg)} aria-live="polite">
              <StatusIcon status={result.status} className="size-14 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{t('check.saved')}</p>
                <p className="text-3xl font-bold">{t(`status.${result.status}`)}</p>
                <ul className="mt-1 space-y-1">
                  {result.reasons.map((r) => (
                    <li key={r}>{t(`reason.${r}` as const, { v: saved.chlorine != null ? fmtNum(saved.chlorine, locale, 1) : '', n: 0 })}</li>
                  ))}
                </ul>
              </div>
            </div>
            <CardContent className="pt-5">
              <Button variant="outline" onClick={restart}>
                {t('nav.check')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Step n={1} title={t('check.step1')}>
              <p className="flex items-start gap-3">
                <GlassWater aria-hidden="true" className="size-8 shrink-0 text-brand" />
                {t('check.step1Body')}
              </p>
            </Step>

            <Step n={2} title={t('check.step2')} done={chlorine !== undefined}>
              <p className="mb-3 text-muted-foreground">{t('check.step2Body')}</p>
              <fieldset>
                <legend className="sr-only">{t('check.step2')}</legend>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {STRIP_SWATCHES.map((s) => {
                    const on = chlorine === s.mgL
                    return (
                      <label
                        key={s.mgL}
                        className={cn(
                          'flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 p-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring',
                          on ? 'border-foreground bg-muted' : 'border-transparent hover:bg-muted',
                        )}
                      >
                        <input type="radio" name="chlorine" value={s.mgL} aria-label={`${fmtNum(s.mgL, locale, 1)} ${t('mgL')}`} className="sr-only" checked={on} onChange={() => setChlorine(s.mgL)} />
                        {/* Fixed strip reference colour, identical in light and dark. */}
                        <span className="relative grid size-12 place-items-center rounded-md border-2 border-foreground/40" style={{ background: s.colour }} aria-hidden="true">
                          {on && <CheckMark className="size-7 text-foreground drop-shadow-[0_0_2px_white]" strokeWidth={3} />}
                        </span>
                        <span className="text-sm font-bold tabular-nums">{fmtNum(s.mgL, locale, s.mgL < 1 && s.mgL > 0 ? 1 : 0)}</span>
                        <span className="sr-only">{t('mgL')}</span>
                      </label>
                    )
                  })}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t('mgL')}</p>
                <label
                  className={cn(
                    'mt-3 flex min-h-12 cursor-pointer items-center gap-3 rounded-full border-2 px-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring',
                    chlorine === null ? 'border-foreground bg-muted font-semibold' : 'border-border',
                  )}
                >
                  <input type="radio" name="chlorine" value="none" aria-label={t('check.noStrip')} className="size-5 accent-current" checked={chlorine === null} onChange={() => setChlorine(null)} />
                  {t('check.noStrip')}
                </label>
              </fieldset>
            </Step>

            <Step n={3} title={t('check.step3')} done={clear !== null && smellOk !== null}>
              <YesNo name="clear" question={t('check.clear')} value={clear} onChange={setClear} />
              <YesNo name="smell" question={t('check.smell')} hint={t('check.smellHint')} value={smellOk} onChange={setSmellOk} />
            </Step>

            <Button variant="brand" size="lg" className="w-full sm:w-auto" disabled={!ready} onClick={save}>
              {t('check.save')}
            </Button>
          </>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <Info aria-hidden="true" className="size-6 shrink-0 text-brand" />
            <CardTitle>{t('check.why')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t('check.whyBody')}</p>
          </CardContent>
        </Card>

        <Card aria-labelledby="history-title">
          <CardHeader>
            <CardTitle id="history-title">{t('check.history')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {[...checks].reverse().slice(0, 6).map((c) => {
                const r = evaluate(c, { advisory: false, now: c.t, lastTankClean: null })
                return (
                  <li key={c.t} className="flex items-center gap-3 py-3">
                    <StatusIcon status={r.status} className="size-6 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{t(`status.${r.status}`)}</p>
                      <p className="text-sm text-muted-foreground">{fmtDateTime(c.t, locale)}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">
                      {c.chlorine === null ? t('check.none') : `${fmtNum(c.chlorine, locale, 1)} ${t('mgL')}`}
                    </p>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  const { t } = useStore()
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <span
          className={cn('grid size-9 shrink-0 place-items-center rounded-full border-2 font-bold', done ? 'border-brand bg-brand text-brand-foreground' : 'border-foreground')}
          aria-hidden="true"
        >
          {done ? <CheckMark className="size-5" strokeWidth={3} /> : n}
        </span>
        <div>
          <CardDescription>{t('check.step', { n })}</CardDescription>
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function YesNo({ name, question, hint, value, onChange }: { name: string; question: string; hint?: string; value: Answer; onChange: (v: boolean) => void }) {
  const { t } = useStore()
  return (
    <fieldset>
      <legend className="text-lg font-semibold">{question}</legend>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[true, false].map((v) => (
          <label
            key={String(v)}
            className={cn(
              'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border-2 font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring',
              value === v ? 'border-foreground bg-primary text-primary-foreground' : 'border-border hover:bg-muted',
            )}
          >
            <input type="radio" name={name} value={v ? 'yes' : 'no'} aria-label={`${question} ${v ? t('check.yes') : t('check.no')}`} className="sr-only" checked={value === v} onChange={() => onChange(v)} />
            {value === v && <CheckMark aria-hidden="true" className="size-5" strokeWidth={3} />}
            {v ? t('check.yes') : t('check.no')}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
