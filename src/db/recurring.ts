import Dexie from 'dexie'
import { db, newId, setSetting } from './db'
import type { Account, Frequency, PaymentMethod, Recurring, Transaction } from './types'
import { todayISO, type ISODate } from '../lib/dates'
import { dueDates, firstOccurrence, nextOccurrence } from '../lib/recurrence'

function methodFor(a: Account | undefined): PaymentMethod | undefined {
  if (!a) return undefined
  return a.type === 'cash' ? 'cash' : a.type === 'credit' ? 'credit' : a.type === 'debit' ? 'debit' : 'transfer'
}

/** Id fijo por recurrente y fecha: así nunca se duplica aunque se ejecute dos veces. */
export function recurringTxId(recId: string, date: ISODate) {
  return `rec:${recId}:${date}`
}

/**
 * Genera los movimientos recurrentes pendientes hasta hoy, aunque haya pasado mucho tiempo
 * sin abrir la app. Devuelve cuántos se crearon.
 */
export async function runRecurring(today: ISODate = todayISO()): Promise<number> {
  let created = 0
  await db.transaction('rw', [db.recurring, db.transactions, db.accounts], async () => {
    const due = await db.recurring.where('nextDate').belowOrEqual(today).toArray()
    for (const r of due) {
      if (!r.active) continue
      const { dates, nextDate } = dueDates(r, today)
      const account = r.accountId ? await db.accounts.get(r.accountId) : undefined
      for (const date of dates) {
        const id = recurringTxId(r.id, date)
        if (await db.transactions.get(id)) continue
        const now = Date.now()
        const tx: Transaction = {
          id,
          type: r.type,
          amount: r.amount,
          date,
          categoryId: r.type === 'transfer' ? undefined : r.categoryId,
          accountId: r.accountId,
          toAccountId: r.type === 'transfer' ? r.toAccountId : undefined,
          method: r.type === 'transfer' ? undefined : methodFor(account),
          note: r.note || r.name,
          recurringId: r.id,
          createdAt: now,
          updatedAt: now,
          ...(r.sample ? { sample: true } : {}),
        }
        for (const k of Object.keys(tx) as Array<keyof Transaction>) if (tx[k] === undefined) delete tx[k]
        try {
          await db.transactions.add(tx)
          created++
        } catch (e) {
          if (!(e instanceof Dexie.ConstraintError)) throw e
        }
      }
      await db.recurring.update(r.id, { nextDate })
    }
  })
  await setSetting('lastRecurringRun', Date.now())
  return created
}

/**
 * Próxima fecha al crear o reprogramar un recurrente. Al editar no se rellenan fechas pasadas:
 * se empieza en hoy o después, y nunca antes de la última fecha ya registrada.
 */
export function scheduleNext(freq: Frequency, startDate: ISODate, opts: { from?: ISODate; after?: ISODate } = {}): ISODate {
  const anchor = Number(startDate.slice(8, 10))
  let d = firstOccurrence(freq, startDate)
  let guard = 0
  while (((opts.from && d < opts.from) || (opts.after && d <= opts.after)) && guard++ < 2000) d = nextOccurrence(freq, d, anchor)
  return d
}

export type RecurringInput = Omit<Recurring, 'id' | 'nextDate' | 'createdAt'> & { id?: string }

export async function saveRecurring(input: RecurringInput): Promise<string> {
  const clean = { ...input }
  if (clean.type === 'transfer') delete clean.categoryId
  else delete clean.toAccountId
  if (!clean.note?.trim()) delete clean.note
  if (!clean.endDate) delete clean.endDate

  if (clean.id) {
    const prev = await db.recurring.get(clean.id)
    if (!prev) return clean.id
    let nextDate = prev.nextDate
    if (prev.frequency !== clean.frequency || prev.startDate !== clean.startDate) {
      const last = await db.transactions.where('recurringId').equals(clean.id).reverse().sortBy('date')
      nextDate = scheduleNext(clean.frequency, clean.startDate, { from: todayISO(), after: last[0]?.date })
    }
    await db.recurring.put({ ...prev, ...(clean as Recurring), id: clean.id, nextDate })
    return clean.id
  }
  const id = newId()
  await db.recurring.add({ ...(clean as Recurring), id, nextDate: firstOccurrence(clean.frequency, clean.startDate), createdAt: Date.now() })
  return id
}

export function deleteRecurring(id: string) {
  return db.recurring.delete(id)
}

export function setRecurringActive(id: string, active: boolean) {
  return db.recurring.update(id, { active })
}
