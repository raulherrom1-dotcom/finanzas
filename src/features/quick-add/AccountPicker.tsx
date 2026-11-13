import { Check, CircleOff } from 'lucide-react'
import { Sheet } from '../../components/ui/Sheet'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Amount } from '../../components/ui/Amount'
import { Segmented } from '../../components/ui/Form'
import { ACCOUNT_ICON } from '../../db/defaults'
import { ACCOUNT_TYPE_LABEL, METHOD_LABEL, type Account, type PaymentMethod } from '../../db/types'
import { cn } from '../../lib/cn'

const METHODS: PaymentMethod[] = ['cash', 'debit', 'credit', 'transfer', 'other']
const METHOD_SHORT: Record<PaymentMethod, string> = { cash: 'Efectivo', debit: 'Débito', credit: 'Crédito', transfer: 'Transf.', other: 'Otro' }

export function methodForAccount(a: Account | undefined): PaymentMethod | undefined {
  if (!a) return undefined
  return a.type === 'cash' ? 'cash' : a.type === 'debit' ? 'debit' : a.type === 'credit' ? 'credit' : 'transfer'
}

export function AccountPicker({
  open,
  title,
  accounts,
  balances,
  value,
  onChange,
  onClose,
  allowNone,
  disabledId,
  method,
  onMethod,
}: {
  open: boolean
  title: string
  accounts: Account[]
  balances: Map<string, number>
  value: string | undefined
  onChange: (id: string | undefined) => void
  onClose: () => void
  allowNone?: boolean
  disabledId?: string
  method?: PaymentMethod
  onMethod?: (m: PaymentMethod | undefined) => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <ul className="-mx-1">
        {accounts.map((a) => {
          const on = a.id === value
          const disabled = a.id === disabledId
          return (
            <li key={a.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange(a.id)
                  if (!onMethod) onClose()
                }}
                className={cn('flex min-h-16 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left active:bg-surface disabled:opacity-40', on && 'bg-accent-soft active:bg-accent-soft')}
              >
                <CategoryIcon icon={ACCOUNT_ICON[a.type]} color={a.color} size={42} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold">{a.name}</span>
                  {a.name !== ACCOUNT_TYPE_LABEL[a.type] && <span className="block text-sm text-muted">{ACCOUNT_TYPE_LABEL[a.type]}</span>}
                </span>
                <Amount cents={balances.get(a.id) ?? 0} className="text-sm font-bold" tone={(balances.get(a.id) ?? 0) < 0 ? 'neg' : 'ink'} />
                <span className="flex w-6 justify-center">{on && <Check size={20} strokeWidth={2.6} className="text-accent-light" />}</span>
              </button>
            </li>
          )
        })}
        {allowNone && (
          <li>
            <button
              type="button"
              onClick={() => {
                onChange(undefined)
                if (!onMethod) onClose()
              }}
              className={cn('flex min-h-14 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left active:bg-surface', !value && 'bg-accent-soft')}
            >
              <span className="flex size-[42px] items-center justify-center rounded-full bg-surface text-muted">
                <CircleOff size={20} />
              </span>
              <span className="flex-1 text-base font-bold">Sin cuenta</span>
              <span className="flex w-6 justify-center">{!value && <Check size={20} strokeWidth={2.6} className="text-accent-light" />}</span>
            </button>
          </li>
        )}
      </ul>

      {onMethod && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold">Método de pago</p>
          <Segmented<PaymentMethod | 'none'>
            fit
            size="sm"
            value={method ?? 'none'}
            onChange={(m) => onMethod(m === 'none' ? undefined : m)}
            options={METHODS.map((m) => ({ value: m, label: <span title={METHOD_LABEL[m]}>{METHOD_SHORT[m]}</span> }))}
          />
          <button type="button" onClick={onClose} className="btn-primary mt-4 h-12 w-full rounded-full text-base font-bold">
            Listo
          </button>
        </div>
      )}
    </Sheet>
  )
}
