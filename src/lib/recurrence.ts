import type { Frequency } from '../db/types'
import { addDays, addMonthsToDate, daysInMonth, makeISO, type ISODate } from './dates'

// Reglas de repetición:
//  - semanal: cada 7 días desde la fecha inicial
//  - quincenal: días 15 y último de cada mes (como se paga la nómina en México)
//  - mensual: el mismo día cada mes; si el mes es más corto, el último día

function nextQuincena(date: ISODate, inclusive: boolean): ISODate {
  const [y, m, d] = date.split('-').map(Number)
  const last = daysInMonth(y, m)
  const fifteen = makeISO(y, m, 15)
  const end = makeISO(y, m, last)
  if (inclusive && (d === 15 || d === last)) return date
  if (d < 15) return fifteen
  if (d < last) return end
  return addMonthsToDate(fifteen, 1, 15)
}

/** Primera fecha en que se genera, a partir de la fecha inicial. */
export function firstOccurrence(freq: Frequency, start: ISODate): ISODate {
  return freq === 'biweekly' ? nextQuincena(start, true) : start
}

/** Siguiente fecha después de `date`. `anchorDay` es el día del mes de la fecha inicial (mensual). */
export function nextOccurrence(freq: Frequency, date: ISODate, anchorDay: number): ISODate {
  if (freq === 'weekly') return addDays(date, 7)
  if (freq === 'biweekly') return nextQuincena(date, false)
  return addMonthsToDate(date, 1, anchorDay)
}

/**
 * Fechas pendientes desde `nextDate` hasta hoy (incluido). Sirve para ponerse al corriente
 * aunque haya pasado mucho tiempo sin abrir la app.
 */
export function dueDates(
  rec: { frequency: Frequency; startDate: ISODate; nextDate: ISODate; endDate?: ISODate },
  today: ISODate,
  max = 400,
): { dates: ISODate[]; nextDate: ISODate } {
  const anchor = Number(rec.startDate.slice(8, 10))
  const dates: ISODate[] = []
  let d = rec.nextDate
  while (d <= today && (!rec.endDate || d <= rec.endDate) && dates.length < max) {
    dates.push(d)
    d = nextOccurrence(rec.frequency, d, anchor)
  }
  return { dates, nextDate: d }
}

/** Próximas N fechas a partir de `from` (para mostrar "próximos pagos"). */
export function upcoming(rec: { frequency: Frequency; startDate: ISODate; nextDate: ISODate; endDate?: ISODate }, until: ISODate): ISODate[] {
  const anchor = Number(rec.startDate.slice(8, 10))
  const out: ISODate[] = []
  let d = rec.nextDate
  while (d <= until && (!rec.endDate || d <= rec.endDate) && out.length < 10) {
    out.push(d)
    d = nextOccurrence(rec.frequency, d, anchor)
  }
  return out
}

