// Unambiguous formats: litres always carry "L", dates carry weekday + day + month,
// times are 24-hour (as used across Nunavik and Quebec).

export function fmtNum(n: number, locale: string, digits = 0) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)
}

export function fmtDateTime(t: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(t)
}

export function fmtDay(t: number, locale: string) {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(t)
}

export function fmtTime(t: number, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(t)
}

export function fmtWeekday(dow: number, locale: string, style: 'long' | 'short' = 'long') {
  // 2023-01-01 was a Sunday.
  return new Intl.DateTimeFormat(locale, { weekday: style }).format(new Date(2023, 0, 1 + dow))
}

export function fmtHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`
}
