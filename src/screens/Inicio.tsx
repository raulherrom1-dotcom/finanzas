import { useMemo } from 'react'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ChevronRight, CreditCard, Eye, EyeOff, Gauge, Settings, Target, type LucideIcon } from 'lucide-react'
import { IconButton } from '../components/ui/Button'
import { Amount, useMoney } from '../components/ui/Amount'
import { Callout } from '../components/ui/Callout'
import { SectionTitle } from '../components/ui/ScreenHeader'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import { ProgressBar, ProgressRing } from '../components/ui/Progress'
import { TxRow } from '../components/TxRow'
import { AccountCarousel } from '../components/AccountCarousel'
import { Button } from '../components/ui/Button'
import { usePayCycle, useSetting } from '../db/db'
import { activeProfile } from '../lib/profiles'
import { byId } from '../db/queries'
import { useFinance } from '../hooks/useFinance'
import { useApp } from '../state/app'
import { navigate } from '../lib/router'
import { dayLabel, daysBetween, longDate, monthEnd, monthName, relativeDays, shortDate, todayISO } from '../lib/dates'
import { computeBalances, netWorth } from '../lib/balances'
import type { TxType } from '../db/types'
import { freqOf, monthSavings, monthTotals, periodOf, periodRange, totalBudget } from '../lib/budget'
import { goalViews, nearestGoal } from '../lib/goals'
import { upcomingPayments } from '../lib/upcoming'
import { cn } from '../lib/cn'
import { BackupReminder } from '../features/backup/BackupReminder'

