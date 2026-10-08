import { useMemo, useState } from 'react'
import { ChevronDown, Plus, RotateCcw } from 'lucide-react'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Button, IconButton } from '../../components/ui/Button'
import { Amount } from '../../components/ui/Amount'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { ProgressBar } from '../../components/ui/Progress'
import { CardDue } from '../../components/CardDue'
import { AccountSheet } from './AccountSheet'
import { useAccounts, useAllTransactions } from '../../db/queries'
import { setAccountArchived } from '../../db/actions'
import { ACCOUNT_ICON } from '../../db/defaults'
import { ACCOUNT_TYPE_LABEL, type Account } from '../../db/types'
import { cardStatus, computeBalances } from '../../lib/balances'
import { todayISO } from '../../lib/dates'
import { cn } from '../../lib/cn'
import { useMoney } from '../../components/ui/Amount'

export function Cuentas() {
  const all = useAccounts({ includeArchived: true })
  const txs = useAllTransactions() ?? []
  const today = todayISO()
  const money = useMoney()
  const [editing, setEditing] = useState<Account | 'new' | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const balances = useMemo(() => computeBalances(all, txs), [all, txs])
  const active = all.filter((a) => !a.archived)
  const archived = all.filter((a) => a.archived)

  let assets = 0
  let debt = 0
  for (const a of active) {
    const b = balances.get(a.id) ?? 0
    if (a.type === 'credit') debt += Math.max(0, -b)
    else assets += b
  }

  return (
    <>
      <ScreenHeader
        title="Cuentas"
        back="/ajustes"
        right={
          <IconButton label="Agregar cuenta" tone="soft" onClick={() => setEditing('new')}>
            <Plus size={22} strokeWidth={2.4} />
          </IconButton>
        }
      />

      <div className="px-4">
        <div className="card mb-5 grid grid-cols-2 divide-x divide-line p-0">
          <div className="p-4">
            <p className="text-sm text-muted">Tienes</p>
            <Amount cents={assets} className="text-lg font-extrabold" />
          </div>
          <div className="p-4">
            <p className="text-sm text-muted">Debes en tarjetas</p>
            <Amount cents={debt} className="text-lg font-extrabold" tone={debt > 0 ? 'neg' : 'ink'} />
          </div>
        </div>

        <ul className="space-y-3">
          {active.map((a) => {
            const bal = balances.get(a.id) ?? 0
            const st = cardStatus(a, txs, today)
            return (
              <li key={a.id}>
                <button type="button" onClick={() => setEditing(a)} className="card w-full p-4 text-left active:bg-accent-soft">
                  <div className="flex items-center gap-3">
                    <CategoryIcon icon={ACCOUNT_ICON[a.type]} color={a.color} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold">{a.name}</p>
                      {a.name !== ACCOUNT_TYPE_LABEL[a.type] && <p className="text-sm text-muted">{ACCOUNT_TYPE_LABEL[a.type]}</p>}
                    </div>
                    <div className="text-right">
                      {a.type === 'credit' && <p className="text-xs text-muted">Debes</p>}
                      <Amount
                        cents={a.type === 'credit' ? Math.max(0, -bal) : bal}
                        className="text-base font-extrabold"
                        tone={bal < 0 && a.type !== 'credit' ? 'neg' : 'ink'}
                      />
                    </div>
                  </div>
                  {st && (
                    <div className="mt-3 space-y-2">
                      {a.creditLimit ? (
                        <>
                          <ProgressBar pct={st.usedPct} thin />
                          <p className="text-xs text-muted">
                            Disponible {money(st.available ?? 0)} de {money(a.creditLimit)}
                          </p>
                        </>
                      ) : null}
                      <CardDue status={st} />
                    </div>
                  )}
                  {a.type === 'credit' && !st && <p className="mt-3 text-xs text-muted">Agrega día de corte y de pago para recibir avisos.</p>}
                </button>
              </li>
            )
          })}
        </ul>

        {active.length === 0 && (
          <Button block className="mt-2" onClick={() => setEditing('new')}>
            Agregar cuenta
          </Button>
        )}

        {archived.length > 0 && (
          <div className="mt-6">
            <button type="button" onClick={() => setShowArchived((s) => !s)} className="flex min-h-11 items-center gap-1 text-sm font-bold text-muted">
              Archivadas ({archived.length})
              <ChevronDown size={18} className={cn('transition-transform', showArchived && 'rotate-180')} />
            </button>
            {showArchived && (
              <ul className="mt-2 space-y-2">
                {archived.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-card border border-line px-4 py-3">
                    <CategoryIcon icon={ACCOUNT_ICON[a.type]} color="#94A3B8" size={36} />
                    <p className="min-w-0 flex-1 truncate font-semibold text-muted">{a.name}</p>
                    <Button size="sm" variant="secondary" icon={<RotateCcw size={16} />} onClick={() => setAccountArchived(a.id, false)}>
                      Restaurar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <AccountSheet
        open={editing !== null}
        account={editing && editing !== 'new' ? editing : undefined}
        currentBalance={editing && editing !== 'new' ? balances.get(editing.id) : undefined}
        onClose={() => setEditing(null)}
      />
    </>
  )
}
