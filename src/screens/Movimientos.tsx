import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, CalendarRange, Search, SearchX, SlidersHorizontal, X } from 'lucide-react'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { EmptyState } from '../components/ui/Callout'
import { Button, IconButton } from '../components/ui/Button'
import { Amount } from '../components/ui/Amount'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { TxRow } from '../components/TxRow'
import { Sheet } from '../components/ui/Sheet'
import { Segmented } from '../components/ui/Form'
import { CategoryChips } from '../components/CategoryChips'
import { useApp } from '../state/app'
import { byId, useAccounts, useCategories, useTransactionsBetween } from '../db/queries'
import { db } from '../db/db'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  filterTransactions,
  groupByDay,
  periodLabel,
  periodRange,
  presetPeriods,
  samePeriod,
  totals,
  type Period,
  type TxFilters,
} from '../lib/filters'
import { currentMonth, dayLabel, todayISO } from '../lib/dates'
import { cn } from '../lib/cn'
import { navigate } from '../lib/router'
import type { TxType } from '../db/types'

// Los filtros se recuerdan mientras la app está abierta.
let remembered: TxFilters = DEFAULT_FILTERS

/** Abre Movimientos con filtros ya puestos (por ejemplo, desde una gráfica). */
export function openMovimientos(filters: Partial<TxFilters>) {
  remembered = { ...DEFAULT_FILTERS, ...filters }
  navigate('/movimientos')
}

const PAGE = 120