export function Inicio() {
  const name = useSetting('userName', activeProfile().name)
  const { privacy, togglePrivacy, openQuickAdd } = useApp()
  const { txs, accounts, categories, budgets, recurring, goals, contributions, loaded } = useFinance()
  const money = useMoney()
  const cycle = usePayCycle()
  const today = todayISO()
  const month = periodOf(cycle, today)
  const range = periodRange(cycle, month)
  const periodName = freqOf(cycle) === 'monthly' && range.from.endsWith('-01') && range.to === monthEnd(month) ? `de ${monthName(month)}` : `del ${shortDate(range.from)} al ${shortDate(range.to)}`

  const totals = useMemo(() => monthTotals(txs, month, cycle), [txs, month, cycle])
  const savings = useMemo(() => monthSavings(txs, contributions, accounts, month, cycle), [txs, contributions, accounts, month, cycle])
  const total = useMemo(() => totalBudget(budgets, categories, totals.expense, month, today, cycle), [budgets, categories, totals.expense, month, today, cycle])
  const cats = useMemo(() => byId(categories), [categories])
  const accs = useMemo(() => byId(accounts), [accounts])
  const active = useMemo(() => accounts.filter((a) => !a.archived), [accounts])
  const balances = useMemo(() => computeBalances(accounts, txs), [accounts, txs])
  const latest = useMemo(
    () => [...txs].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1)).slice(0, 6),
    [txs],
  )
  const upcoming = useMemo(() => upcomingPayments(recurring, accounts, txs, today, 14).slice(0, 4), [recurring, accounts, txs, today])
  const goal = useMemo(() => nearestGoal(goalViews(goals, contributions, today)), [goals, contributions, today])

  const day = daysBetween(range.from, today) + 1
  const days = daysBetween(range.from, range.to) + 1

  return (
    <>
      <header className="pt-safe px-4 pb-4">
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold tracking-tight">Hola, {name}</h1>
            <p className="text-sm text-muted">{longDate(today)}</p>
          </div>
          <IconButton label={privacy ? 'Mostrar montos' : 'Ocultar montos'} tone={privacy ? 'soft' : 'surface'} onClick={togglePrivacy} aria-pressed={privacy}>
            {privacy ? <EyeOff size={20} strokeWidth={2.2} /> : <Eye size={20} strokeWidth={2.2} />}
          </IconButton>
          <IconButton label="Ajustes" tone="surface" onClick={() => navigate('/ajustes')}>
            <Settings size={20} strokeWidth={2.2} />
          </IconButton>
        </div>
      </header>

      <div className="space-y-4 px-4">
        <BackupReminder />

      </div>

      {/* Cartera: tus cuentas como tarjetas */}
      <section className="mt-1" aria-label="Tus cuentas">
        <div className="mb-2 flex min-h-11 items-center justify-between gap-2 px-4">
          <h2 className="text-base font-extrabold tracking-tight">Tus cuentas</h2>
          <button type="button" onClick={() => navigate('/ajustes/cuentas')} className="flex min-h-11 items-center gap-1 text-sm font-semibold text-muted">
            Total <Amount cents={netWorth(active, balances)} className="font-extrabold text-ink" />
            <ChevronRight size={16} />
          </button>
        </div>
        {loaded && <AccountCarousel accounts={active} balances={balances} txs={txs} today={today} />}
      </section>

      <div className="mt-5 space-y-5 px-4">
        {/* Acciones rápidas */}
        <div className="grid grid-cols-3 gap-2.5">
          <QuickAction type="expense" label="Gasto" icon={ArrowUpRight} iconClass="bg-accent text-white" onPick={openQuickAdd} />
          <QuickAction type="income" label="Ingreso" icon={ArrowDownLeft} iconClass="bg-pos-ink text-white" onPick={openQuickAdd} />
          <QuickAction type="transfer" label="Transferir" icon={ArrowLeftRight} iconClass="bg-info-ink text-white" onPick={openQuickAdd} />
        </div>

        {/* Resumen del periodo y presupuesto */}
        <section className="card overflow-hidden p-0" aria-label={`Balance ${periodName}`}>
          <div className="p-5 pb-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-muted">Balance {periodName}</p>
              <p className="shrink-0 text-xs font-semibold text-muted">
                Día {day} de {days}
              </p>
            </div>
            <Amount cents={totals.balance} proportional tone={totals.balance < 0 ? 'neg' : 'ink'} className="mt-0.5 block text-2xl font-extrabold tracking-tight" />
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat label="Entró" cents={totals.income} tone="pos" />
              <MiniStat label="Salió" cents={totals.expense} tone="ink" />
              <MiniStat label="Ahorraste" cents={savings} tone="ink" />
            </div>
          </div>

          {total ? (
            <button type="button" onClick={() => navigate('/presupuesto')} className="flex w-full items-center gap-4 border-t border-line bg-bg px-5 py-4 text-left active:bg-accent-soft">
              <ProgressRing pct={total.pct} size={60} stroke={7} level={total.level}>
                <span className={cn('num text-sm font-extrabold', total.level === 'over' ? 'text-neg-ink' : total.level === 'warn' ? 'text-warn-ink' : 'text-ink')}>
                  {Math.round(total.pct)}%
                </span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                {total.remaining >= 0 ? (
                  <p className="font-bold">
                    Te quedan <Amount cents={total.remaining} className="font-extrabold" />
                  </p>
                ) : (
                  <p className="font-bold text-neg-ink">
                    Te pasaste por <Amount cents={-total.remaining} className="font-extrabold" />
                  </p>
                )}
                <p className={cn('text-sm', total.level === 'warn' ? 'font-semibold text-warn-ink' : 'text-muted')}>
                  {total.level === 'warn'
                    ? 'Ya vas en más del 80%'
                    : total.perDay !== null
                      ? `Hasta ${money(total.perDay)} al día`
                      : 'Del presupuesto del periodo'}
                </p>
              </div>
              <ChevronRight size={20} className="shrink-0 text-muted" />
            </button>
          ) : (
            loaded && (
              <div className="flex items-center gap-3 border-t border-line bg-bg px-5 py-4">
                <Gauge size={22} className="shrink-0 text-accent" />
                <p className="min-w-0 flex-1 text-sm text-muted">Ponle límite a tu periodo y te avisamos al llegar al 80%.</p>
                <Button size="sm" onClick={() => navigate('/presupuesto')}>
                  Crear
                </Button>
              </div>
            )
          )}
        </section>

        {/* Últimos movimientos */}
        <section className="pt-2">
          <SectionTitle
            action={
              latest.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => navigate('/movimientos')}>
                  Ver todos
                </Button>
              )
            }
          >
            Últimos movimientos
          </SectionTitle>
          {latest.length === 0 ? (
            loaded && (
              <Callout title="Aquí verás tus movimientos" action={<Button size="sm" onClick={() => openQuickAdd()}>Registrar el primero</Button>}>
                Toca el botón + cada vez que gastes o te paguen. Son tres toques.
              </Callout>
            )
          ) : (
            <div className="-mx-2">
              {latest.map((t, i) => (
                <div key={t.id}>
                  {t.date !== latest[i - 1]?.date && <p className="px-2 pt-2 pb-1 text-xs font-bold tracking-wide text-muted uppercase">{dayLabel(t.date, today)}</p>}
                  <TxRow
                    tx={t}
                    category={t.categoryId ? cats.get(t.categoryId) : undefined}
                    account={t.accountId ? accs.get(t.accountId) : undefined}
                    toAccount={t.toAccountId ? accs.get(t.toAccountId) : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Próximos pagos */}
        {upcoming.length > 0 && (
          <section>
            <SectionTitle
              action={
                <Button size="sm" variant="ghost" onClick={() => navigate('/ajustes/recurrentes')}>
                  Recurrentes
                </Button>
              }
            >
              Próximos pagos y cobros
            </SectionTitle>
            <ul className="card divide-y divide-line p-0">
              {upcoming.map((u) => {
                const cat = u.categoryId ? cats.get(u.categoryId) : undefined
                const urgent = u.kind === 'card' && (u.level === 'soon' || u.level === 'overdue')
                return (
                  <li key={u.key} className="flex min-h-16 items-center gap-3 px-4 py-3">
                    {u.kind === 'card' ? (
                      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', u.level === 'overdue' ? 'bg-neg-soft text-neg-ink' : urgent ? 'bg-warn-soft text-warn-ink' : 'bg-accent-soft text-accent-press')}>
                        <CreditCard size={19} strokeWidth={2.2} />
                      </span>
                    ) : (
                      <CategoryIcon icon={cat?.icon} color={cat?.color} size={40} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{u.name}</p>
                      <p className={cn('text-sm', u.level === 'overdue' ? 'font-semibold text-neg-ink' : urgent ? 'font-semibold text-warn-ink' : 'text-muted')}>
                        {u.level === 'overdue' ? `Venció ${relativeDays(u.date, today)}` : `${shortDate(u.date)}, ${relativeDays(u.date, today)}`}
                      </p>
                    </div>
                    <Amount cents={u.amount} sign={u.type === 'income'} tone={u.type === 'income' ? 'pos' : 'ink'} className="font-extrabold" />
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Meta más cercana */}
        <section>
          <SectionTitle
            action={
              goal && (
                <Button size="sm" variant="ghost" onClick={() => navigate('/ajustes/metas')}>
                  Ver metas
                </Button>
              )
            }
          >
            Meta de ahorro
          </SectionTitle>
          {goal ? (
            <button type="button" onClick={() => navigate('/ajustes/metas')} className="card w-full p-4 text-left active:bg-accent-soft">
              <div className="mb-3 flex items-center gap-3">
                <CategoryIcon icon={goal.goal.icon} color={goal.goal.color} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold">{goal.goal.name}</p>
                  <p className="text-sm text-muted">
                    {goal.goal.deadline ? `Para el ${shortDate(goal.goal.deadline)} ${goal.goal.deadline.slice(0, 4)}` : 'Sin fecha'}
                  </p>
                </div>
                <span className="num text-lg font-extrabold text-accent-press">{Math.floor(goal.pct)}%</span>
              </div>
              <ProgressBar pct={goal.pct} color="var(--color-accent)" />
              <p className="mt-2 text-sm text-muted">
                <span className="font-bold text-ink">{money(goal.saved)}</span> de {money(goal.goal.target)}
                {goal.perMonth ? `. Ahorra ${money(goal.perMonth, { noCents: true })} al mes para llegar.` : ''}
              </p>
            </button>
          ) : (
            loaded && (
              <Callout icon={Target} title="¿Para qué estás ahorrando?" action={<Button size="sm" onClick={() => navigate('/ajustes/metas')}>Crear meta</Button>}>
                Una laptop, un viaje o tu fondo de emergencia. Ve cuánto te falta.
              </Callout>
            )
          )}
        </section>
      </div>
    </>
  )
}

function QuickAction({ type, label, icon: Icon, iconClass, onPick }: { type: TxType; label: string; icon: LucideIcon; iconClass: string; onPick: (req: { type: TxType }) => void }) {
  return (
    <button type="button" onClick={() => onPick({ type })} className="card flex flex-col items-center gap-2 px-2 py-3.5 transition-transform duration-150 active:scale-[0.97]">
      <span className={cn('flex size-11 items-center justify-center rounded-2xl', iconClass)}>
        <Icon size={22} strokeWidth={2.4} />
      </span>
      <span className="text-sm font-bold">{label}</span>
    </button>
  )
}

function MiniStat({ label, cents, tone }: { label: string; cents: number; tone: 'pos' | 'ink' }) {
  return (
    <div className="min-w-0 rounded-2xl bg-bg px-3 py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <Amount cents={cents} tone={tone} hideCents={Math.abs(cents) >= 1_000_000} className="block truncate text-[15px] font-extrabold tracking-tight" />
    </div>
  )
}
