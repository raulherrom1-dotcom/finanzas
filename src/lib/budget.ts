import type { Account, Budget, Category, Cents, Frequency, GoalContribution, Transaction } from '../db/types'
import { addDays, addMonths, daysBetween, daysInMonth, makeISO, monthEnd, monthLabel, monthOf, shortDate, todayISO, weekday, type ISODate, type MonthKey } from './dates'
import { nextOccurrence } from './recurrence'
import { levelFor, type Level } from './levels'

/**
 * Periodo del presupuesto: empieza el día de pago y termina un día antes del siguiente pago.
 * Cada periodo tiene una clave: 'AAAA-MM' en mensual (el que empieza ese mes) y la fecha de pago normal
 * 'AAAA-MM-DD' en quincenal y semanal. Como las claves se ordenan igual que las fechas, los presupuestos
 * guardados con un mes siguen aplicando si cambias a quincenal o semanal.
 * `starts` guarda los periodos en que el pago cayó otro día.
 */
export interface PayCycle {
  /** Sin valor = mensual (ajustes guardados antes de que existiera). Quincenal = días 15 y último. */
  frequency?: Frequency
  /** Mensual: día del mes */
  payDay: number
  /** Semanal: 0 = lunes … 6 = domingo */
  weekday?: number
  starts: Record<string, ISODate>
}

export type PeriodKey = string

export const CALENDAR: PayCycle = { frequency: 'monthly', payDay: 1, starts: {} }
export const DEFAULT_WEEKDAY = 4 // viernes

export const freqOf = (c: PayCycle): Frequency => c.frequency ?? 'monthly'

export const CYCLE_WORDS: Record<Frequency, { limit: string; per: string; recent: string }> = {
  monthly: { limit: 'Límite mensual', per: 'al mes', recent: 'los últimos meses' },
  biweekly: { limit: 'Límite por quincena', per: 'por quincena', recent: 'las últimas quincenas' },
  weekly: { limit: 'Límite por semana', per: 'por semana', recent: 'las últimas semanas' },
}

/** Fecha de inicio si el pago cae el día normal. */
export function nominalStart(c: PayCycle, key: PeriodKey): ISODate {
  if (freqOf(c) !== 'monthly') return key
  const [y, m] = key.split('-').map(Number)
  return makeISO(y, m, Math.min(c.payDay, daysInMonth(y, m)))
}

export function periodStart(c: PayCycle, key: PeriodKey): ISODate {
  return c.starts[key] ?? nominalStart(c, key)
}

/** Periodo `n` lugares antes (negativo) o después (positivo). */
export function shiftPeriod(c: PayCycle, key: PeriodKey, n: number): PeriodKey {
  const f = freqOf(c)
  if (f === 'monthly') return addMonths(key, n)
  if (f === 'weekly') return addDays(key, 7 * n)
  for (; n > 0; n--) key = nextOccurrence('biweekly', key, 15)
  for (; n < 0; n++) key = key.endsWith('-15') ? monthEnd(addMonths(monthOf(key), -1)) : `${monthOf(key)}-15`
  return key
}

export function periodRange(c: PayCycle, key: PeriodKey): { from: ISODate; to: ISODate } {
  return { from: periodStart(c, key), to: addDays(periodStart(c, shiftPeriod(c, key, 1)), -1) }
}

function nominalKey(c: PayCycle, date: ISODate): PeriodKey {
  const f = freqOf(c)
  if (f === 'monthly') return monthOf(date)
  if (f === 'weekly') return addDays(date, -((weekday(date) - (c.weekday ?? DEFAULT_WEEKDAY) + 7) % 7))
  if (date === monthEnd(monthOf(date))) return date
  return Number(date.slice(8, 10)) >= 15 ? `${monthOf(date)}-15` : monthEnd(addMonths(monthOf(date), -1))
}

/** El periodo al que pertenece una fecha. */
export function periodOf(c: PayCycle, date: ISODate): PeriodKey {
  let k = nominalKey(c, date)
  while (date < periodStart(c, k)) k = shiftPeriod(c, k, -1)
  while (date >= periodStart(c, shiftPeriod(c, k, 1))) k = shiftPeriod(c, k, 1)
  return k
}

/** "Noviembre 2026", "Quincena del 15 nov" o "Semana del 13 nov". */
export function periodTitle(c: PayCycle, key: PeriodKey): string {
  const f = freqOf(c)
  if (f === 'monthly') return monthLabel(key)
  return `${f === 'weekly' ? 'Semana' : 'Quincena'} del ${shortDate(periodStart(c, key))}`
}

const inPeriod = (date: ISODate, r: { from: ISODate; to: ISODate }) => date >= r.from && date <= r.to

/** Presupuesto vigente en un mes: el más reciente con fromMonth ≤ mes. 0 o sin registro = no hay. */
export function budgetFor(budgets: Budget[], categoryId: string, month: MonthKey): Cents | null {
  let best: Budget | null = null
  for (const b of budgets) {
    if (b.categoryId !== categoryId || b.fromMonth > month) continue
    if (!best || b.fromMonth > best.fromMonth) best = b
  }
  return best && best.amount > 0 ? best.amount : null
}

