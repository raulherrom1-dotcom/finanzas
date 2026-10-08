import type { Account, Cents, Recurring, Transaction, TxType } from '../db/types'
import { cardStatus, type CardLevel } from './balances'
import { addDays, type ISODate } from './dates'
import { upcoming } from './recurrence'

export interface UpcomingItem {
  key: string
  date: ISODate
  name: string
  amount: Cents
  type: TxType
  kind: 'recurring' | 'card'
  categoryId?: string
  account?: Account
  level?: CardLevel
}

/** Próximos pagos (y cobros) recurrentes más los pagos de tarjetas de crédito. */
export function upcomingPayments(recurring: Recurring[], accounts: Account[], txs: Transaction[], today: ISODate, days = 14): UpcomingItem[] {
  const until = addDays(today, days)
  const byId = new Map(accounts.map((a) => [a.id, a]))
  const items: UpcomingItem[] = []
  for (const r of recurring) {
    if (!r.active) continue
    for (const date of upcoming(r, until)) {
      if (date < today) continue
      items.push({ key: `${r.id}:${date}`, date, name: r.name, amount: r.amount, type: r.type, kind: 'recurring', categoryId: r.categoryId, account: r.accountId ? byId.get(r.accountId) : undefined })
    }
  }
  for (const a of accounts) {
    if (a.archived) continue
    const st = cardStatus(a, txs, today)
    if (!st || st.remainingToPay <= 0 || st.dueDate > until) continue
    items.push({ key: `card:${a.id}`, date: st.dueDate, name: `Pago de ${a.name}`, amount: st.remainingToPay, type: 'transfer', kind: 'card', account: a, level: st.level })
  }
  return items.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0))
}
