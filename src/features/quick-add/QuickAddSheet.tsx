import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, CalendarDays, Check, Pencil, StickyNote, Trash2, Wallet, X, type LucideIcon } from 'lucide-react'
import { Sheet } from '../../components/ui/Sheet'
import { Button, IconButton } from '../../components/ui/Button'
import { Segmented } from '../../components/ui/Form'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Amount } from '../../components/ui/Amount'
import { Callout } from '../../components/ui/Callout'
import { ConfirmSheet } from '../../components/ui/Confirm'
import { Keypad } from './Keypad'
import { AccountPicker, methodForAccount } from './AccountPicker'
import { clearDraft, getLastAccountId, isDraftEmpty, loadDraft, saveDraft, setLastAccountId, type Draft } from './draft'
import { db } from '../../db/db'
import { useAccounts, useAllTransactions, useCategories, byId } from '../../db/queries'
import { deleteTransaction, restoreTransaction, saveTransaction } from '../../db/actions'
import { ACCOUNT_ICON } from '../../db/defaults'
import type { Account, TxType } from '../../db/types'
import { useApp, type QuickAddRequest } from '../../state/app'
import { computeBalances } from '../../lib/balances'
import { addDays, dayLabel, todayISO } from '../../lib/dates'
import { formatKeypad, formatMXN, keypadToCents, pressKey } from '../../lib/money'
import { navigate } from '../../lib/router'
import { cn } from '../../lib/cn'

const TYPE_OPTIONS: Array<{ value: TxType; label: string }> = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  { value: 'transfer', label: 'Transferencia' },
]

const SAVE_LABEL: Record<TxType, string> = { expense: 'Guardar gasto', income: 'Guardar ingreso', transfer: 'Guardar transferencia' }
const SAVED: Record<TxType, string> = { expense: 'Gasto guardado', income: 'Ingreso guardado', transfer: 'Transferencia guardada' }
const DELETED: Record<TxType, string> = { expense: 'Gasto borrado', income: 'Ingreso borrado', transfer: 'Transferencia borrada' }
const THIS: Record<TxType, string> = { expense: 'este gasto', income: 'este ingreso', transfer: 'esta transferencia' }

/** Hoja de registro rápido: monto → categoría → guardar. */
export function QuickAddSheet() {
  const { quickAdd, closeQuickAdd } = useApp()
  const [req, setReq] = useState<QuickAddRequest>(quickAdd)
  const [session, setSession] = useState(0)

  useEffect(() => {
    if (quickAdd) {
      setReq(quickAdd)
      setSession((s) => s + 1)
    }
  }, [quickAdd])

  return (
    <Sheet open={quickAdd !== null} onClose={closeQuickAdd} hideHeader bodyClassName="px-4 pb-3">
      {req && <QuickAddForm key={session} req={req} onDone={closeQuickAdd} />}
    </Sheet>
  )
}

function centsToKeypad(cents: number): string {
  const whole = Math.floor(cents / 100)
  const dec = cents % 100
  return dec === 0 ? String(whole) : `${whole}.${String(dec).padStart(2, '0')}`
}

