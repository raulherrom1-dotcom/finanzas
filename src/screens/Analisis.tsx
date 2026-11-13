import { useMemo, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartPie, ChevronRight } from 'lucide-react'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { EmptyState } from '../components/ui/Callout'
import { Button } from '../components/ui/Button'
import { Amount, useMoney } from '../components/ui/Amount'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { useFinance } from '../hooks/useFinance'
import { byId } from '../db/queries'
import { useApp } from '../state/app'
import { categoryBreakdown, categoryColors, monthlySeries, niceRange, niceTicks, type MonthPoint } from '../lib/analysis'
import { currentMonth, monthLabel, monthName } from '../lib/dates'
import { COLORS } from '../lib/palette'
import { cn } from '../lib/cn'
import { openMovimientos } from './Movimientos'

let rememberedMonth = currentMonth()

/** Eje compacto: $0, $500, $5 mil, $1.2 M */
function axisMoney(cents: number): string {
  const p = Math.abs(cents) / 100
  const sign = cents < 0 ? '−' : ''
  if (p >= 1_000_000) return `${sign}$${+(p / 1_000_000).toFixed(1)} M`
  if (p >= 1000) return `${sign}$${+(p / 1000).toFixed(1)} mil`
  return `${sign}$${Math.round(p)}`
}

const AXIS = { fontSize: 12, fill: COLORS.muted, fontFamily: 'inherit', fontWeight: 600 }

