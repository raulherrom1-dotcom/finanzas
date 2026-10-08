import { ArrowLeftRight, Repeat } from 'lucide-react'
import type { Account, Category, Transaction } from '../db/types'
import { CategoryIcon } from './ui/CategoryIcon'
import { Amount } from './ui/Amount'
import { useApp } from '../state/app'

/** Una fila de movimiento. Al tocarla se abre para editar. */
export function TxRow({
  tx,
  category,
  account,
  toAccount,
  showDate,
}: {
  tx: Transaction
  category?: Category
  account?: Account
  toAccount?: Account
  showDate?: string
}) {
  const { openQuickAdd } = useApp()
  const isTransfer = tx.type === 'transfer'

  const title = tx.note || (isTransfer ? 'Transferencia' : category?.name ?? 'Sin categoría')
  const parts: string[] = []
  if (isTransfer) parts.push(`${account?.name ?? 'Sin cuenta'} → ${toAccount?.name ?? 'Sin cuenta'}`)
  else {
    if (tx.note && category) parts.push(category.name)
    if (account) parts.push(account.name)
  }
  if (showDate) parts.push(showDate)

  return (
    <button type="button" onClick={() => openQuickAdd({ editId: tx.id })} className="flex min-h-16 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left active:bg-surface">
      {isTransfer ? (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-press">
          <ArrowLeftRight size={20} strokeWidth={2.2} />
        </span>
      ) : (
        <CategoryIcon icon={category?.icon} color={category?.color} size={44} />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span className="truncate text-base font-bold">{title}</span>
          {tx.recurringId && <Repeat size={14} strokeWidth={2.4} className="shrink-0 text-muted" aria-label="Recurrente" />}
        </span>
        {parts.length > 0 && <span className="block truncate text-sm text-muted">{parts.join(', ')}</span>}
      </span>
      <Amount
        cents={tx.type === 'expense' ? -tx.amount : tx.amount}
        sign={tx.type === 'income'}
        tone={tx.type === 'income' ? 'pos' : isTransfer ? 'muted' : 'ink'}
        className="text-base font-extrabold"
      />
    </button>
  )
}
