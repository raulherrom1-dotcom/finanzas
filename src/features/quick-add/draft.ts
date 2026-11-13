import type { ISODate } from '../../lib/dates'
import type { PaymentMethod, TxType } from '../../db/types'
import { readLocal, writeLocal } from '../../lib/storage'
import { profileKey } from '../../lib/profiles'

// Borrador del registro rápido: se guarda en cada tecla para no perder nada si se cierra la app.

export interface Draft {
  type: TxType
  amount: string
  categoryId?: string
  accountId?: string
  toAccountId?: string
  date: ISODate
  method?: PaymentMethod
  note: string
}

const KEY = profileKey('quickAddDraft')
const LAST_ACCOUNT = profileKey('lastAccountId')

export function loadDraft(): Draft | null {
  return readLocal<Draft | null>(KEY, null)
}

export function saveDraft(d: Draft) {
  writeLocal(KEY, d)
}

export function clearDraft() {
  writeLocal(KEY, undefined)
}

export function isDraftEmpty(d: Draft): boolean {
  return (d.amount === '' || d.amount === '0') && !d.note.trim()
}

export function getLastAccountId(): string | undefined {
  return readLocal<string | undefined>(LAST_ACCOUNT, undefined)
}

export function setLastAccountId(id: string | undefined) {
  writeLocal(LAST_ACCOUNT, id)
}
