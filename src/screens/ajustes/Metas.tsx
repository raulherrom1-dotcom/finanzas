import { useMemo, useState } from 'react'
import { Pencil, Plus, Target, Trash2, Trophy, X } from 'lucide-react'
import { ScreenHeader, SectionTitle } from '../../components/ui/ScreenHeader'
import { Button, IconButton } from '../../components/ui/Button'
import { Amount, useMoney } from '../../components/ui/Amount'
import { EmptyState } from '../../components/ui/Callout'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { ProgressBar } from '../../components/ui/Progress'
import { Sheet } from '../../components/ui/Sheet'
import { ConfirmSheet } from '../../components/ui/Confirm'
import { ColorPicker, Field, IconPicker, MoneyInput, Segmented, TextInput } from '../../components/ui/Form'
import { Celebration } from '../../components/Celebration'
import { useGoalContributions, useGoals } from '../../db/queries'
import { addContribution, deleteContribution, deleteGoal, saveGoal } from '../../db/goals'
import type { Goal } from '../../db/types'
import { goalViews, type GoalView } from '../../lib/goals'
import { useApp } from '../../state/app'
import { shortDate, todayISO } from '../../lib/dates'
import { cn } from '../../lib/cn'

export function Metas() {
  const goals = useGoals()
  const contributions = useGoalContributions()
  const views = useMemo(() => goalViews(goals, contributions), [goals, contributions])
  const [editing, setEditing] = useState<Goal | 'new' | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [contributeTo, setContributeTo] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState<string | null>(null)

  const active = views.filter((v) => !v.done)
  const done = views.filter((v) => v.done)
  const totalSaved = views.reduce((s, v) => s + v.saved, 0)
  const detailView = views.find((v) => v.goal.id === detail)
  const contributeView = views.find((v) => v.goal.id === contributeTo)

  return (
    <>
      <ScreenHeader
        title="Metas de ahorro"
        back="/ajustes"
        right={
          <IconButton label="Nueva meta" tone="soft" onClick={() => setEditing('new')}>
            <Plus size={22} strokeWidth={2.4} />
          </IconButton>
        }
      />
      <div className="px-4">
        {views.length === 0 ? (
          <EmptyState icon={Target} title="¿Para qué estás ahorrando?" action={<Button onClick={() => setEditing('new')}>Crear meta</Button>}>
            Una laptop, un viaje o tu fondo de emergencia. Abona cuando puedas y ve cuánto te falta.
          </EmptyState>
        ) : (
          <>
            <p className="mb-4 px-1 text-sm text-muted">
              Llevas <Amount cents={totalSaved} className="font-bold text-ink" /> ahorrados en {views.length} {views.length === 1 ? 'meta' : 'metas'}.
            </p>
            <ul className="space-y-3">
              {active.map((v) => (
                <li key={v.goal.id}>
                  <GoalCard view={v} onOpen={() => setDetail(v.goal.id)} onContribute={() => setContributeTo(v.goal.id)} />
                </li>
              ))}
            </ul>

            {done.length > 0 && (
              <section className="mt-6">
                <SectionTitle>Cumplidas</SectionTitle>
                <ul className="space-y-2">
                  {done.map((v) => (
                    <li key={v.goal.id}>
                      <button type="button" onClick={() => setDetail(v.goal.id)} className="flex w-full items-center gap-3 rounded-card bg-pos-soft px-4 py-3 text-left">
                        <span className="flex size-10 items-center justify-center rounded-full bg-pos-soft text-pos-ink">
                          <Trophy size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">{v.goal.name}</span>
                          <span className="block text-sm text-pos-ink">
                            Cumplida{v.goal.completedAt ? ` el ${shortDate(todayISO(new Date(v.goal.completedAt)))}` : ''}
                          </span>
                        </span>
                        <Amount cents={v.saved} className="font-extrabold" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing && editing !== 'new' ? 'Editar meta' : 'Nueva meta'}>
        {editing !== null && <GoalForm key={editing === 'new' ? 'new' : editing.id} goal={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      </Sheet>

      <Sheet open={!!detailView} onClose={() => setDetail(null)} title={detailView?.goal.name}>
        {detailView && (
          <GoalDetail
            view={detailView}
            onContribute={() => setContributeTo(detailView.goal.id)}
            onEdit={() => {
              setEditing(detailView.goal)
              setDetail(null)
            }}
            onDeleted={() => setDetail(null)}
          />
        )}
      </Sheet>

      <Sheet open={!!contributeView} onClose={() => setContributeTo(null)} title={contributeView ? `Abonar a ${contributeView.goal.name}` : ''}>
        {contributeView && (
          <ContributeForm
            key={contributeView.goal.id}
            view={contributeView}
            onClose={() => setContributeTo(null)}
            onCompleted={() => {
              setContributeTo(null)
              setCelebrate(contributeView.goal.name)
            }}
          />
        )}
      </Sheet>

      {celebrate && <Celebration title={`Juntaste lo de “${celebrate}”.`} onDone={() => setCelebrate(null)} />}
    </>
  )
}

function GoalStatus({ view }: { view: GoalView }) {
  const money = useMoney()
  if (view.done) return <p className="text-sm font-semibold text-pos-ink">¡Meta cumplida!</p>
  if (view.overdue) return <p className="text-sm font-semibold text-warn-ink">La fecha ya pasó. Faltan {money(view.remaining)}.</p>
  return (
    <p className="text-sm text-muted">
      Faltan {money(view.remaining)}
      {view.perMonth ? `. Ahorra ${money(view.perMonth, { noCents: true })} al mes para llegar.` : '.'}
    </p>
  )
}

function GoalCard({ view, onOpen, onContribute }: { view: GoalView; onOpen: () => void; onContribute: () => void }) {
  const money = useMoney()
  const { goal } = view
  return (
    <div className="card p-4">
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="mb-3 flex items-center gap-3">
          <CategoryIcon icon={goal.icon} color={goal.color} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold">{goal.name}</p>
            <p className="text-sm text-muted">{goal.deadline ? `Para el ${shortDate(goal.deadline)} ${goal.deadline.slice(0, 4)}` : 'Sin fecha límite'}</p>
          </div>
          <span className="num text-lg font-extrabold text-accent-press">{Math.floor(view.pct)}%</span>
        </div>
        <ProgressBar pct={view.pct} color="linear-gradient(90deg, #6d52ff, #22d3ee)" />
        <p className="mt-2 text-sm">
          <span className="font-bold">{money(view.saved)}</span>
          <span className="text-muted"> de {money(goal.target)}</span>
        </p>
        <GoalStatus view={view} />
      </button>
      <Button variant="secondary" size="sm" className="mt-3" icon={<Plus size={16} />} onClick={onContribute}>
        Abonar
      </Button>
    </div>
  )
}

function GoalDetail({ view, onContribute, onEdit, onDeleted }: { view: GoalView; onContribute: () => void; onEdit: () => void; onDeleted: () => void }) {
  const contributions = useGoalContributions()
    .filter((c) => c.goalId === view.goal.id)
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))
  const { showToast } = useApp()
  const money = useMoney()
  const [confirmGoal, setConfirmGoal] = useState(false)
  const [confirmC, setConfirmC] = useState<string | null>(null)

  return (
    <div className="pt-2">
      <div className="mb-4 flex items-center gap-4">
        <CategoryIcon icon={view.goal.icon} color={view.goal.color} size={56} />
        <div className="min-w-0 flex-1">
          <Amount cents={view.saved} proportional className="block text-xl font-extrabold tracking-tight" />
          <p className="text-sm text-muted">de {money(view.goal.target)}</p>
        </div>
        <span className="num text-xl font-extrabold text-accent-press">{Math.floor(view.pct)}%</span>
      </div>
      <ProgressBar pct={view.pct} color={view.done ? 'var(--color-pos)' : 'var(--color-accent)'} />
      <div className="mt-2 mb-5">
        <GoalStatus view={view} />
      </div>

      <div className="mb-5 flex gap-2">
        <Button className="flex-1" icon={<Plus size={18} />} onClick={onContribute}>
          Abonar
        </Button>
        <Button variant="secondary" className="flex-1" icon={<Pencil size={16} />} onClick={onEdit}>
          Editar
        </Button>
      </div>

      <p className="mb-2 text-sm font-bold">Historial</p>
      {contributions.length === 0 ? (
        <p className="rounded-2xl bg-info px-4 py-3 text-sm text-info-ink">Todavía no hay abonos. El primero cuenta.</p>
      ) : (
        <ul className="mb-4 divide-y divide-line rounded-2xl border border-line">
          {contributions.map((c) => (
            <li key={c.id} className="flex min-h-13 items-center gap-3 pl-4">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{shortDate(c.date)} {c.date.slice(0, 4)}</span>
                {c.note && <span className="block truncate text-xs text-muted">{c.note}</span>}
              </span>
              <Amount cents={c.amount} sign tone={c.amount < 0 ? 'neg' : 'pos'} className="font-bold" />
              <IconButton label="Borrar abono" onClick={() => setConfirmC(c.id)}>
                <X size={18} className="text-muted" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <Button variant="ghost" block className="text-neg-ink active:bg-neg-soft" icon={<Trash2 size={17} />} onClick={() => setConfirmGoal(true)}>
        Borrar meta
      </Button>

      <ConfirmSheet
        open={confirmGoal}
        title="¿Borrar esta meta?"
        confirmLabel="Borrar"
        onCancel={() => setConfirmGoal(false)}
        onConfirm={async () => {
          await deleteGoal(view.goal.id)
          setConfirmGoal(false)
          onDeleted()
          showToast('Meta borrada')
        }}
      >
        Se borran la meta y su historial de abonos. Tus cuentas no cambian.
      </ConfirmSheet>
      <ConfirmSheet
        open={confirmC !== null}
        title="¿Borrar este abono?"
        confirmLabel="Borrar"
        onCancel={() => setConfirmC(null)}
        onConfirm={async () => {
          if (confirmC) await deleteContribution(confirmC)
          setConfirmC(null)
          showToast('Abono borrado')
        }}
      />
    </div>
  )
}

function ContributeForm({ view, onClose, onCompleted }: { view: GoalView; onClose: () => void; onCompleted: () => void }) {
  const { showToast } = useApp()
  const money = useMoney()
  const [mode, setMode] = useState<'in' | 'out'>('in')
  const [amount, setAmount] = useState<number | null>(null)
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [k, setK] = useState(0)

  const quick = [10000, 50000, 100000]
  const pick = (v: number) => {
    setAmount(v)
    setK((x) => x + 1)
  }

  const save = async () => {
    if (!amount) return
    if (mode === 'out' && amount > view.saved) {
      showToast(`Solo tienes ${money(view.saved)} en esta meta`, { tone: 'error' })
      return
    }
    const { completed } = await addContribution(view.goal.id, mode === 'in' ? amount : -amount, date, note)
    if (completed) onCompleted()
    else {
      showToast(mode === 'in' ? 'Abono guardado' : 'Retiro guardado')
      onClose()
    }
  }

  return (
    <div className="pt-2">
      <Segmented
        className="mb-4"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'in', label: 'Abonar' },
          { value: 'out', label: 'Retirar' },
        ]}
      />
      <Field label="Monto">{(id) => <MoneyInput key={k} id={id} cents={amount} onChange={setAmount} />}</Field>
      {mode === 'in' && (
        <div className="-mt-1 mb-4 flex flex-wrap gap-2">
          {quick.map((q) => (
            <button key={q} type="button" onClick={() => pick(q)} className="h-11 rounded-full border border-line bg-surface px-4 text-sm font-bold">
              {money(q, { noCents: true })}
            </button>
          ))}
          {view.remaining > 0 && (
            <button type="button" onClick={() => pick(view.remaining)} className="h-11 rounded-full bg-accent-soft px-4 text-sm font-bold text-accent-press">
              Lo que falta
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          {(id) => (
            <input id={id} type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-13 w-full rounded-2xl border border-line bg-surface px-3 text-base font-semibold" />
          )}
        </Field>
        <Field label="Nota (opcional)">{(id) => <TextInput id={id} value={note} maxLength={60} onChange={(e) => setNote(e.target.value)} />}</Field>
      </div>
      <Button size="lg" block disabled={!amount} onClick={save}>
        {mode === 'in' ? 'Guardar abono' : 'Guardar retiro'}
      </Button>
      <p className="mt-3 text-center text-xs text-muted">El abono se registra en la meta. Si también moviste dinero a tu cuenta de ahorro, regístralo como transferencia.</p>
    </div>
  )
}

function GoalForm({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { showToast } = useApp()
  const [name, setName] = useState(goal?.name ?? '')
  const [target, setTarget] = useState<number | null>(goal?.target ?? null)
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const [icon, setIcon] = useState(goal?.icon ?? 'piggy-bank')
  const [color, setColor] = useState(goal?.color ?? '#3B5BFF')
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    if (!name.trim()) return setError('Ponle un nombre a tu meta.')
    if (!target) return setError('¿Cuánto quieres juntar?')
    await saveGoal({ id: goal?.id, name: name.trim(), target, deadline: deadline || undefined, icon, color })
    showToast(goal ? 'Meta guardada' : 'Meta creada')
    onClose()
  }

  return (
    <div className="pt-2">
      <div className="mb-5 flex items-center gap-3">
        <CategoryIcon icon={icon} color={color} size={52} />
        <p className="min-w-0 flex-1 truncate text-lg font-extrabold">{name.trim() || 'Tu meta'}</p>
      </div>
      <Field label="Nombre">{(id) => <TextInput id={id} value={name} maxLength={40} placeholder="Ej. Laptop nueva" onChange={(e) => (setName(e.target.value), setError(null))} />}</Field>
      <Field label="¿Cuánto quieres juntar?">{(id) => <MoneyInput id={id} cents={target} onChange={(v) => (setTarget(v), setError(null))} />}</Field>
      <Field label="Fecha objetivo (opcional)" hint="Con fecha te decimos cuánto ahorrar al mes.">
        {(id) => (
          <div className="flex gap-2">
            <input
              id={id}
              type="date"
              value={deadline}
              min={todayISO()}
              onChange={(e) => setDeadline(e.target.value)}
              className="h-13 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-3 text-base font-semibold"
            />
            {deadline && (
              <IconButton label="Quitar fecha" tone="surface" className="size-13" onClick={() => setDeadline('')}>
                <X size={18} />
              </IconButton>
            )}
          </div>
        )}
      </Field>
      <div className="mb-4">
        <p className="mb-1 text-sm font-bold">Color</p>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div className="mb-5">
        <p className="mb-2 text-sm font-bold">Ícono</p>
        <IconPicker value={icon} color={color} onChange={setIcon} />
      </div>
      {error && <p className="mb-3 text-sm font-semibold text-neg-ink">{error}</p>}
      <div className={cn('sticky bottom-0 -mx-5 bg-elev px-5 pt-2 pb-1')}>
        <Button size="lg" block onClick={save}>
          {goal ? 'Guardar cambios' : 'Crear meta'}
        </Button>
      </div>
    </div>
  )
}