function QuickAddForm({ req, onDone }: { req: NonNullable<QuickAddRequest>; onDone: () => void }) {
  const { showToast } = useApp()
  const accounts = useAccounts()
  const categories = useCategories()
  const allTx = useAllTransactions()
  const today = todayISO()
  const isEdit = !!req.editId

  const [d, setD] = useState<Draft | null>(null)
  const [restored, setRestored] = useState(false)
  const [methodTouched, setMethodTouched] = useState(false)
  const [picker, setPicker] = useState<null | 'account' | 'from' | 'to'>(null)
  const [showNote, setShowNote] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saved, setSaved] = useState(false)
  const saving = useRef(false)

  // Carga inicial: movimiento a editar, borrador pendiente o uno nuevo.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const accs = (await db.accounts.orderBy('order').toArray()).filter((a) => !a.archived)
      if (req.editId) {
        const tx = await db.transactions.get(req.editId)
        if (!tx || cancelled) return
        setD({
          type: tx.type,
          amount: centsToKeypad(tx.amount),
          categoryId: tx.categoryId,
          accountId: tx.accountId,
          toAccountId: tx.toAccountId,
          date: tx.date,
          method: tx.method,
          note: tx.note ?? '',
        })
        setMethodTouched(true)
        setShowNote(!!tx.note)
        return
      }
      const draft = loadDraft()
      if (draft && !isDraftEmpty(draft)) {
        if (cancelled) return
        setD(req.type ? { ...draft, type: req.type } : draft)
        setRestored(true)
        setShowNote(!!draft.note)
        setMethodTouched(true)
        return
      }
      const last = getLastAccountId()
      const def = accs.find((a) => a.id === last) ?? accs[0]
      const type = req.type ?? 'expense'
      if (cancelled) return
      setD({
        type,
        amount: '',
        date: todayISO(),
        note: '',
        accountId: def?.id,
        toAccountId: type === 'transfer' ? accs.find((a) => a.id !== def?.id)?.id : undefined,
        method: methodForAccount(def),
      })
    })()
    return () => {
      cancelled = true
    }
  }, [req])

  // Borrador: se guarda en cada cambio (solo registros nuevos).
  useEffect(() => {
    if (!d || isEdit || saving.current) return
    if (isDraftEmpty(d)) clearDraft()
    else saveDraft(d)
  }, [d, isEdit])

  const accById = useMemo(() => byId(accounts), [accounts])
  const balances = useMemo(() => computeBalances(accounts, allTx ?? []), [accounts, allTx])

  // Categorías del tipo actual, las más usadas en los últimos 90 días primero.
  const usage = useMemo(() => {
    const since = addDays(today, -90)
    const m = new Map<string, number>()
    for (const t of allTx ?? []) if (t.date >= since && t.categoryId) m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + 1)
    return m
    // Solo al abrir, para que el orden no brinque mientras registras
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTx === undefined])

  const cats = useMemo(() => {
    if (!d || d.type === 'transfer') return []
    return categories
      .filter((c) => c.kind === d.type || (d.categoryId === c.id && isEdit))
      .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.order - b.order)
  }, [categories, d?.type, usage]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<Draft>) => setD((prev) => (prev ? { ...prev, ...patch } : prev))
  const press = (key: string) => setD((prev) => (prev ? { ...prev, amount: pressKey(prev.amount, key) } : prev))

  const setType = (type: TxType) => {
    if (!d) return
    const patch: Partial<Draft> = { type }
    const cat = categories.find((c) => c.id === d.categoryId)
    if (type === 'transfer' || (cat && cat.kind !== type)) patch.categoryId = undefined
    if (type === 'transfer' && !d.toAccountId) patch.toAccountId = accounts.find((a) => a.id !== d.accountId)?.id
    if (type === 'transfer' && !d.accountId) patch.accountId = accounts[0]?.id
    update(patch)
  }

  const setAccount = (id: string | undefined) => {
    const patch: Partial<Draft> = { accountId: id }
    if (!methodTouched) patch.method = methodForAccount(id ? accById.get(id) : undefined)
    update(patch)
  }

  const cents = d ? keypadToCents(d.amount) : 0
  let blocker: string | null = null
  if (d) {
    if (cents <= 0) blocker = 'Escribe el monto'
    else if (d.type !== 'transfer' && !d.categoryId) blocker = 'Elige una categoría'
    else if (d.type === 'transfer' && (!d.accountId || !d.toAccountId)) blocker = 'Elige las cuentas'
    else if (d.type === 'transfer' && d.accountId === d.toAccountId) blocker = 'Elige cuentas distintas'
  }

  const save = async () => {
    if (!d || blocker || saving.current) return
    saving.current = true
    const id = await saveTransaction({
      id: req.editId,
      type: d.type,
      amount: cents,
      date: d.date,
      categoryId: d.type === 'transfer' ? undefined : d.categoryId,
      accountId: d.accountId,
      toAccountId: d.type === 'transfer' ? d.toAccountId : undefined,
      method: d.type === 'transfer' ? undefined : d.method,
      note: d.note,
    })
    if (!isEdit) {
      clearDraft()
      if (d.type !== 'transfer') setLastAccountId(d.accountId)
    }
    setSaved(true)
    const type = d.type
    setTimeout(() => {
      onDone()
      if (isEdit) showToast('Cambios guardados')
      else showToast(SAVED[type], { action: { label: 'Deshacer', run: () => void deleteTransaction(id) } })
    }, 420)
  }

  const remove = async () => {
    if (!req.editId || !d) return
    const prev = await deleteTransaction(req.editId)
    setConfirmDelete(false)
    onDone()
    showToast(DELETED[d.type], prev ? { action: { label: 'Deshacer', run: () => void restoreTransaction(prev) } } : undefined)
  }

  // Teclado físico (útil en computadora)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || picker || confirmDelete) return
      if (/^\d$/.test(e.key) || e.key === '.' || e.key === ',') press(e.key === ',' ? '.' : e.key)
      else if (e.key === 'Backspace') press('back')
      else if (e.key === 'Enter') void save()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!d) return <div className="h-[560px]" aria-busy="true" />

  const account = d.accountId ? accById.get(d.accountId) : undefined
  const [whole, dec] = formatKeypad(d.amount).split('.')
  const amountColor = d.amount === '' ? 'text-muted' : d.type === 'income' ? 'text-pos-ink' : d.type === 'transfer' ? 'text-accent-press' : 'text-ink'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Segmented fit className="min-w-0 flex-1" value={d.type} onChange={setType} options={TYPE_OPTIONS} />
        {isEdit && (
          <IconButton label="Borrar" tone="surface" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={19} strokeWidth={2.2} className="text-neg-ink" />
          </IconButton>
        )}
        <IconButton label="Cerrar" tone="surface" onClick={onDone}>
          <X size={20} strokeWidth={2.4} />
        </IconButton>
      </div>

      {restored && (
        <div className="-mb-1 flex items-center justify-center gap-1 text-xs text-muted">
          <span>Retomaste un registro sin guardar.</span>
          <button
            type="button"
            className="min-h-8 px-1 font-bold text-accent-press"
            onClick={() => {
              clearDraft()
              setRestored(false)
              const def = accById.get(getLastAccountId() ?? '') ?? accounts[0]
              setD({ type: 'expense', amount: '', date: todayISO(), note: '', accountId: def?.id, method: methodForAccount(def) })
              setShowNote(false)
              setMethodTouched(false)
            }}
          >
            Empezar de nuevo
          </button>
        </div>
      )}

      {/* Monto */}
      <div className="flex h-16 items-center justify-center" aria-live="polite">
        {saved ? (
          <span className="animate-pop flex size-14 items-center justify-center rounded-full bg-pos text-white shadow-card">
            <Check size={32} strokeWidth={3} />
          </span>
        ) : (
          <p className={cn('num leading-none font-extrabold tracking-tight', whole.length > 9 ? 'text-[36px]' : 'text-[44px]', amountColor)} aria-label={`Monto ${formatMXN(cents)}`}>
            ${whole}
            {dec !== undefined && <span className="text-[0.6em]">.{dec}</span>}
          </p>
        )}
      </div>

      {/* Categorías o cuentas de la transferencia */}
      {d.type !== 'transfer' ? (
        <div className="scroll-x -mx-4 px-4">
          <div className="grid h-[152px] auto-cols-[72px] grid-flow-col grid-rows-2 gap-x-1 gap-y-1.5">
            {cats.map((c) => {
              const on = c.id === d.categoryId
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update({ categoryId: c.id })}
                  className="flex flex-col items-center gap-1 rounded-2xl pt-0.5 active:bg-surface"
                >
                  <span className={cn('rounded-full p-[3px] ring-2 transition-[box-shadow] duration-150', on ? 'ring-accent' : 'ring-transparent')}>
                    <CategoryIcon icon={c.icon} color={c.color} size={44} />
                  </span>
                  <span className={cn('w-full truncate px-0.5 text-center text-[13px] leading-4', on ? 'font-bold text-accent-press' : 'font-semibold text-ink')}>{c.name}</span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => {
                onDone()
                navigate('/ajustes/categorias')
              }}
              className="flex flex-col items-center gap-1 rounded-2xl pt-0.5 active:bg-surface"
            >
              <span className="p-[3px]">
                <span className="flex size-11 items-center justify-center rounded-full border border-dashed border-muted text-muted">
                  <Pencil size={18} />
                </span>
              </span>
              <span className="text-[13px] leading-4 font-semibold text-muted">Editar</span>
            </button>
          </div>
        </div>
      ) : accounts.length < 2 ? (
        <Callout
          className="min-h-[152px]"
          title="Para transferir necesitas dos cuentas"
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                onDone()
                navigate('/ajustes/cuentas')
              }}
            >
              Agregar cuenta
            </Button>
          }
        >
          Por ejemplo, de tu débito a efectivo cuando sacas del cajero.
        </Callout>
      ) : (
        <div className="flex h-[152px] items-center gap-2">
          <AccountTile caption="Desde" account={d.accountId ? accById.get(d.accountId) : undefined} balance={balances.get(d.accountId ?? '')} onClick={() => setPicker('from')} />
          <IconButton label="Intercambiar cuentas" tone="soft" onClick={() => update({ accountId: d.toAccountId, toAccountId: d.accountId })}>
            <ArrowLeftRight size={18} strokeWidth={2.4} />
          </IconButton>
          <AccountTile caption="Hacia" account={d.toAccountId ? accById.get(d.toAccountId) : undefined} balance={balances.get(d.toAccountId ?? '')} onClick={() => setPicker('to')} />
        </div>
      )}

      {/* Opcionales */}
      <div className="scroll-x -mx-4 flex gap-2 px-4">
        <DateChip value={d.date} today={today} onChange={(date) => update({ date })} />
        {d.type !== 'transfer' && (
          <Chip icon={Wallet} active={!!account} onClick={() => setPicker('account')}>
            {account?.name ?? 'Sin cuenta'}
          </Chip>
        )}
        <Chip icon={StickyNote} active={!!d.note.trim()} onClick={() => setShowNote((s) => !s)}>
          {d.note.trim() ? d.note.trim() : 'Nota'}
        </Chip>
      </div>
      {showNote && (
        <input
          autoFocus={!d.note}
          value={d.note}
          onChange={(e) => update({ note: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          enterKeyHint="done"
          maxLength={140}
          placeholder="Ej. tacos con amigos"
          aria-label="Nota"
          className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base font-semibold outline-none placeholder:font-medium placeholder:text-muted focus:border-accent focus:bg-bg"
        />
      )}

      <Keypad onKey={press} />

      <Button size="lg" block disabled={!!blocker || saved} onClick={save}>
        {blocker ?? (isEdit ? 'Guardar cambios' : SAVE_LABEL[d.type])}
      </Button>

      <AccountPicker
        open={picker !== null}
        title={picker === 'from' ? 'Desde qué cuenta' : picker === 'to' ? 'Hacia qué cuenta' : d.type === 'income' ? 'Cuenta donde entra' : 'Cuenta con la que pagas'}
        accounts={accounts}
        balances={balances}
        value={picker === 'to' ? d.toAccountId : d.accountId}
        allowNone={picker === 'account'}
        disabledId={picker === 'from' ? d.toAccountId : picker === 'to' ? d.accountId : undefined}
        onChange={(id) => (picker === 'to' ? update({ toAccountId: id }) : picker === 'from' ? update({ accountId: id }) : setAccount(id))}
        method={d.method}
        onMethod={
          picker === 'account' && d.type === 'expense'
            ? (m) => {
                setMethodTouched(true)
                update({ method: m })
              }
            : undefined
        }
        onClose={() => setPicker(null)}
      />

      <ConfirmSheet
        open={confirmDelete}
        title={`¿Borrar ${THIS[d.type]}?`}
        confirmLabel="Borrar"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      >
        Se quitará de tus movimientos y del saldo de la cuenta.
      </ConfirmSheet>
    </div>
  )
}

function Chip({ icon: Icon, active, onClick, children }: { icon: LucideIcon; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-11 max-w-[180px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors',
        active ? 'border-transparent bg-accent-soft text-accent-press' : 'border-line bg-surface text-ink',
      )}
    >
      <Icon size={17} strokeWidth={2.2} className="shrink-0" />
      <span className="truncate">{children}</span>
    </button>
  )
}