export function monthTotals(txs: Transaction[], month: MonthKey, cycle = CALENDAR) {
  const r = periodRange(cycle, month)
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (!inPeriod(t.date, r)) continue
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  }
  return { income, expense, balance: income - expense }
}

export function spentByCategory(txs: Transaction[], month: MonthKey, cycle = CALENDAR): Map<string, Cents> {
  const r = periodRange(cycle, month)
  const m = new Map<string, Cents>()
  for (const t of txs) {
    if (t.type !== 'expense' || !inPeriod(t.date, r)) continue
    const k = t.categoryId ?? '__none__'
    m.set(k, (m.get(k) ?? 0) + t.amount)
  }
  return m
}

/** Ahorro del mes = abonos netos a metas + transferencias hacia cuentas de ahorro (desde otras cuentas). */
export function monthSavings(txs: Transaction[], contributions: GoalContribution[], accounts: Account[], month: MonthKey, cycle = CALENDAR): Cents {
  const r = periodRange(cycle, month)
  const savings = new Set(accounts.filter((a) => a.type === 'savings').map((a) => a.id))
  let total = 0
  for (const c of contributions) if (inPeriod(c.date, r)) total += c.amount
  for (const t of txs) {
    if (t.type !== 'transfer' || !inPeriod(t.date, r)) continue
    const toSav = t.toAccountId && savings.has(t.toAccountId)
    const fromSav = t.accountId && savings.has(t.accountId)
    if (toSav && !fromSav) total += t.amount
    if (fromSav && !toSav) total -= t.amount
  }
  return total
}

export interface BudgetLine {
  category: Category
  budget: Cents
  spent: Cents
  pct: number
  level: Level
  remaining: Cents
}

export function categoryBudgetLines(categories: Category[], budgets: Budget[], spent: Map<string, Cents>, month: MonthKey): BudgetLine[] {
  const out: BudgetLine[] = []
  for (const c of categories) {
    if (c.kind !== 'expense') continue
    const b = budgetFor(budgets, c.id, month)
    if (b === null) continue
    const s = spent.get(c.id) ?? 0
    const pct = (s / b) * 100
    out.push({ category: c, budget: b, spent: s, pct, level: levelFor(pct), remaining: b - s })
  }
  // Las más urgentes primero
  return out.sort((a, b) => b.pct - a.pct)
}

export interface TotalBudget {
  budget: Cents
  /** true si no hay total explícito y se usa la suma de las categorías */
  implicit: boolean
  spent: Cents
  pct: number
  level: Level
  remaining: Cents
  /** Fracción del mes transcurrida (0–100) */
  elapsedPct: number
  daysLeft: number
  /** Cuánto puedes gastar por día lo que resta del mes */
  perDay: Cents | null
  pace: 'ahead' | 'on' | 'under'
}

export function totalBudget(
  budgets: Budget[],
  categories: Category[],
  totalSpent: Cents,
  month: MonthKey,
  today = todayISO(),
  cycle = CALENDAR,
): TotalBudget | null {
  let budget = budgetFor(budgets, 'total', month)
  let implicit = false
  if (budget === null) {
    let sum = 0
    for (const c of categories) if (c.kind === 'expense') sum += budgetFor(budgets, c.id, month) ?? 0
    if (sum === 0) return null
    budget = sum
    implicit = true
  }
  const r = periodRange(cycle, month)
  const days = daysBetween(r.from, r.to) + 1
  const isCurrent = inPeriod(today, r)
  const isPast = today > r.to
  const dayOfPeriod = isCurrent ? daysBetween(r.from, today) + 1 : isPast ? days : 0
  const elapsedPct = (dayOfPeriod / days) * 100
  const daysLeft = isCurrent ? daysBetween(today, r.to) + 1 : isPast ? 0 : days
  const pct = (totalSpent / budget) * 100
  const remaining = budget - totalSpent
  const perDay = daysLeft > 0 && remaining > 0 ? Math.floor(remaining / daysLeft) : null
  const pace = pct > elapsedPct + 8 ? 'ahead' : pct < elapsedPct - 8 ? 'under' : 'on'
  return { budget, implicit, spent: totalSpent, pct, level: levelFor(pct), remaining, elapsedPct, daysLeft, perDay, pace }
}

/** Promedio mensual gastado en una categoría (o total) en los N meses anteriores al mes dado. */
export function averageSpent(txs: Transaction[], categoryId: string | 'total', month: MonthKey, months = 3, cycle = CALENDAR): Cents {
  const from = new Set<string>()
  for (let i = 1; i <= months; i++) from.add(shiftPeriod(cycle, month, -i))
  let sum = 0
  const seen = new Set<string>()
  for (const t of txs) {
    if (t.type !== 'expense') continue
    const mk = periodOf(cycle, t.date)
    if (!from.has(mk)) continue
    if (categoryId !== 'total' && t.categoryId !== categoryId) continue
    sum += t.amount
    seen.add(mk)
  }
  return seen.size ? Math.round(sum / seen.size) : 0
}
