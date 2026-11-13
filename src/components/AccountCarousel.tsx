import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Amount, useMoney } from './ui/Amount'
import { getIcon } from '../lib/icons'
import { ACCOUNT_ICON } from '../db/defaults'
import { ACCOUNT_TYPE_LABEL, type Account, type Cents, type Transaction } from '../db/types'
import { cardStatus } from '../lib/balances'
import { relativeDays, shortDate, type ISODate } from '../lib/dates'
import { navigate } from '../lib/router'
import { openMovimientos } from '../screens/Movimientos'
import { cn } from '../lib/cn'

/**
 * Cuentas como tarjetas bancarias que se deslizan de lado. El color de la cuenta se oscurece al 55%
 * con tinta para que el texto blanco mida ≥4.5:1 con toda la paleta (medido).
 */
function cardBackground(color: string) {
  return `linear-gradient(135deg, color-mix(in srgb, ${color} 55%, #0F1B3D) 0%, color-mix(in srgb, ${color} 30%, #0F1B3D) 100%)`
}

export function AccountCarousel({ accounts, balances, txs, today }: { accounts: Account[]; balances: Map<string, Cents>; txs: Transaction[]; today: ISODate }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const count = accounts.length + 1 // + tarjeta "Agregar cuenta"

  const onScroll = () => {
    const el = scroller.current
    const first = el?.firstElementChild as HTMLElement | null
    if (!el || !first) return
    setIndex(Math.min(count - 1, Math.round(el.scrollLeft / (first.offsetWidth + 12))))
  }

  return (
    <div>
      <div ref={scroller} onScroll={onScroll} className="scroll-x flex snap-x snap-mandatory gap-3 scroll-px-4 px-4 pt-1 pb-7" aria-label="Tus cuentas" role="list">
        {accounts.map((a) => (
          <AccountCard key={a.id} account={a} balance={balances.get(a.id) ?? 0} txs={txs} today={today} />
        ))}
        <button
          type="button"
          role="listitem"
          onClick={() => navigate('/ajustes/cuentas')}
          className="flex aspect-[1.586] w-[78%] max-w-[300px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-line bg-surface text-accent-press active:bg-accent-soft"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft">
            <Plus size={24} strokeWidth={2.4} />
          </span>
          <span className="text-base font-bold">Agregar cuenta</span>
        </button>
      </div>
      <div className="-mt-3 flex justify-center gap-1.5" aria-hidden>
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className={cn('h-1.5 rounded-full transition-[width,background-color] duration-300', i === index ? 'w-5 bg-accent' : 'w-1.5 bg-line')} />
        ))}
      </div>
    </div>
  )
}

function AccountCard({ account: a, balance, txs, today }: { account: Account; balance: Cents; txs: Transaction[]; today: ISODate }) {
  const money = useMoney()
  const Icon = getIcon(ACCOUNT_ICON[a.type])
  const credit = a.type === 'credit'
  const st = credit ? cardStatus(a, txs, today) : null
  const due = st && st.level !== 'none' && st.level !== 'ok'

  return (
    <button
      type="button"
      role="listitem"
      onClick={() => openMovimientos({ accountIds: [a.id] })}
      aria-label={`${a.name}. Ver sus movimientos`}
      className="relative flex aspect-[1.586] w-[78%] max-w-[300px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[22px] p-5 text-left text-white transition-transform duration-150 active:scale-[0.98]"
      style={{ background: cardBackground(a.color), boxShadow: `0 10px 18px -4px color-mix(in srgb, ${a.color} 40%, transparent)` }}
    >
      {/* Círculos decorativos, lejos del texto */}
      <span className="pointer-events-none absolute -right-10 -bottom-16 size-44 rounded-full border-[18px] border-white/[0.07]" aria-hidden />
      <span className="pointer-events-none absolute -right-2 -bottom-6 size-20 rounded-full border-[10px] border-white/[0.06]" aria-hidden />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{a.name}</p>
          {a.name !== ACCOUNT_TYPE_LABEL[a.type] && <p className="text-xs font-semibold text-white/95">{ACCOUNT_TYPE_LABEL[a.type]}</p>}
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15" aria-hidden>
          <Icon size={20} strokeWidth={2.2} />
        </span>
      </div>

      <div className="relative">
        <p className="text-xs font-semibold text-white/95">{credit ? 'Debes' : 'Saldo'}</p>
        <Amount cents={credit ? Math.max(0, -balance) : balance} proportional className="block text-[30px] leading-9 font-extrabold tracking-tight" />
        {due ? (
          <p className="mt-1.5 inline-flex rounded-full bg-black/25 px-2.5 py-1 text-xs font-semibold ring-1 ring-white/25 ring-inset">
            Paga {money(st.remainingToPay)} {st.level === 'overdue' ? `· venció ${relativeDays(st.dueDate, today)}` : `antes del ${shortDate(st.dueDate)}`}
          </p>
        ) : st?.available != null && a.creditLimit ? (
          <p className="mt-1 text-xs font-semibold text-white/95">Disponible {money(st.available)}</p>
        ) : null}
      </div>
    </button>
  )
}
