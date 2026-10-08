import type { Account, Budget, Category, Cents, GoalContribution, Transaction } from '../db/types'
import { addMonths, currentMonth, daysBetween, monthDayCount, monthEnd, monthOf, todayISO, type MonthKey } from './dates'
import { levelFor, type Level } from './levels'

/** Presupuesto vigente en un mes: el más reciente con fromMonth ≤ mes. 0 o sin registro = no hay. */
export function budgetFor(budgets: Budget[], categoryId: string, month: MonthKey): Cents | null {
  let best: Budget | null = null
  for (const b of budgets) {
    if (b.categoryId !== categoryId || b.fromMonth > month) continue
    if (!best || b.fromMonth > best.fromMonth) best = b
  }
  return best && best.amount > 0 ? best.amount : null
}

export function monthTotals(txs: Transaction[], month: MonthKey) {
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (monthOf(t.date) !== month) continue
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  }
  return { income, expense, balance: income - expense }
}

export function spentByCategory(txs: Transaction[], month: MonthKey): Map<string, Cents> {
  const m = new Map<string, Cents>()
  for (const t of txs) {
    if (t.type !== 'expense' || monthOf(t.date) !== month) continue
    const k = t.categoryId ?? '__none__'
    m.set(k, (m.get(k) ?? 0) + t.amount)
  }
  return m
}

/** Ahorro del mes = abonos netos a metas + transferencias hacia cuentas de ahorro (desde otras cuentas). */
export function monthSavings(txs: Transaction[], contributions: GoalContribution[], accounts: Account[], month: MonthKey): Cents {
  const savings = new Set(accounts.filter((a) => a.type === 'savings').map((a) => a.id))
  let total = 0
  for (const c of contributions) if (monthOf(c.date) === month) total += c.amount
  for (const t of txs) {
    if (t.type !== 'transfer' || monthOf(t.date) !== month) continue
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
  const days = monthDayCount(month)
  const isCurrent = month === currentMonth()
  const isPast = month < monthOf(today)
  const dayOfMonth = isCurrent ? Number(today.slice(8, 10)) : isPast ? days : 0
  const elapsedPct = (dayOfMonth / days) * 100
  const daysLeft = isCurrent ? daysBetween(today, monthEnd(month)) + 1 : isPast ? 0 : days
  const pct = (totalSpent / budget) * 100
  const remaining = budget - totalSpent
  const perDay = daysLeft > 0 && remaining > 0 ? Math.floor(remaining / daysLeft) : null
  const pace = pct > elapsedPct + 8 ? 'ahead' : pct < elapsedPct - 8 ? 'under' : 'on'
  return { budget, implicit, spent: totalSpent, pct, level: levelFor(pct), remaining, elapsedPct, daysLeft, perDay, pace }
}

/** Promedio mensual gastado en una categoría (o total) en los N meses anteriores al mes dado. */
export function averageSpent(txs: Transaction[], categoryId: string | 'total', month: MonthKey, months = 3): Cents {
  const from = new Set<string>()
  for (let i = 1; i <= months; i++) from.add(addMonths(month, -i))
  let sum = 0
  const seen = new Set<string>()
  for (const t of txs) {
    if (t.type !== 'expense') continue
    const mk = monthOf(t.date)
    if (!from.has(mk)) continue
    if (categoryId !== 'total' && t.categoryId !== categoryId) continue
    sum += t.amount
    seen.add(mk)
  }
  return seen.size ? Math.round(sum / seen.size) : 0
}
