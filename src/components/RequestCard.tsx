import { Droplets, MessageSquareText, Truck, WifiOff } from 'lucide-react'
import { fmtDateTime, fmtNum } from '../lib/format'
import type { Key } from '../lib/i18n'
import type { Req, ReqType } from '../lib/requests'
import { useStore } from '../lib/store'
import { Timeline } from './Timeline'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

/** One delivery type (water or sewage): its open request, or a way to ask for one. */
export function RequestCard({ type, open, daysLeft, primary }: { type: ReqType; open?: Req; daysLeft: number; primary?: boolean }) {
  const s = useStore()
  const { t, locale } = s
  const Icon = type === 'water' ? Droplets : Truck
  const title = t(type === 'water' ? 'del.water' : 'del.sewage')

  const ask = () => s.requestDelivery({ type, auto: false, reason: 'manual', daysLeft })

  const smsHref = open
    ? `sms:?&body=${encodeURIComponent(
        t('del.smsBody', { house: s.house, type: title.toLowerCase(), people: s.people, days: fmtNum(open.daysLeft, locale, 1) }),
      )}`
    : undefined

  return (
    <Card aria-labelledby={`req-${type}`}>
      <CardHeader className="flex-row items-center gap-3">
        <Icon aria-hidden="true" className="size-7 shrink-0 text-brand" />
        <CardTitle id={`req-${type}`}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {open ? (
          <>
            <Timeline status={open.status} />
            <div aria-live="polite">
              <p className="text-lg font-bold">{t(`st.${open.status}` as Key)}</p>
              {open.eta && open.status !== 'delivered' && <p className="font-semibold">{t('del.eta', { time: fmtDateTime(open.eta, locale) })}</p>}
              <p className="text-sm text-muted-foreground">
                {t('del.sentAt', { time: fmtDateTime(open.createdAt, locale) })} · {open.auto ? t('del.auto') : t('del.reason.manual')} · {t(`del.reason.${open.reason}` as Key)}
              </p>
            </div>
            {open.status === 'queued' && (
              <div className="space-y-3 rounded-lg bg-muted p-4">
                <p className="flex items-start gap-2">
                  <WifiOff aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                  {t('del.offline')}
                </p>
                <a
                  href={smsHref}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-border bg-card px-5 font-semibold hover:bg-muted"
                >
                  <MessageSquareText aria-hidden="true" className="size-5" /> {t('del.sms')}
                </a>
              </div>
            )}
            <Button variant="ghost" onClick={() => s.setRequestStatus(open.id, 'cancelled')}>
              {t('del.cancel')}
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">{t('del.none')}</p>
            <Button variant={primary ? 'brand' : 'outline'} size="lg" onClick={ask}>
              <Icon /> {t(type === 'water' ? 'del.requestWater' : 'del.requestSewage')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
