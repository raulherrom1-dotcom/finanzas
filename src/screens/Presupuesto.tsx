import { useMemo, useState } from 'react'
import { CalendarDays, Gauge, Pencil, Plus } from 'lucide-react'
import { ScreenHeader, SectionTitle } from '../components/ui/ScreenHeader'
import { Callout, EmptyState } from '../components/ui/Callout'
import { Button, IconButton } from '../components/ui/Button'
import { Amount, useMoney } from '../components/ui/Amount'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import { ProgressBar, ProgressRing } from '../components/ui/Progress'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { BudgetSheet, type BudgetTarget } from './BudgetSheet'
import { PeriodSheet } from './PeriodSheet'
import { usePayCycle } from '../db/db'
import { useFinance } from '../hooks/useFinance'
import { averageSpent, budgetFor, categoryBudgetLines, CYCLE_WORDS, freqOf, monthTotals, periodOf, periodRange, spentByCategory, totalBudget, type TotalBudget } from '../lib/budget'
import { shortDate, todayISO } from '../lib/dates'
import { cn } from '../lib/cn'

let rememberedMonth: string | null = null

export function Presupuesto() {
  const { txs, categories, budgets, loaded } = useFinance()
  const cycle = usePayCycle()
  const today = todayISO()
  const now = periodOf(cycle, today)
  const [picked, setPicked] = useState(rememberedMonth)
  const month = picked ?? now
  const setMonth = (m: string) => setPicked((rememberedMonth = m))
  const [target, setTarget] = useState<BudgetTarget | null>(null)
  const [periodOpen, setPeriodOpen] = useState(false)
  const money = useMoney()
  const range = periodRange(cycle, month)

  const spent = useMemo(() => spentByCategory(txs, month, cycle), [txs, month, cycle])
  const totals = useMemo(() => monthTotals(txs, month, cycle), [txs, month, cycle])
  const lines = useMemo(() => categoryBudgetLines(categories, budgets, spent, month), [categories, budgets, spent, month])
  const total = useMemo(() => totalBudget(budgets, categories, totals.expense, month, today, cycle), [budgets, categories, totals.expense, month, today, cycle])

  const unbudgeted = categories
    .filter((c) => c.kind === 'expense' && budgetFor(budgets, c.id, month) === null && (spent.get(c.id) ?? 0) > 0)
    .sort((a, b) => (spent.get(b.id) ?? 0) - (spent.get(a.id) ?? 0))

  const sheet = (
    <BudgetSheet
      target={target}
      month={month}
      categories={categories}
      cycle={cycle}
      current={(id) => budgetFor(budgets, id, month)}
      average={(id) => averageSpent(txs, id, month, 3, cycle)}
      onClose={() => setTarget(null)}
    />
  )

  if (!loaded) return null

  return (
    <>
      <ScreenHeader
        title="Presupuesto"
        right={
          <IconButton label="Agregar presupuesto por categoría" tone="soft" onClick={() => setTarget({ kind: 'category' })}>
            <Plus size={22} strokeWidth={2.4} />
          </IconButton>
        }
      />
      <div className="px-4">
        <MonthSwitcher className="mb-1" month={month} now={now} cycle={cycle} onChange={setMonth} />
        <button
          type="button"
          onClick={() => setPeriodOpen(true)}
          className="mb-4 flex min-h-11 w-full items-center justify-center gap-1.5 text-sm font-semibold text-muted"
        >
          <CalendarDays size={15} />
          Del {shortDate(range.from)} al {shortDate(range.to)} ·<span className="font-bold text-accent-press">Cambiar</span>
        </button>

        {!total && lines.length === 0 ? (
          <EmptyState
            icon={Gauge}
            title="Define cuánto quieres gastar"
            action={
              <div className="flex flex-col gap-2">
                <Button onClick={() => setTarget({ kind: 'total' })}>Poner presupuesto total</Button>
                <Button variant="secondary" onClick={() => setTarget({ kind: 'category' })}>
                  Por categoría
                </Button>
              </div>
            }
          >
            Pon un límite {CYCLE_WORDS[freqOf(cycle)].per} y te avisamos al llegar al 80% y si te pasas.
          </EmptyState>
        ) : (
          <>
            {total && <TotalCard total={total} isCurrent={month === now} onEdit={() => setTarget({ kind: 'total' })} />}
            {!total && (
              <Callout className="mb-5" action={<Button size="sm" onClick={() => setTarget({ kind: 'total' })}>Poner presupuesto total</Button>}>
                Aún no tienes un presupuesto total para este periodo.
              </Callout>
            )}

            {lines.length > 0 && (
              <section className="mt-6">
                <SectionTitle
                  action={
                    <Button size="sm" variant="ghost" icon={<Plus size={16} />} onClick={() => setTarget({ kind: 'category' })}>
                      Agregar
                    </Button>
                  }
                >
                  Por categoría
                </SectionTitle>
                <ul className="space-y-3">
                  {lines.map((l) => (
                    <li key={l.category.id}>
                      <button type="button" onClick={() => setTarget({ kind: 'category', category: l.category })} className="card w-full p-4 text-left active:bg-accent-soft">
                        <div className="mb-3 flex items-center gap-3">
                          <CategoryIcon icon={l.category.icon} color={l.category.color} size={40} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-bold">{l.category.name}</p>
                            <p className="text-sm text-muted">
                              {money(l.spent)} de {money(l.budget)}
                            </p>
                          </div>
                          <LeftLabel remaining={l.remaining} level={l.level} />
                        </div>
                        <ProgressBar pct={l.pct} level={l.level} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {unbudgeted.length > 0 && (
          <section className="mt-6">
            <SectionTitle>Sin presupuesto</SectionTitle>
            <ul className="overflow-hidden rounded-card border border-line">
              {unbudgeted.map((c) => (
                <li key={c.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                  <CategoryIcon icon={c.icon} color={c.color} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{c.name}</p>
                    <p className="text-sm text-muted">Gastaste {money(spent.get(c.id) ?? 0)}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setTarget({ kind: 'category', category: c })}>
                    Poner límite
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      {sheet}
      <PeriodSheet open={periodOpen} month={month} cycle={cycle} onSaved={setMonth} onClose={() => setPeriodOpen(false)} />
    </>
  )
}

function LeftLabel({ remaining, level }: { remaining: number; level: 'ok' | 'warn' | 'over' }) {
  return (
    <div className="text-right">
      <p className={cn('text-xs font-semibold', level === 'over' ? 'text-neg-ink' : level === 'warn' ? 'text-warn-ink' : 'text-muted')}>
        {remaining < 0 ? 'Te pasaste' : 'Quedan'}
      </p>
      <Amount cents={Math.abs(remaining)} tone={level === 'over' ? 'neg' : level === 'warn' ? 'warn' : 'ink'} className="text-base font-extrabold" />
    </div>
  )
}

const PACE: Record<TotalBudget['pace'], { text: string; box: string }> = {
  ahead: { text: 'Vas gastando más rápido de lo que avanza el periodo.', box: 'bg-warn-soft text-warn-ink' },
  on: { text: 'Vas al ritmo del periodo.', box: 'bg-info text-info-ink' },
  under: { text: 'Vas por debajo del ritmo del periodo. Bien.', box: 'bg-pos-soft text-pos-ink' },
}

function TotalCard({ total, isCurrent, onEdit }: { total: TotalBudget; isCurrent: boolean; onEdit: () => void }) {
  const money = useMoney()
  const over = total.level === 'over'
  return (
    <section className="card p-5">
      <div className="flex items-center gap-4">
        <ProgressRing pct={total.pct} size={112} stroke={12} level={total.level}>
          <span className={cn('num text-xl font-extrabold', over ? 'text-neg-ink' : total.level === 'warn' ? 'text-warn-ink' : 'text-ink')}>{Math.round(total.pct)}%</span>
          <span className="text-xs text-muted">usado</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">{over ? 'Te pasaste por' : 'Te quedan'}</p>
          <Amount cents={Math.abs(total.remaining)} proportional tone={over ? 'neg' : 'ink'} className="block text-xl font-extrabold tracking-tight" />
          <p className="mt-1 text-sm text-muted">
            Gastaste {money(total.spent)} de {money(total.budget)}
          </p>
        </div>
      </div>

      {isCurrent && total.perDay !== null && (
        <p className="mt-4 rounded-2xl bg-white/[0.06] px-4 py-3 text-sm ring-1 ring-white/10 ring-inset">
          Puedes gastar <strong className="num">{money(total.perDay)}</strong> al día durante los {total.daysLeft} días que quedan.
        </p>
      )}
      {over ? (
        <p className="mt-3 rounded-2xl bg-neg-soft px-4 py-3 text-sm font-semibold text-neg-ink">Ya pasaste tu presupuesto del periodo.</p>
      ) : total.level === 'warn' ? (
        <p className="mt-3 rounded-2xl bg-warn-soft px-4 py-3 text-sm font-semibold text-warn-ink">Llevas más del 80% de tu presupuesto.</p>
      ) : (
        isCurrent && <p className={cn('mt-3 rounded-2xl px-4 py-3 text-sm font-semibold', PACE[total.pace].box)}>{PACE[total.pace].text}</p>
      )}

      <button type="button" onClick={onEdit} className="mt-3 flex min-h-11 items-center gap-1.5 text-sm font-bold text-accent-press">
        <Pencil size={15} />
        {total.implicit ? 'Es la suma de tus categorías. Poner un total' : 'Cambiar presupuesto total'}
      </button>
    </section>
  )
}
