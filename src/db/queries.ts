import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { Account, Category, Goal, GoalContribution, Recurring, Transaction, Budget } from './types'
import type { ISODate } from '../lib/dates'

// Hooks de lectura reactiva: la UI se actualiza sola cuando cambian los datos.
// Son pocos datos (un uso personal), así que se leen tablas completas y se filtra en memoria.

const EMPTY: never[] = []

export function useAccounts(opts: { includeArchived?: boolean } = {}): Account[] {
  const all = useLiveQuery(() => db.accounts.orderBy('order').toArray(), []) ?? EMPTY
  return opts.includeArchived ? all : all.filter((a) => !a.archived)
}

export function useAccountsLoaded(): Account[] | undefined {
  return useLiveQuery(() => db.accounts.orderBy('order').toArray(), [])
}

export function useCategories(opts: { includeArchived?: boolean } = {}): Category[] {
  const all = useLiveQuery(() => db.categories.orderBy('order').toArray(), []) ?? EMPTY
  return opts.includeArchived ? all : all.filter((c) => !c.archived)
}

export function useAllTransactions(): Transaction[] | undefined {
  return useLiveQuery(() => db.transactions.toArray(), [])
}

export function useTransactionsBetween(from: ISODate, to: ISODate): Transaction[] | undefined {
  return useLiveQuery(() => db.transactions.where('date').between(from, to, true, true).toArray(), [from, to])
}

export function useTransaction(id: string | undefined): Transaction | undefined {
  return useLiveQuery(() => (id ? db.transactions.get(id) : undefined), [id])
}

export function useBudgets(): Budget[] {
  return useLiveQuery(() => db.budgets.toArray(), []) ?? EMPTY
}

export function useRecurring(): Recurring[] {
  return useLiveQuery(() => db.recurring.toArray(), []) ?? EMPTY
}

export function useGoals(): Goal[] {
  return useLiveQuery(() => db.goals.toArray(), []) ?? EMPTY
}

export function useGoalContributions(): GoalContribution[] {
  return useLiveQuery(() => db.goalContributions.toArray(), []) ?? EMPTY
}

/** Mapa id → elemento, para buscar rápido categorías o cuentas. */
export function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((i) => [i.id, i]))
}
