import { db, newId } from './db'
import type { Account, Category, Transaction } from './types'

// Escrituras. Todas validan lo mínimo para no guardar datos rotos.

export type TxInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

export function cleanTx(input: TxInput): TxInput {
  const t: TxInput = { ...input, amount: Math.abs(Math.round(input.amount)) }
  if (t.type === 'transfer') {
    delete t.categoryId
  } else {
    delete t.toAccountId
  }
  if (!t.note?.trim()) delete t.note
  else t.note = t.note.trim()
  if (!t.accountId) delete t.accountId
  if (!t.method) delete t.method
  return t
}

export async function saveTransaction(input: TxInput): Promise<string> {
  const t = cleanTx(input)
  const now = Date.now()
  if (t.id) {
    const prev = await db.transactions.get(t.id)
    const row: Transaction = { ...(t as Transaction), createdAt: prev?.createdAt ?? now, updatedAt: now }
    // put reemplaza el registro completo: los campos quitados (nota, cuenta) se borran de verdad
    await db.transactions.put(row)
    return t.id
  }
  const id = newId()
  await db.transactions.add({ ...(t as Transaction), id, createdAt: now, updatedAt: now })
  return id
}

export async function deleteTransaction(id: string): Promise<Transaction | undefined> {
  const prev = await db.transactions.get(id)
  await db.transactions.delete(id)
  return prev
}

export async function restoreTransaction(tx: Transaction) {
  await db.transactions.put(tx)
}

// ---- Cuentas ----

export async function saveAccount(input: Omit<Account, 'id' | 'createdAt' | 'order' | 'archived'> & Partial<Pick<Account, 'id' | 'order' | 'archived'>>) {
  if (input.id) {
    const prev = await db.accounts.get(input.id)
    if (!prev) return input.id
    const row: Account = { ...prev, ...input, id: input.id }
    if (row.type !== 'credit') {
      delete row.creditLimit
      delete row.cutoffDay
      delete row.dueDay
    }
    await db.accounts.put(row)
    return input.id
  }
  const count = await db.accounts.count()
  const id = newId()
  await db.accounts.add({ ...input, id, order: count, archived: false, createdAt: Date.now() })
  return id
}

export async function accountUsage(id: string): Promise<number> {
  const [a, b] = await Promise.all([db.transactions.where('accountId').equals(id).count(), db.transactions.where('toAccountId').equals(id).count()])
  return a + b
}

/** Si la cuenta tiene movimientos se archiva (para no romper el historial); si no, se borra. */
export async function removeAccount(id: string): Promise<'archived' | 'deleted'> {
  if ((await accountUsage(id)) > 0) {
    await db.accounts.update(id, { archived: true })
    return 'archived'
  }
  await db.accounts.delete(id)
  return 'deleted'
}

export function setAccountArchived(id: string, archived: boolean) {
  return db.accounts.update(id, { archived })
}

// ---- Categorías ----

export async function saveCategory(input: Omit<Category, 'id' | 'order' | 'archived'> & Partial<Pick<Category, 'id' | 'order' | 'archived'>>) {
  if (input.id) {
    const prev = await db.categories.get(input.id)
    if (!prev) return input.id
    await db.categories.put({ ...prev, ...input, id: input.id })
    return input.id
  }
  const count = await db.categories.count()
  const id = newId()
  await db.categories.add({ ...input, id, order: count, archived: false })
  return id
}

export function setCategoryArchived(id: string, archived: boolean) {
  return db.categories.update(id, { archived })
}

export async function categoryUsage(id: string): Promise<number> {
  return db.transactions.where('categoryId').equals(id).count()
}
