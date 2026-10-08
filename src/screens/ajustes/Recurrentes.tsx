import { useMemo, useState } from 'react'
import { ArrowLeftRight, Pause, Plus, Repeat, Trash2 } from 'lucide-react'
import { ScreenHeader, SectionTitle } from '../../components/ui/ScreenHeader'
import { Button, IconButton } from '../../components/ui/Button'
import { Amount } from '../../components/ui/Amount'
import { Callout, EmptyState } from '../../components/ui/Callout'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Sheet } from '../../components/ui/Sheet'
import { ConfirmSheet } from '../../components/ui/Confirm'
import { Field, MoneyInput, Segmented, TextInput, Toggle } from '../../components/ui/Form'
import { CategoryChips } from '../../components/CategoryChips'
import { byId, useAccounts, useCategories, useRecurring } from '../../db/queries'
import { deleteRecurring, runRecurring, saveRecurring, setRecurringActive } from '../../db/recurring'
import type { Frequency, Recurring, TxType } from '../../db/types'
import { useApp } from '../../state/app'
import { dueDates, firstOccurrence } from '../../lib/recurrence'
import { dayLabel, shortDate, todayISO, weekday, type ISODate } from '../../lib/dates'
import { cn } from '../../lib/cn'

const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos']

export function describeFrequency(freq: Frequency, startDate: ISODate): string {
  if (freq === 'weekly') return `Cada semana, los ${WEEKDAYS[weekday(startDate)]}`
  if (freq === 'biweekly') return 'Cada quincena, el 15 y el último día'
  const day = Number(startDate.slice(8, 10))
  return day > 28 ? `Cada mes, el día ${day} (o el último)` : `Cada mes, el día ${day}`
}

export function monthlyEquivalent(amount: number, freq: Frequency): number {
  if (freq === 'weekly') return Math.round((amount * 52) / 12)
  if (freq === 'biweekly') return amount * 2
  return amount
}

