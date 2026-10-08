import type { Account, Category, Transaction, TxType } from '../db/types'
import { addMonths, currentMonth, monthEnd, monthLabel, monthStart, shortDate, todayISO, type ISODate, type MonthKey } from './dates'
import { centsToInput } from './money'
import { normalize } from './search'

export type Period = { kind: 'month'; month: MonthKey } | { kind: 'range'; from: ISODate; to: ISODate } | { kind: 'all' }

export interface TxFilters {
  q: string
  period: Period
  type: 'all' | TxType
  categoryIds: string[]
  accountIds: string[]
}

export const DEFAULT_FILTERS: TxFilters = {
  q: '',
  period: { kind: 'month', month: currentMonth() },
  type: 'all',
  categoryIds: [],
  accountIds: [],
}

export function periodRange(p: Period): { from: ISODate; to: ISODate } {
  if (p.kind === 'month') return { from: monthStart(p.month), to: monthEnd(p.month) }
  if (p.kind === 'range') return { from: p.from, to: p.to }
  return { from: '0000-01-01', to: '9999-12-31' }
}

export function periodLabel(p: Period): string {
  if (p.kind === 'month') return monthLabel(p.month)
  if (p.kind === 'all') return 'Todas las fechas'
  const sameYear = p.from.slice(0, 4) === p.to.slice(0, 4)
  return `${shortDate(p.from)}${sameYear ? '' : ` ${p.from.slice(0, 4)}`} al ${shortDate(p.to)} ${p.to.slice(0, 4)}`
}

export function presetPeriods(today = todayISO()): Array<{ label: string; period: Period }> {
  const m = today.slice(0, 7)
  return [
    { label: 'Este mes', period: { kind: 'month', month: m } },
    { label: 'Mes pasado', period: { kind: 'month', month: addMonths(m, -1) } },
    { label: 'Últimos 3 meses', period: { kind: 'range', from: monthStart(addMonths(m, -2)), to: today } },
    { label: 'Este año', period: { kind: 'range', from: `${m.slice(0, 4)}-01-01`, to: `${m.slice(0, 4)}-12-31` } },
    { label: 'Todo', period: { kind: 'all' } },
  ]
}

export function samePeriod(a: Period, b: Period): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function activeFilterCount(f: TxFilters): number {
  return (f.type !== 'all' ? 1 : 0) + (f.categoryIds.length ? 1 : 0) + (f.accountIds.length ? 1 : 0)
}

/** Aplica búsqueda y filtros. Ordena del más reciente al más antiguo. */
export function filterTransactions(
  txs: Transaction[],
  f: TxFilters,
  cats: Map<string, Category>,
  accs: Map<string, Account>,
): Transaction[] {
  const { from, to } = periodRange(f.period)
  const q = normalize(f.q)
  const cset = new Set(f.categoryIds)
  const aset = new Set(f.accountIds)

  const out = txs.filter((t) => {
    if (t.date < from || t.date > to) return false
    if (f.type !== 'all' && t.type !== f.type) return false
    if (cset.size && !(t.categoryId && cset.has(t.categoryId))) return false
    if (aset.size && !((t.accountId && aset.has(t.accountId)) || (t.toAccountId && aset.has(t.toAccountId)))) return false
    if (q) {
      const hay = normalize(
        [
          t.note ?? '',
          t.categoryId ? (cats.get(t.categoryId)?.name ?? '') : '',
          t.accountId ? (accs.get(t.accountId)?.name ?? '') : '',
          t.toAccountId ? (accs.get(t.toAccountId)?.name ?? '') : '',
          t.type === 'transfer' ? 'transferencia' : '',
          centsToInput(t.amount),
        ].join(' '),
      )
      if (!q.split(/\s+/).every((w) => hay.includes(w.replace(/[$,]/g, '')))) return false
    }
    return true
  })
  return out.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))
}

export function groupByDay(txs: Transaction[]): Array<{ date: ISODate; items: Transaction[]; net: number }> {
  const groups: Array<{ date: ISODate; items: Transaction[]; net: number }> = []
  for (const t of txs) {
    let g = groups[groups.length - 1]
    if (!g || g.date !== t.date) {
      g = { date: t.date, items: [], net: 0 }
      groups.push(g)
    }
    g.items.push(t)
    if (t.type === 'income') g.net += t.amount
    if (t.type === 'expense') g.net -= t.amount
  }
  return groups
}

export function totals(txs: Transaction[]): { income: number; expense: number } {
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  }
  return { income, expense }
}
