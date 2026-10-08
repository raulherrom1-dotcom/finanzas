import type { Account, Cents, ID, Transaction } from '../db/types'
import { addMonthsToDate, daysBetween, daysInMonth, makeISO, type ISODate } from './dates'

/** Efecto de un movimiento sobre el saldo de una cuenta. */
export function effectOn(accountId: ID, tx: Transaction): Cents {
  if (tx.type === 'income') return tx.accountId === accountId ? tx.amount : 0
  if (tx.type === 'expense') return tx.accountId === accountId ? -tx.amount : 0
  let d = 0
  if (tx.accountId === accountId) d -= tx.amount
  if (tx.toAccountId === accountId) d += tx.amount
  return d
}

/** Saldo actual de cada cuenta (saldo inicial + todos sus movimientos). */
export function computeBalances(accounts: Account[], txs: Transaction[], upTo?: ISODate): Map<ID, Cents> {
  const map = new Map<ID, Cents>(accounts.map((a) => [a.id, a.initialBalance]))
  for (const tx of txs) {
    if (upTo && tx.date > upTo) continue
    if (tx.accountId && map.has(tx.accountId)) map.set(tx.accountId, map.get(tx.accountId)! + effectOn(tx.accountId, tx))
    if (tx.type === 'transfer' && tx.toAccountId && tx.toAccountId !== tx.accountId && map.has(tx.toAccountId)) {
      map.set(tx.toAccountId, map.get(tx.toAccountId)! + tx.amount)
    }
  }
  return map
}

export function balanceOf(account: Account, txs: Transaction[], upTo?: ISODate): Cents {
  return computeBalances([account], txs, upTo).get(account.id) ?? account.initialBalance
}

/** Fecha con ese día del mes, recortada al último día si el mes es más corto. */
function dayInMonth(year: number, month: number, day: number): ISODate {
  return makeISO(year, month, Math.min(day, daysInMonth(year, month)))
}

export type CardLevel = 'none' | 'ok' | 'pending' | 'soon' | 'overdue'

export interface CardStatus {
  debt: Cents
  available: Cents | null
  usedPct: number
  lastCutoff: ISODate
  nextCutoff: ISODate
  dueDate: ISODate
  /** Deuda al último corte: lo que hay que pagar para no generar intereses. */
  statementBalance: Cents
  paidSinceCutoff: Cents
  remainingToPay: Cents
  daysToDue: number
  level: CardLevel
}

export const DUE_SOON_DAYS = 5

/**
 * Estado de una tarjeta de crédito: cuánto debes, cuánto pagar y para cuándo.
 * Pago para no generar intereses = deuda al último corte − pagos hechos después del corte.
 */
export function cardStatus(account: Account, txs: Transaction[], today: ISODate): CardStatus | null {
  if (account.type !== 'credit' || !account.cutoffDay || !account.dueDay) return null
  const [y, m, d] = today.split('-').map(Number)

  const thisMonthCutoff = dayInMonth(y, m, account.cutoffDay)
  const lastCutoff = d >= Number(thisMonthCutoff.slice(8)) ? thisMonthCutoff : addMonthsToDate(thisMonthCutoff, -1, account.cutoffDay)
  const nextCutoff = addMonthsToDate(lastCutoff, 1, account.cutoffDay)

  // La fecha límite es el primer día de pago después del corte.
  const [cy, cm] = lastCutoff.split('-').map(Number)
  let dueDate = dayInMonth(cy, cm, account.dueDay)
  if (dueDate <= lastCutoff) dueDate = addMonthsToDate(dueDate, 1, account.dueDay)

  const balance = balanceOf(account, txs)
  const debt = Math.max(0, -balance)
  const statementBalance = Math.max(0, -balanceOf(account, txs, lastCutoff))

  let paidSinceCutoff = 0
  for (const tx of txs) {
    if (tx.date <= lastCutoff || tx.date > today) continue
    if (tx.type === 'transfer' && tx.toAccountId === account.id) paidSinceCutoff += tx.amount
    if (tx.type === 'income' && tx.accountId === account.id) paidSinceCutoff += tx.amount
  }
  const remainingToPay = Math.max(0, statementBalance - paidSinceCutoff)
  const daysToDue = daysBetween(today, dueDate)

  let level: CardLevel = 'ok'
  if (debt === 0 && statementBalance === 0) level = 'none'
  else if (remainingToPay > 0 && daysToDue < 0) level = 'overdue'
  else if (remainingToPay > 0 && daysToDue <= DUE_SOON_DAYS) level = 'soon'
  else if (remainingToPay > 0) level = 'pending'

  const limit = account.creditLimit ?? 0
  return {
    debt,
    available: limit > 0 ? limit - debt : null,
    usedPct: limit > 0 ? Math.min(100, (debt / limit) * 100) : 0,
    lastCutoff,
    nextCutoff,
    dueDate,
    statementBalance,
    paidSinceCutoff,
    remainingToPay,
    daysToDue,
    level,
  }
}

/** Suma de saldos para "lo que tienes": cuentas positivas menos deudas de tarjetas. */
export function netWorth(accounts: Account[], balances: Map<ID, Cents>): Cents {
  let total = 0
  for (const a of accounts) if (!a.archived) total += balances.get(a.id) ?? 0
  return total
}
