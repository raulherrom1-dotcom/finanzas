import Dexie, { type EntityTable } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from './defaults'
import { activeProfile, dbNameFor } from '../lib/profiles'
import { CALENDAR, type PayCycle } from '../lib/budget'
import type { Account, Budget, Category, Goal, GoalContribution, Recurring, Setting, Transaction } from './types'

class FinanzasDB extends Dexie {
  accounts!: EntityTable<Account, 'id'>
  categories!: EntityTable<Category, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  budgets!: EntityTable<Budget, 'id'>
  recurring!: EntityTable<Recurring, 'id'>
  goals!: EntityTable<Goal, 'id'>
  goalContributions!: EntityTable<GoalContribution, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super(dbNameFor(activeProfile().id))
    this.version(1).stores({
      accounts: 'id, order',
      categories: 'id, kind, order',
      transactions: 'id, date, type, categoryId, accountId, toAccountId, recurringId, importHash',
      budgets: 'id, categoryId, fromMonth',
      recurring: 'id, nextDate',
      goals: 'id',
      goalContributions: 'id, goalId, date',
      settings: 'key',
    })

    // Primera vez que se abre la app: categorías y cuenta de efectivo por defecto.
    this.on('populate', async (tx) => {
      const now = Date.now()
      await tx.table('categories').bulkAdd(DEFAULT_CATEGORIES)
      await tx.table('accounts').bulkAdd(DEFAULT_ACCOUNTS.map((a) => ({ ...a, createdAt: now })))
    })
  }
}

export const db = new FinanzasDB()

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// ---- Ajustes (clave/valor) ----

export type SettingKey = 'userName' | 'payCycle' | 'lastBackupAt' | 'backupReminderSnoozedUntil' | 'lastRecurringRun' | 'firstOpenedAt'

export async function getSetting<T>(key: SettingKey, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row === undefined ? fallback : (row.value as T)
}

export function setSetting(key: SettingKey, value: unknown) {
  return db.settings.put({ key, value })
}

export function useSetting<T>(key: SettingKey, fallback: T): T {
  return useLiveQuery(async () => {
    const row = await db.settings.get(key)
    return row === undefined ? fallback : (row.value as T)
  }, [key], fallback) as T
}

/** Día de pago y fechas en que empezó cada periodo del presupuesto. */
export function usePayCycle(): PayCycle {
  return useSetting<PayCycle>('payCycle', CALENDAR)
}
