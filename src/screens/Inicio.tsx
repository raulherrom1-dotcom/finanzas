import { useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronRight, CreditCard, Eye, EyeOff, Gauge, PiggyBank, Settings, Target, type LucideIcon } from 'lucide-react'
import { IconButton } from '../components/ui/Button'
import { Amount, useMoney } from '../components/ui/Amount'
import { Callout } from '../components/ui/Callout'
import { SectionTitle } from '../components/ui/ScreenHeader'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import { ProgressBar, ProgressRing } from '../components/ui/Progress'
import { TxRow } from '../components/TxRow'
import { Button } from '../components/ui/Button'
import { useSetting } from '../db/db'
import { byId } from '../db/queries'
import { useFinance } from '../hooks/useFinance'
import { useApp } from '../state/app'
import { navigate } from '../lib/router'
import { currentMonth, longDate, monthDayCount, monthName, relativeDays, shortDate, todayISO } from '../lib/dates'
import { monthSavings, monthTotals, totalBudget } from '../lib/budget'
import { goalViews, nearestGoal } from '../lib/goals'
import { upcomingPayments } from '../lib/upcoming'
import { cn } from '../lib/cn'

export function Inicio() {
  const name = useSetting('userName', 'Raúl')
  const { privacy, togglePrivacy, openQuickAdd } = useApp()
  const { txs, accounts, categories, budgets, recurring, goals, contributions, loaded } = useFinance()
  const money = useMoney()
  const month = currentMonth()
  const today = todayISO()

  const totals = useMemo(() => monthTotals(txs, month), [txs, month])
  const savings = useMemo(() => monthSavings(txs, contributions, accounts, month), [txs, contributions, accounts, month])
  const total = useMemo(() => totalBudget(budgets, categories, totals.expense, month, today), [budgets, categories, totals.expense, month, today])
  const cats = useMemo(() => byId(categories), [categories])
  const accs = useMemo(() => byId(accounts), [accounts])
  const latest = useMemo(
    () => [...txs].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1)).slice(0, 5),
    [txs],
  )
  const upcoming = useMemo(() => upcomingPayments(recurring, accounts, txs, today, 14).slice(0, 4), [recurring, accounts, txs, today])
  const goal = useMemo(() => nearestGoal(goalViews(goals, contributions, today)), [goals, contributions, today])

  const day = Number(today.slice(8, 10))
  const days = monthDayCount(month)

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
        {/* Balance del mes: el elemento protagonista */}
        <section className="hero-gradient relative overflow-hidden rounded-hero p-5 text-white shadow-hero" aria-label={`Balance de ${monthName(month)}`}>
          <HeroGlyph />
          <p className="relative text-sm font-semibold">Balance de {monthName(month)}</p>
          <Amount cents={totals.balance} proportional className="relative mt-1 block text-2xl font-extrabold tracking-tight" />

          <div className="relative mt-4 grid grid-cols-2 gap-2">
            <HeroStat icon={ArrowDownLeft} label="Entró" cents={totals.income} />
            <HeroStat icon={ArrowUpRight} label="Salió" cents={totals.expense} />
          </div>

          <div className="relative mt-5">
            <PaceTrack spentPct={total ? total.pct : totals.income > 0 ? (totals.expense / totals.income) * 100 : 0} elapsedPct={(day / days) * 100} />
            <p className="mt-2 text-[13px] font-semibold">
              Día {day} de {days}.{' '}
              {total
                ? `Llevas ${Math.round(total.pct)}% de tu presupuesto.`
                : totals.income > 0
                  ? `Has gastado el ${Math.round((totals.expense / totals.income) * 100)}% de lo que entró.`
                  : 'Registra tus ingresos para ver tu ritmo.'}
            </p>
          </div>
        </section>

        {/* Presupuesto total */}
        {total ? (
          <button type="button" onClick={() => navigate('/presupuesto')} className="card flex w-full items-center gap-4 p-4 text-left active:bg-accent-soft">
            <ProgressRing pct={total.pct} size={76} stroke={9} level={total.level}>
              <span className={cn('num text-base font-extrabold', total.level === 'over' ? 'text-neg-ink' : total.level === 'warn' ? 'text-warn-ink' : 'text-ink')}>
                {Math.round(total.pct)}%
              </span>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted">Presupuesto del mes</p>
              {total.remaining >= 0 ? (
                <p className="text-base font-bold">
                  Te quedan <Amount cents={total.remaining} className="font-extrabold" /> de {money(total.budget, { noCents: true })}
                </p>
              ) : (
                <p className="text-base font-bold text-neg-ink">
                  Te pasaste por <Amount cents={-total.remaining} className="font-extrabold" />
                </p>
              )}
              {total.perDay !== null && <p className="mt-0.5 text-sm text-muted">Hasta {money(total.perDay)} al día</p>}
              {total.level === 'warn' && <p className="mt-0.5 text-sm font-semibold text-warn-ink">Ya vas en más del 80%</p>}
            </div>
            <ChevronRight size={20} className="shrink-0 text-muted" />
          </button>
        ) : (
          loaded && (
            <Callout icon={Gauge} title="Ponle límite a tu mes" action={<Button size="sm" onClick={() => navigate('/presupuesto')}>Crear presupuesto</Button>}>
              Te avisamos cuando llegues al 80% y si te pasas.
            </Callout>
          )
        )}

        {/* Ingresos, gastos y ahorro */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile icon={ArrowDownLeft} label="Ingresos" cents={totals.income} tone="pos" iconClass="bg-pos-soft text-pos-ink" />
          <StatTile icon={ArrowUpRight} label="Gastos" cents={totals.expense} tone="ink" iconClass="bg-accent-soft text-accent-press" />
          <StatTile icon={PiggyBank} label="Ahorro" cents={savings} tone="ink" iconClass="bg-accent-soft text-accent" />
        </div>

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
              {latest.map((t) => (
                <TxRow
                  key={t.id}
                  tx={t}
                  category={t.categoryId ? cats.get(t.categoryId) : undefined}
                  account={t.accountId ? accs.get(t.accountId) : undefined}
                  toAccount={t.toAccountId ? accs.get(t.toAccountId) : undefined}
                  showDate={t.date === today ? undefined : shortDate(t.date)}
                />
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

function HeroStat({ icon: Icon, label, cents }: { icon: LucideIcon; label: string; cents: number }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-ink/15 px-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15">
        <Icon size={17} strokeWidth={2.4} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold">{label}</span>
        <Amount cents={cents} className="block truncate text-[15px] font-extrabold" />
      </span>
    </div>
  )
}

/** Pista del ritmo del mes: el relleno es lo gastado y la marca es el día del mes. */
function PaceTrack({ spentPct, elapsedPct }: { spentPct: number; elapsedPct: number }) {
  const w = Math.max(0, Math.min(100, spentPct))
  const ahead = spentPct > elapsedPct + 8
  return (
    <div className="relative h-2 rounded-full bg-white/25" aria-hidden>
      <div className={cn('animate-fill-x absolute inset-y-0 left-0 rounded-full', ahead ? 'bg-warn' : 'bg-white')} style={{ width: `${w}%` }} />
      <div className="absolute -top-1.5 h-5 w-[3px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_2px_rgba(59,91,255,0.6)]" style={{ left: `${elapsedPct}%` }} />
    </div>
  )
}

/** Trazo decorativo de la gráfica ascendente del ícono, muy sutil, en la esquina clara. */
function HeroGlyph() {
  return (
    <svg className="pointer-events-none absolute -top-2 -right-6 h-36 w-48 opacity-[0.14]" viewBox="0 0 512 512" aria-hidden>
      <g fill="none" stroke="#fff" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round">
        <path d="M140 340 L226 254 L288 310 L380 214" />
        <path d="M318 206 L384 206 L384 272" />
      </g>
    </svg>
  )
}

function StatTile({ icon: Icon, label, cents, tone, iconClass }: { icon: LucideIcon; label: string; cents: number; tone: 'pos' | 'ink'; iconClass: string }) {
  return (
    <div className="card min-w-0 p-3">
      <span className={cn('mb-2 flex size-8 items-center justify-center rounded-full', iconClass)}>
        <Icon size={16} strokeWidth={2.4} />
      </span>
      <p className="text-xs text-muted">{label}</p>
      <Amount cents={cents} tone={tone} hideCents={Math.abs(cents) >= 1_000_000} className="block truncate text-[15px] font-extrabold tracking-tight" />
    </div>
  )
}