export function Movimientos() {
  const { openQuickAdd } = useApp()
  const [f, setF] = useState<TxFilters>(remembered)
  const [sheet, setSheet] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    remembered = f
    setLimit(PAGE)
  }, [f])

  const categories = useCategories({ includeArchived: true })
  const accounts = useAccounts({ includeArchived: true })
  const cats = useMemo(() => byId(categories), [categories])
  const accs = useMemo(() => byId(accounts), [accounts])
  const anyTx = useLiveQuery(() => db.transactions.count(), [])

  const { from, to } = periodRange(f.period)
  const txs = useTransactionsBetween(from, to)
  const list = useMemo(() => (txs ? filterTransactions(txs, f, cats, accs) : []), [txs, f, cats, accs])
  const groups = useMemo(() => groupByDay(list.slice(0, limit)), [list, limit])
  const sum = useMemo(() => totals(list), [list])
  const today = todayISO()

  // Carga más filas al llegar al final
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setLimit((l) => l + PAGE))
    io.observe(el)
    return () => io.disconnect()
  }, [groups.length])

  const nFilters = activeFilterCount(f)
  const update = (p: Partial<TxFilters>) => setF((prev) => ({ ...prev, ...p }))

  if (anyTx === 0) {
    return (
      <>
        <ScreenHeader title="Movimientos" />
        <div className="px-4">
          <EmptyState icon={ArrowLeftRight} title="Todavía no hay movimientos" action={<Button onClick={() => openQuickAdd()}>Registrar movimiento</Button>}>
            Registra tu primer gasto o ingreso con el botón +.
          </EmptyState>
        </div>
      </>
    )
  }

  return (
    <>
      <ScreenHeader
        title="Movimientos"
        right={
          <span className="relative">
            <IconButton label={nFilters ? `Filtros (${nFilters} activos)` : 'Filtros'} tone={nFilters ? 'soft' : 'surface'} onClick={() => setSheet(true)}>
              <SlidersHorizontal size={20} strokeWidth={2.2} />
            </IconButton>
            {nFilters > 0 && (
              <span className="pointer-events-none absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-extrabold text-white ring-2 ring-bg">
                {nFilters}
              </span>
            )}
          </span>
        }
      />

      <div className="sticky top-0 z-10 bg-bg/35 px-4 pt-1 pb-3 backdrop-blur-2xl">
        <label className="relative block">
          <Search size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={f.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Buscar movimientos"
            enterKeyHint="search"
            aria-label="Buscar movimientos"
            className="h-12 w-full rounded-full border border-line bg-surface pr-12 pl-11 text-base font-medium outline-none placeholder:text-muted focus:border-accent focus:bg-bg [&::-webkit-search-cancel-button]:hidden"
          />
          {f.q && (
            <button type="button" aria-label="Borrar búsqueda" onClick={() => update({ q: '' })} className="absolute top-0 right-0 flex size-12 items-center justify-center text-muted">
              <X size={18} strokeWidth={2.4} />
            </button>
          )}
        </label>
      </div>

      <div className="px-4">
        {f.period.kind === 'month' ? (
          <MonthSwitcher className="mb-3" month={f.period.month} onChange={(month) => update({ period: { kind: 'month', month } })} />
        ) : (
          <div className="mb-3 flex items-center gap-2">
            <button type="button" onClick={() => setSheet(true)} className="flex min-h-11 flex-1 items-center gap-2 rounded-full bg-accent-soft px-4 text-sm font-bold text-accent-press">
              <CalendarRange size={18} />
              {periodLabel(f.period)}
            </button>
            <IconButton label="Volver a este mes" tone="surface" onClick={() => update({ period: { kind: 'month', month: currentMonth() } })}>
              <X size={18} strokeWidth={2.4} />
            </IconButton>
          </div>
        )}

        <ActiveChips f={f} update={update} cats={cats} accs={accs} />

        <div className="mb-3 flex items-center justify-between gap-3 px-1 text-sm">
          <span className="text-muted">
            {list.length} {list.length === 1 ? 'movimiento' : 'movimientos'}
          </span>
          <span className="flex gap-3">
            {(sum.income > 0 || sum.expense === 0) && (
              <span>
                <span className="text-muted">Entró </span>
                <Amount cents={sum.income} className="font-bold" tone="pos" />
              </span>
            )}
            {(sum.expense > 0 || sum.income === 0) && (
              <span>
                <span className="text-muted">Salió </span>
                <Amount cents={sum.expense} className="font-bold" />
              </span>
            )}
          </span>
        </div>

        {list.length === 0 && txs !== undefined ? (
          <EmptyState
            icon={SearchX}
            title="Nada coincide"
            action={
              <Button variant="secondary" onClick={() => setF({ ...DEFAULT_FILTERS, period: f.period })}>
                Quitar búsqueda y filtros
              </Button>
            }
          >
            Prueba con otra palabra o cambia el periodo.
          </EmptyState>
        ) : (
          groups.map((g) => (
            <section key={g.date} className="mb-2">
              <div className="flex items-baseline justify-between px-2 pt-2 pb-1">
                <h2 className="text-sm font-bold text-muted">{dayLabel(g.date, today)}</h2>
                {g.net !== 0 && <Amount cents={g.net} sign className="text-xs font-semibold text-muted" />}
              </div>
              <div className="-mx-2">
                {g.items.map((t) => (
                  <TxRow
                    key={t.id}
                    tx={t}
                    category={t.categoryId ? cats.get(t.categoryId) : undefined}
                    account={t.accountId ? accs.get(t.accountId) : undefined}
                    toAccount={t.toAccountId ? accs.get(t.toAccountId) : undefined}
                  />
                ))}
              </div>
            </section>
          ))
        )}
        {list.length > limit && <div ref={sentinel} className="h-10" />}
      </div>

      <FiltersSheet open={sheet} onClose={() => setSheet(false)} f={f} setF={setF} resultCount={list.length} />
    </>
  )
}

function ActiveChips({
  f,
  update,
  cats,
  accs,
}: {
  f: TxFilters
  update: (p: Partial<TxFilters>) => void
  cats: Map<string, { name: string }>
  accs: Map<string, { name: string }>
}) {
  const chips: Array<{ key: string; label: string; clear: () => void }> = []
  if (f.type !== 'all') chips.push({ key: 'type', label: TYPE_LABEL[f.type], clear: () => update({ type: 'all' }) })
  for (const id of f.categoryIds)
    chips.push({ key: `c${id}`, label: cats.get(id)?.name ?? 'Categoría', clear: () => update({ categoryIds: f.categoryIds.filter((x) => x !== id) }) })
  for (const id of f.accountIds)
    chips.push({ key: `a${id}`, label: accs.get(id)?.name ?? 'Cuenta', clear: () => update({ accountIds: f.accountIds.filter((x) => x !== id) }) })
  if (!chips.length) return null
  return (
    <div className="scroll-x -mx-4 mb-3 flex gap-2 px-4">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.clear}
          aria-label={`Quitar filtro ${c.label}`}
          className="flex h-11 shrink-0 items-center gap-1 rounded-full bg-accent-soft pr-2.5 pl-3.5 text-sm font-bold text-accent-press"
        >
          {c.label}
          <X size={15} strokeWidth={2.6} />
        </button>
      ))}
    </div>
  )
}