export function Recurrentes() {
  const recurring = useRecurring()
  const categories = useCategories({ includeArchived: true })
  const accounts = useAccounts({ includeArchived: true })
  const cats = useMemo(() => byId(categories), [categories])
  const accs = useMemo(() => byId(accounts), [accounts])
  const [editing, setEditing] = useState<Recurring | 'new' | null>(null)
  const today = todayISO()

  const sorted = [...recurring].sort((a, b) => Number(b.active) - Number(a.active) || (a.nextDate < b.nextDate ? -1 : 1))
  const groups: Array<{ title: string; items: Recurring[] }> = [
    { title: 'Gastos', items: sorted.filter((r) => r.type === 'expense') },
    { title: 'Ingresos', items: sorted.filter((r) => r.type === 'income') },
    { title: 'Transferencias', items: sorted.filter((r) => r.type === 'transfer') },
  ].filter((g) => g.items.length)

  let monthlyOut = 0
  let monthlyIn = 0
  for (const r of recurring) {
    if (!r.active) continue
    if (r.type === 'expense') monthlyOut += monthlyEquivalent(r.amount, r.frequency)
    if (r.type === 'income') monthlyIn += monthlyEquivalent(r.amount, r.frequency)
  }

  return (
    <>
      <ScreenHeader
        title="Recurrentes"
        back="/ajustes"
        right={
          <IconButton label="Nuevo recurrente" tone="soft" onClick={() => setEditing('new')}>
            <Plus size={22} strokeWidth={2.4} />
          </IconButton>
        }
      />
      <div className="px-4">
        {recurring.length === 0 ? (
          <EmptyState icon={Repeat} title="Registra una vez, se repite solo" action={<Button onClick={() => setEditing('new')}>Agregar recurrente</Button>}>
            Renta, suscripciones, tu sueldo o tu beca. Se anotan solos en su fecha, aunque no abras la app ese día.
          </EmptyState>
        ) : (
          <>
            <div className="card mb-5 grid grid-cols-2 divide-x divide-line p-0">
              <div className="p-4">
                <p className="text-sm text-muted">Pagas al mes</p>
                <Amount cents={monthlyOut} className="text-lg font-extrabold" />
              </div>
              <div className="p-4">
                <p className="text-sm text-muted">Recibes al mes</p>
                <Amount cents={monthlyIn} tone="pos" className="text-lg font-extrabold" />
              </div>
            </div>

            {groups.map((g) => (
              <section key={g.title} className="mb-5">
                <SectionTitle>{g.title}</SectionTitle>
                <ul className="card divide-y divide-line p-0">
                  {g.items.map((r) => {
                    const cat = r.categoryId ? cats.get(r.categoryId) : undefined
                    return (
                      <li key={r.id}>
                        <button type="button" onClick={() => setEditing(r)} className={cn('flex min-h-18 w-full items-center gap-3 px-4 py-3 text-left active:bg-accent-soft', !r.active && 'opacity-60')}>
                          {r.type === 'transfer' ? (
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-press">
                              <ArrowLeftRight size={20} />
                            </span>
                          ) : (
                            <CategoryIcon icon={cat?.icon} color={cat?.color} size={44} />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-base font-bold">{r.name}</span>
                            <span className="block truncate text-sm text-muted">{describeFrequency(r.frequency, r.startDate)}</span>
                            <span className={cn('block text-xs font-semibold', r.active ? 'text-accent-press' : 'text-muted')}>
                              {r.active ? `Próximo: ${dayLabel(r.nextDate, today).toLowerCase()}` : 'En pausa'}
                              {r.type === 'transfer' && r.accountId && r.toAccountId ? `. ${accs.get(r.accountId)?.name} → ${accs.get(r.toAccountId)?.name}` : ''}
                            </span>
                          </span>
                          <Amount cents={r.amount} sign={r.type === 'income'} tone={r.type === 'income' ? 'pos' : 'ink'} className="font-extrabold" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
            <p className="px-2 text-xs text-muted">
              Se registran solos al abrir la app. Si no la abriste en días, se anotan todos los pendientes con su fecha.
            </p>
          </>
        )}
      </div>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing && editing !== 'new' ? 'Editar recurrente' : 'Nuevo recurrente'}>
        {editing !== null && <RecurringForm key={editing === 'new' ? 'new' : editing.id} rec={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      </Sheet>
    </>
  )
}

function RecurringForm({ rec, onClose }: { rec?: Recurring; onClose: () => void }) {
  const { showToast } = useApp()
  const categories = useCategories()
  const accounts = useAccounts()
  const today = todayISO()

  const [type, setType] = useState<TxType>(rec?.type ?? 'expense')
  const [name, setName] = useState(rec?.name ?? '')
  const [amount, setAmount] = useState<number | null>(rec?.amount ?? null)
  const [categoryId, setCategoryId] = useState<string | undefined>(rec?.categoryId)
  const [accountId, setAccountId] = useState<string | undefined>(rec?.accountId ?? accounts[0]?.id)
  const [toAccountId, setToAccountId] = useState<string | undefined>(rec?.toAccountId)
  const [frequency, setFrequency] = useState<Frequency>(rec?.frequency ?? 'monthly')
  const [startDate, setStartDate] = useState<ISODate>(rec?.startDate ?? today)
  const [endDate, setEndDate] = useState<ISODate>(rec?.endDate ?? '')
  const [active, setActive] = useState(rec?.active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const backfill = !rec ? dueDates({ frequency, startDate, nextDate: firstOccurrence(frequency, startDate), endDate: endDate || undefined }, today).dates.length : 0

  const save = async () => {
    if (!name.trim()) return setError('Ponle un nombre, por ejemplo "Renta".')
    if (!amount) return setError('Escribe el monto.')
    if (type !== 'transfer' && !categoryId) return setError('Elige una categoría.')
    if (type === 'transfer' && (!accountId || !toAccountId || accountId === toAccountId)) return setError('Elige dos cuentas distintas.')
    await saveRecurring({
      id: rec?.id,
      name: name.trim(),
      type,
      amount,
      categoryId,
      accountId,
      toAccountId,
      frequency,
      startDate,
      endDate: endDate || undefined,
      active,
      sample: rec?.sample,
    })
    const n = await runRecurring()
    showToast(n > 0 ? `Recurrente guardado. Se registraron ${n} movimientos.` : 'Recurrente guardado')
    onClose()
  }

  const remove = async () => {
    if (!rec) return
    await deleteRecurring(rec.id)
    setConfirmDelete(false)
    showToast('Recurrente borrado')
    onClose()
  }

  const kindCats = categories.filter((c) => c.kind === type)

  return (
    <div className="pt-2">
      <Segmented
        className="mb-4"
        value={type}
        onChange={(t) => {
          setType(t)
          setCategoryId(undefined)
          setError(null)
        }}
        options={[
          { value: 'expense', label: 'Gasto' },
          { value: 'income', label: 'Ingreso' },
          { value: 'transfer', label: 'Transferencia' },
        ]}
        fit
      />

      <Field label="Nombre">
        {(id) => <TextInput id={id} value={name} maxLength={40} placeholder={type === 'income' ? 'Ej. Sueldo' : 'Ej. Renta, Spotify'} onChange={(e) => (setName(e.target.value), setError(null))} />}
      </Field>
      <Field label="Monto">{(id) => <MoneyInput id={id} cents={amount} onChange={(v) => (setAmount(v), setError(null))} />}</Field>

      {type !== 'transfer' && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-bold">Categoría</p>
          <CategoryChips categories={kindCats} isSelected={(c) => c.id === categoryId} onPick={(c) => (setCategoryId(c.id), setError(null))} />
        </div>
      )}

      <div className="mb-4">
        <p className="mb-2 text-sm font-bold">{type === 'transfer' ? 'Desde' : type === 'income' ? 'Entra a' : 'Se paga con'}</p>
        <AccountChips accounts={accounts} value={accountId} onChange={setAccountId} />
      </div>
      {type === 'transfer' && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-bold">Hacia</p>
          <AccountChips accounts={accounts} value={toAccountId} onChange={setToAccountId} />
        </div>
      )}

      <div className="mb-4">
        <p className="mb-1.5 text-sm font-bold">Frecuencia</p>
        <Segmented
          value={frequency}
          onChange={setFrequency}
          options={[
            { value: 'weekly', label: 'Semanal' },
            { value: 'biweekly', label: 'Quincenal' },
            { value: 'monthly', label: 'Mensual' },
          ]}
        />
      </div>

      <div className="mb-1 grid grid-cols-2 gap-3">
        <Field label={frequency === 'biweekly' ? 'Empieza' : 'Primera fecha'}>
          {(id) => (
            <input
              id={id}
              type="date"
              value={startDate}
              onChange={(e) => e.target.value && setStartDate(e.target.value)}
              className="h-13 w-full rounded-2xl border border-line bg-surface px-3 text-base font-semibold"
            />
          )}
        </Field>
        <Field label="Termina (opcional)">
          {(id) => (
            <input
              id={id}
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-13 w-full rounded-2xl border border-line bg-surface px-3 text-base font-semibold"
            />
          )}
        </Field>
      </div>
      <p className="-mt-2 mb-4 text-sm font-semibold text-accent-press">
        {describeFrequency(frequency, startDate)}. {rec ? `Próximo: ${shortDate(rec.nextDate)}` : `Primero: ${shortDate(firstOccurrence(frequency, startDate))}`}
      </p>

      {backfill > 0 && (
        <Callout tone="warn" className="mb-4">
          La primera fecha ya pasó: se registrarán {backfill} {backfill === 1 ? 'movimiento' : 'movimientos'} desde esa fecha hasta hoy.
        </Callout>
      )}

      {rec && (
        <div className="mb-3 rounded-2xl border border-line px-4">
          <Toggle checked={active} onChange={setActive} label={active ? 'Activo' : 'En pausa'} />
        </div>
      )}

      {error && <p className="mb-3 text-sm font-semibold text-neg-ink">{error}</p>}

      <Button size="lg" block onClick={save}>
        {rec ? 'Guardar cambios' : 'Agregar recurrente'}
      </Button>
      {rec && (
        <div className="mt-1 flex gap-2">
          {rec.active && (
            <Button
              variant="ghost"
              className="flex-1"
              icon={<Pause size={17} />}
              onClick={async () => {
                await setRecurringActive(rec.id, false)
                showToast('Recurrente en pausa')
                onClose()
              }}
            >
              Pausar
            </Button>
          )}
          <Button variant="ghost" className="flex-1 text-neg-ink active:bg-neg-soft" icon={<Trash2 size={17} />} onClick={() => setConfirmDelete(true)}>
            Borrar
          </Button>
        </div>
      )}

      <ConfirmSheet open={confirmDelete} title="¿Borrar este recurrente?" confirmLabel="Borrar" onCancel={() => setConfirmDelete(false)} onConfirm={remove}>
        Dejará de registrarse. Los movimientos que ya se anotaron se quedan en tu historial.
      </ConfirmSheet>
    </div>
  )
}

function AccountChips({ accounts, value, onChange }: { accounts: Array<{ id: string; name: string }>; value?: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {accounts.map((a) => (
        <button
          key={a.id}
          type="button"
          aria-pressed={a.id === value}
          onClick={() => onChange(a.id)}
          className={cn('h-11 rounded-full border px-4 text-sm font-semibold', a.id === value ? 'border-accent bg-accent-soft text-accent-press' : 'border-line bg-surface')}
        >
          {a.name}
        </button>
      ))}
    </div>
  )
}
