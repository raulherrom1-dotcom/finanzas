// Fechas como texto "AAAA-MM-DD" y meses como "AAAA-MM", siempre en hora de Ciudad de México.
// La aritmética se hace en UTC sobre fechas puras para que nunca brinque un día.

export const TZ = 'America/Mexico_City'
export type ISODate = string // "2026-10-07"
export type MonthKey = string // "2026-10"

const partsFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

/** Fecha de hoy en Ciudad de México. */
export function todayISO(now: Date = new Date()): ISODate {
  const p = Object.fromEntries(partsFmt.formatToParts(now).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}`
}

export function currentMonth(now: Date = new Date()): MonthKey {
  return todayISO(now).slice(0, 7)
}

export function monthOf(date: ISODate): MonthKey {
  return date.slice(0, 7)
}

function toUTC(date: ISODate): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function fromUTC(d: Date): ISODate {
  return d.toISOString().slice(0, 10)
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  return fromUTC(toUTC(s)) === s
}

export function makeISO(year: number, month: number, day: number): ISODate {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = toUTC(date)
  d.setUTCDate(d.getUTCDate() + days)
  return fromUTC(d)
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/** Mismo día en otro mes; si no existe (31 de febrero), el último día. */
export function addMonthsToDate(date: ISODate, n: number, day?: number): ISODate {
  const [y, m] = addMonths(monthOf(date), n).split('-').map(Number)
  const want = day ?? Number(date.slice(8, 10))
  return makeISO(y, m, Math.min(want, daysInMonth(y, m)))
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / 86_400_000)
}

export function monthStart(month: MonthKey): ISODate {
  return `${month}-01`
}

export function monthEnd(month: MonthKey): ISODate {
  const [y, m] = month.split('-').map(Number)
  return makeISO(y, m, daysInMonth(y, m))
}

export function monthDayCount(month: MonthKey): number {
  const [y, m] = month.split('-').map(Number)
  return daysInMonth(y, m)
}

/** Lunes de la semana de esa fecha. */
export function weekStart(date: ISODate): ISODate {
  const dow = toUTC(date).getUTCDay() // 0 = domingo
  return addDays(date, -((dow + 6) % 7))
}

/** Día de la semana: 0 = lunes … 6 = domingo */
export function weekday(date: ISODate): number {
  return (toUTC(date).getUTCDay() + 6) % 7
}

const monthLong = new Intl.DateTimeFormat('es-MX', { month: 'long', timeZone: 'UTC' })
const monthShort = new Intl.DateTimeFormat('es-MX', { month: 'short', timeZone: 'UTC' })
const weekdayShort = new Intl.DateTimeFormat('es-MX', { weekday: 'short', timeZone: 'UTC' })
const weekdayLong = new Intl.DateTimeFormat('es-MX', { weekday: 'long', timeZone: 'UTC' })

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function clean(s: string) {
  return s.replace('.', '')
}

/** "2026-10" → "octubre" */
export function monthName(month: MonthKey): string {
  return monthLong.format(toUTC(`${month}-01`))
}

/** "2026-10" → "Octubre 2026" (o solo "Octubre" si es el año actual y `short`) */
export function monthLabel(month: MonthKey, opts: { omitCurrentYear?: boolean } = {}): string {
  const name = cap(monthName(month))
  if (opts.omitCurrentYear && month.slice(0, 4) === currentMonth().slice(0, 4)) return name
  return `${name} ${month.slice(0, 4)}`
}

/** "2026-10" → "oct" */
export function monthShortName(month: MonthKey): string {
  return clean(monthShort.format(toUTC(`${month}-01`)))
}

/** "2026-10-07" → "7 oct" */
export function shortDate(date: ISODate): string {
  return `${Number(date.slice(8, 10))} ${clean(monthShort.format(toUTC(date)))}`
}

/** "2026-10-07" → "Hoy", "Ayer", "Mañana", "Martes 6 oct", o con año si es otro año. */
export function dayLabel(date: ISODate, today: ISODate = todayISO()): string {
  const diff = daysBetween(today, date)
  if (diff === 0) return 'Hoy'
  if (diff === -1) return 'Ayer'
  if (diff === 1) return 'Mañana'
  const base = `${cap(clean(weekdayLong.format(toUTC(date))))} ${shortDate(date)}`
  return date.slice(0, 4) === today.slice(0, 4) ? base : `${base} ${date.slice(0, 4)}`
}

/** "2026-10-07" → "Miércoles 7 de octubre" */
export function longDate(date: ISODate): string {
  return `${cap(weekdayLong.format(toUTC(date)))} ${Number(date.slice(8, 10))} de ${monthLong.format(toUTC(date))}`
}

/** "2026-10-07" → "mar 7 oct" */
export function compactDayLabel(date: ISODate): string {
  return `${clean(weekdayShort.format(toUTC(date)))} ${shortDate(date)}`
}

/** "en 3 días", "mañana", "hoy", "hace 2 días" */
export function relativeDays(date: ISODate, today: ISODate = todayISO()): string {
  const diff = daysBetween(today, date)
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'mañana'
  if (diff === -1) return 'ayer'
  if (diff > 0) return `en ${diff} días`
  return `hace ${-diff} días`
}

export function minISO(a: ISODate, b: ISODate) {
  return a < b ? a : b
}

export function maxISO(a: ISODate, b: ISODate) {
  return a > b ? a : b
}