const TYPE_LABEL: Record<TxType, string> = { expense: 'Gastos', income: 'Ingresos', transfer: 'Transferencias' }

function FiltersSheet({
  open,
  onClose,
  f,
  setF,
  resultCount,
}: {
  open: boolean
  onClose: () => void
  f: TxFilters
  setF: React.Dispatch<React.SetStateAction<TxFilters>>
  resultCount: number
}) {
  const categories = useCategories()
  const accounts = useAccounts()
  const presets = presetPeriods()
  const [custom, setCustom] = useState<{ from: string; to: string }>(() => periodRange(f.period).from.startsWith('0000') ? { from: '', to: '' } : periodRange(f.period))
  const set = (p: Partial<TxFilters>) => setF((prev) => ({ ...prev, ...p }))
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  const toggleIn = (key: 'categoryIds' | 'accountIds', id: string) => setF((prev) => ({ ...prev, [key]: toggle(prev[key], id) }))
  const isPreset = presets.some((p) => samePeriod(p.period, f.period))

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filtros"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={() => setF((prev) => ({ ...DEFAULT_FILTERS, q: prev.q }))}>
            Quitar filtros
          </Button>
          <Button size="lg" className="flex-1" onClick={onClose}>
            Ver {resultCount}
          </Button>
        </div>
      }
    >
      <p className="mb-2 text-sm font-bold">Periodo</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {presets.map((p) => {
          const on = samePeriod(p.period, f.period)
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => set({ period: p.period })}
              className={cn('h-11 rounded-full border px-4 text-sm font-bold', on ? 'border-transparent bg-accent text-white' : 'border-line bg-surface text-ink')}
            >
              {p.label}
            </button>
          )
        })}
      </div>
      <div className={cn('mb-5 grid grid-cols-2 gap-2 rounded-2xl p-2', !isPreset && f.period.kind === 'range' ? 'bg-accent-soft' : 'bg-surface')}>
        <label className="text-xs font-semibold text-muted">
          Desde
          <input
            type="date"
            value={custom.from}
            onChange={(e) => {
              const next = { ...custom, from: e.target.value }
              setCustom(next)
              if (next.from && next.to) set({ period: periodFromCustom(next) })
            }}
            className="mt-1 h-11 w-full rounded-xl border border-line bg-bg px-2 text-base font-semibold text-ink"
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Hasta
          <input
            type="date"
            value={custom.to}
            onChange={(e) => {
              const next = { ...custom, to: e.target.value }
              setCustom(next)
              if (next.from && next.to) set({ period: periodFromCustom(next) })
            }}
            className="mt-1 h-11 w-full rounded-xl border border-line bg-bg px-2 text-base font-semibold text-ink"
          />
        </label>
      </div>

      <p className="mb-2 text-sm font-bold">Tipo</p>
      <Segmented
        fit
        className="mb-5"
        value={f.type}
        onChange={(type) => set({ type })}
        options={[
          { value: 'all', label: 'Todos' },
          { value: 'expense', label: 'Gastos' },
          { value: 'income', label: 'Ingresos' },
          { value: 'transfer', label: 'Transf.' },
        ]}
      />

      <p className="mb-2 text-sm font-bold">Categorías</p>
      <div className="mb-5">
        <CategoryChips
          categories={categories.filter((c) => f.type === 'all' || f.type === c.kind)}
          isSelected={(c) => f.categoryIds.includes(c.id)}
          onPick={(c) => toggleIn('categoryIds', c.id)}
        />
      </div>

      <p className="mb-2 text-sm font-bold">Cuentas</p>
      <div className="mb-2 flex flex-wrap gap-2">
        {accounts.map((a) => {
          const on = f.accountIds.includes(a.id)
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggleIn('accountIds', a.id)}
              className={cn('h-11 rounded-full border px-4 text-sm font-semibold', on ? 'border-accent bg-accent-soft text-accent-press' : 'border-line bg-surface')}
            >
              {a.name}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

function periodFromCustom(c: { from: string; to: string }): Period {
  return c.from <= c.to ? { kind: 'range', from: c.from, to: c.to } : { kind: 'range', from: c.to, to: c.from }
}