function DateChip({ value, today, onChange }: { value: string; today: string; onChange: (d: string) => void }) {
  const isToday = value === today
  return (
    <span
      className={cn(
        'relative flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold',
        isToday ? 'border-line bg-surface text-ink' : 'border-transparent bg-accent-soft text-accent-press',
      )}
    >
      <CalendarDays size={17} strokeWidth={2.2} />
      {dayLabel(value, today)}
      <input
        type="date"
        aria-label="Fecha"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.()
          } catch {
            /* iOS abre su selector solo */
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </span>
  )
}

function AccountTile({ caption, account, balance, onClick }: { caption: string; account: Account | undefined; balance: number | undefined; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="card flex h-full min-w-0 flex-1 flex-col items-start justify-between p-3.5 text-left shadow-none active:bg-accent-soft">
      <span className="text-xs font-semibold text-muted">{caption}</span>
      {account ? (
        <>
          <CategoryIcon icon={ACCOUNT_ICON[account.type]} color={account.color} size={40} />
          <span className="w-full">
            <span className="block truncate text-base font-bold">{account.name}</span>
            <Amount cents={balance ?? 0} className="block text-xs font-semibold text-muted" />
          </span>
        </>
      ) : (
        <span className="text-base font-bold text-accent-press">Elegir cuenta</span>
      )}
    </button>
  )
}