export function Analisis() {
  const { txs, categories, loaded } = useFinance()
  const { privacy } = useApp()
  const money = useMoney()
  const [month, setMonthState] = useState(rememberedMonth)
  const setMonth = (m: string) => {
    rememberedMonth = m
    setMonthState(m)
    setSelected(null)
  }
  const [selected, setSelected] = useState<string | null>(null)

  const cats = useMemo(() => byId(categories), [categories])
  const colors = useMemo(() => categoryColors(txs), [txs])
  const { slices, total } = useMemo(() => categoryBreakdown(txs, cats, colors, month), [txs, cats, colors, month])
  const series = useMemo(() => monthlySeries(txs, month, 6), [txs, month])
  const current = series[series.length - 1]

  if (!loaded) return null
  if (txs.length === 0) {
    return (
      <>
        <ScreenHeader title="Análisis" />
        <div className="px-4">
          <EmptyState icon={ChartPie} title="Aquí verás tus gráficas">
            En cuanto registres movimientos aparecerá en qué se va tu dinero mes a mes. También puedes cargar datos de ejemplo en Ajustes.
          </EmptyState>
        </div>
      </>
    )
  }

  const sel = slices.find((s) => s.key === selected) ?? null
  const maxExpense = Math.max(...series.map((p) => p.expense), 1)
  const barTicks = niceTicks(maxExpense, 3)
  const lineTicks = niceRange(Math.min(...series.map((p) => p.balance)), Math.max(...series.map((p) => p.balance)), 4)

  return (
    <>
      <ScreenHeader title="Análisis" />
      <div className="space-y-4 px-4">
        <MonthSwitcher month={month} onChange={setMonth} />

        <div className="card grid grid-cols-3 divide-x divide-line p-0">
          <Figure label="Ingresos">
            <Amount cents={current.income} tone="pos" hideCents={current.income >= 1_000_000} className="font-extrabold" />
          </Figure>
          <Figure label="Gastos">
            <Amount cents={current.expense} hideCents={current.expense >= 1_000_000} className="font-extrabold" />
          </Figure>
          <Figure label="Balance">
            <Amount cents={current.balance} tone={current.balance < 0 ? 'neg' : 'ink'} hideCents={Math.abs(current.balance) >= 1_000_000} className="font-extrabold" />
          </Figure>
        </div>

        {/* Dona: gasto por categoría */}
        <ChartCard title="En qué se fue tu dinero" subtitle={`Gasto por categoría en ${monthName(month)}`}>
          {total === 0 ? (
            <p className="rounded-2xl bg-info px-4 py-3 text-sm text-info-ink">No hay gastos en {monthName(month)}.</p>
          ) : (
            <>
              <div className="relative mx-auto h-[220px] w-full max-w-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={slices}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={72}
                      outerRadius={104}
                      paddingAngle={slices.length > 1 ? 1.2 : 0}
                      cornerRadius={4}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                      onClick={(_, i) => setSelected((s) => (s === slices[i].key ? null : slices[i].key))}
                      rootTabIndex={-1}
                    >
                      {slices.map((s) => (
                        <Cell key={s.key} fill={s.color} fillOpacity={sel && sel.key !== s.key ? 0.3 : 1} className="cursor-pointer outline-none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="max-w-[120px] truncate text-xs font-semibold text-muted">{sel ? sel.name : 'Gastaste'}</span>
                  <Amount cents={sel ? sel.value : total} proportional hideCents className="text-xl font-extrabold tracking-tight" />
                  {sel && <span className="text-xs font-semibold text-muted">{Math.round(sel.pct)}% del mes</span>}
                </div>
              </div>

              <ul className="mt-3" aria-label="Gasto por categoría">
                {slices.map((s) => {
                  const on = s.key === selected
                  return (
                    <li key={s.key}>
                      <button
                        type="button"
                        onClick={() => setSelected(on ? null : s.key)}
                        aria-pressed={on}
                        className={cn('flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left', on ? 'bg-bg' : 'active:bg-bg')}
                      >
                        <span className="size-3 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{s.name}</span>
                        <span className="num w-10 text-right text-sm text-muted">{Math.round(s.pct)}%</span>
                        <Amount cents={s.value} className="w-[92px] text-right text-sm font-bold" />
                      </button>
                      {on && s.categoryIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => openMovimientos({ period: { kind: 'month', month }, categoryIds: s.categoryIds, type: 'expense' })}
                          className="mb-1 ml-8 flex min-h-11 items-center gap-1 text-sm font-bold text-accent-press"
                        >
                          Ver movimientos
                          <ChevronRight size={16} />
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </ChartCard>

        {/* Barras: gasto por mes */}
        <ChartCard title="Gasto por mes" subtitle="Últimos 6 meses. Toca una barra para ver ese mes.">
          <div className="-ml-2 h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 24, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={COLORS.line} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} />
                <YAxis
                  width={privacy ? 8 : 64}
                  ticks={barTicks}
                  domain={[0, barTicks[barTicks.length - 1]]}
                  tickFormatter={(v: number) => (privacy ? '' : axisMoney(v))}
                  tickLine={false}
                  axisLine={false}
                  tick={AXIS}
                />
                <Tooltip cursor={{ fill: COLORS.accentSoft, opacity: 0.6 }} content={<ChartTip render={(p) => [['Gastos', money(p.expense)]]} />} />
                <Bar dataKey="expense" maxBarSize={24} radius={[4, 4, 0, 0]} onClick={(d) => setMonth((d as unknown as MonthPoint).month)} className="cursor-pointer">
                  {series.map((p) => (
                    <Cell key={p.month} fill={COLORS.accent} fillOpacity={p.month === month ? 1 : 0.35} />
                  ))}
                  <LabelList
                    dataKey="expense"
                    position="top"
                    content={(props) => {
                      const { x, y, width, index } = props as { x: number; y: number; width: number; index: number }
                      if (series[index]?.month !== month || privacy) return null
                      return (
                        <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={800} fill={COLORS.ink}>
                          {axisMoney(series[index].expense)}
                        </text>
                      )
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Línea: tendencia del balance */}
        <ChartCard title="Tendencia de tu balance" subtitle="Lo que entró menos lo que salió, cada mes.">
          <div className="-ml-2 h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 24, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={COLORS.line} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} padding={{ left: 12, right: 12 }} />
                <YAxis
                  width={privacy ? 8 : 64}
                  ticks={lineTicks}
                  domain={[lineTicks[0], lineTicks[lineTicks.length - 1]]}
                  tickFormatter={(v: number) => (privacy ? '' : axisMoney(v))}
                  tickLine={false}
                  axisLine={false}
                  tick={AXIS}
                />
                <ReferenceLine y={0} stroke={COLORS.muted} strokeOpacity={0.5} />
                <Tooltip
                  cursor={{ stroke: COLORS.line, strokeWidth: 1 }}
                  content={
                    <ChartTip
                      render={(p) => [
                        ['Balance', money(p.balance, { sign: true })],
                        ['Entró', money(p.income)],
                        ['Salió', money(p.expense)],
                      ]}
                    />
                  }
                />
                <Line
                  type="linear"
                  dataKey="balance"
                  stroke={COLORS.accent}
                  strokeWidth={2}
                  strokeLinecap="round"
                  dot={(props: { cx?: number; cy?: number; index?: number }) => (
                    <circle
                      key={props.index}
                      cx={props.cx}
                      cy={props.cy}
                      r={series[props.index ?? 0]?.month === month ? 6 : 4}
                      fill={COLORS.accent}
                      stroke={COLORS.surface}
                      strokeWidth={2}
                    />
                  )}
                  activeDot={{ r: 7, fill: COLORS.accent, stroke: COLORS.surface, strokeWidth: 2 }}
                >
                  <LabelList
                    dataKey="balance"
                    content={(props) => {
                      const { x, y, index } = props as { x: number; y: number; index: number }
                      if (series[index]?.month !== month || privacy) return null
                      // A la izquierda del punto si es el último mes; si no, arriba (o abajo si es negativo).
                      const below = series[index].balance < 0
                      const last = index === series.length - 1
                      return (
                        <text x={last ? x - 12 : x} y={last ? y + 4 : below ? y + 24 : y - 14} textAnchor={last ? 'end' : 'middle'} fontSize={12} fontWeight={800} fill={COLORS.ink}>
                          {axisMoney(series[index].balance)}
                        </text>
                      )
                    }}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {month !== currentMonth() && (
          <Button variant="secondary" block onClick={() => setMonth(currentMonth())}>
            Volver a {monthLabel(currentMonth())}
          </Button>
        )}
      </div>
    </>
  )
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 px-3 py-3">
      <p className="text-xs text-muted">{label}</p>
      <div className="truncate text-[15px]">{children}</div>
    </div>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="text-base font-extrabold tracking-tight">{title}</h2>
      {subtitle && <p className="mb-3 text-sm text-muted">{subtitle}</p>}
      {children}
    </section>
  )
}

/** Tooltip de las gráficas: fondo oscuro, texto blanco, cifras alineadas. */
function ChartTip({ active, payload, render }: { active?: boolean; payload?: Array<{ payload: MonthPoint }>; render: (p: MonthPoint) => Array<[string, string]> }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs text-ink shadow-card">
      <p className="mb-1 font-bold">{monthLabel(p.month)}</p>
      {render(p).map(([k, v]) => (
        <p key={k} className="flex justify-between gap-4">
          <span className="opacity-80">{k}</span>
          <span className="num font-bold">{v}</span>
        </p>
      ))}
    </div>
  )
}
