import { useState } from 'react'
import { Archive, Trash2 } from 'lucide-react'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { ColorPicker, DaySelect, Field, MoneyInput, Segmented, TextInput } from '../../components/ui/Form'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { ConfirmSheet } from '../../components/ui/Confirm'
import { ACCOUNT_COLORS, ACCOUNT_ICON } from '../../db/defaults'
import { accountUsage, removeAccount, saveAccount } from '../../db/actions'
import type { Account, AccountType } from '../../db/types'
import { useApp } from '../../state/app'
import { useMoney } from '../../components/ui/Amount'

const TYPES: Array<{ value: AccountType; label: string }> = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
  { value: 'savings', label: 'Ahorro' },
]

/** Crear o editar una cuenta. */
export function AccountSheet({ open, account, currentBalance, onClose }: { open: boolean; account?: Account; currentBalance?: number; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={account ? 'Editar cuenta' : 'Nueva cuenta'}>
      {open && <AccountForm key={account?.id ?? 'new'} account={account} currentBalance={currentBalance} onClose={onClose} />}
    </Sheet>
  )
}

function AccountForm({ account, currentBalance, onClose }: { account?: Account; currentBalance?: number; onClose: () => void }) {
  const { showToast } = useApp()
  const money = useMoney()
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'debit')
  const [color, setColor] = useState(account?.color ?? ACCOUNT_COLORS[0])
  // En crédito se captura la deuda como positivo y se guarda en negativo.
  const [initial, setInitial] = useState<number | null>(account ? (account.type === 'credit' ? -account.initialBalance : account.initialBalance) : null)
  const [limit, setLimit] = useState<number | null>(account?.creditLimit ?? null)
  const [cutoffDay, setCutoffDay] = useState<number | undefined>(account?.cutoffDay)
  const [dueDay, setDueDay] = useState<number | undefined>(account?.dueDay)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<null | { mode: 'archived' | 'deleted' }>(null)

  const isCredit = type === 'credit'

  const save = async () => {
    if (!name.trim()) {
      setError('Ponle un nombre, por ejemplo "BBVA débito".')
      return
    }
    const init = initial ?? 0
    await saveAccount({
      id: account?.id,
      name: name.trim(),
      type,
      color,
      initialBalance: isCredit ? -Math.abs(init) : init,
      creditLimit: isCredit && limit ? limit : undefined,
      cutoffDay: isCredit ? cutoffDay : undefined,
      dueDay: isCredit ? dueDay : undefined,
    })
    showToast(account ? 'Cuenta guardada' : 'Cuenta agregada')
    onClose()
  }

  const askRemove = async () => {
    if (!account) return
    const used = await accountUsage(account.id)
    setConfirm({ mode: used > 0 ? 'archived' : 'deleted' })
  }

  const remove = async () => {
    if (!account) return
    const result = await removeAccount(account.id)
    setConfirm(null)
    showToast(result === 'archived' ? 'Cuenta archivada' : 'Cuenta borrada')
    onClose()
  }

  return (
    <div className="pt-2">
      <div className="mb-5 flex items-center gap-3">
        <CategoryIcon icon={ACCOUNT_ICON[type]} color={color} size={52} />
        <p className="min-w-0 flex-1 truncate text-lg font-extrabold">{name.trim() || 'Tu cuenta'}</p>
      </div>

      <Field label="Nombre" error={error}>
        {(id) => <TextInput id={id} value={name} maxLength={40} placeholder="Ej. BBVA débito" onChange={(e) => (setName(e.target.value), setError(null))} />}
      </Field>

      <div className="mb-4">
        <p className="mb-1.5 text-sm font-bold">Tipo</p>
        <Segmented value={type} onChange={setType} options={TYPES} />
      </div>

      <Field
        label={isCredit ? 'Deuda actual' : account ? 'Saldo inicial' : 'Saldo actual'}
        hint={
          account
            ? `Saldo antes de tu primer movimiento registrado. Hoy tienes ${money(currentBalance ?? 0)}.`
            : isCredit
              ? 'Lo que debes hoy en la tarjeta. Si no debes nada, déjalo en 0.'
              : 'Lo que tienes hoy en esta cuenta.'
        }
      >
        {(id) => <MoneyInput id={id} cents={initial} onChange={setInitial} allowNegative={!isCredit} />}
      </Field>

      {isCredit && (
        <>
          <Field label="Límite de crédito">{(id) => <MoneyInput id={id} cents={limit} onChange={setLimit} />}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Día de corte">{(id) => <DaySelect id={id} value={cutoffDay} onChange={setCutoffDay} placeholder="Elegir" />}</Field>
            <Field label="Día límite de pago">{(id) => <DaySelect id={id} value={dueDay} onChange={setDueDay} placeholder="Elegir" />}</Field>
          </div>
          {(!cutoffDay || !dueDay) && <p className="-mt-2 mb-4 text-xs text-muted">Con estas fechas te avisamos cuando se acerque el pago.</p>}
        </>
      )}

      <div className="mb-5">
        <p className="mb-1 text-sm font-bold">Color</p>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <Button size="lg" block onClick={save}>
        {account ? 'Guardar cambios' : 'Agregar cuenta'}
      </Button>
      {account && (
        <Button variant="ghost" block className="mt-2 text-neg-ink active:bg-neg-soft" icon={<Trash2 size={18} />} onClick={askRemove}>
          Quitar cuenta
        </Button>
      )}

      <ConfirmSheet
        open={!!confirm}
        title={confirm?.mode === 'archived' ? '¿Archivar esta cuenta?' : '¿Borrar esta cuenta?'}
        confirmLabel={confirm?.mode === 'archived' ? 'Archivar' : 'Borrar'}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      >
        {confirm?.mode === 'archived' ? (
          <span className="flex gap-2">
            <Archive size={18} className="mt-0.5 shrink-0" />
            Tiene movimientos, así que se archiva: ya no aparecerá al registrar, pero tu historial no cambia. Puedes restaurarla después.
          </span>
        ) : (
          'No tiene movimientos, así que se borra por completo.'
        )}
      </ConfirmSheet>
    </div>
  )
}
