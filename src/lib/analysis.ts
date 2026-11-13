import type { Category, Cents, Transaction } from '../db/types'
import { CHART_COLORS } from './palette'
import { addMonths, monthOf, monthShortName, type MonthKey } from './dates'

export const OTHER_COLOR = CHART_COLORS[7]
const SERIES = CHART_COLORS.slice(0, 7)

/**
 * Color fijo por categoría: las 7 con más gasto histórico reciben los colores en el orden
 * pedido; las demás se agrupan en "Otros" (gris). Así una categoría conserva su color
 * al cambiar de mes (el color sigue a la categoría, no a su lugar en el mes).
 */
export function categoryColors(txs: Transaction[]): Map<string, string> {
  const totals = new Map<string, number>()
  for (const t of txs) if (t.type === 'expense') totals.set(t.categoryId ?? '__none__', (totals.get(t.categoryId ?? '__none__') ?? 0) + t.amount)
  const ranked = [...totals.entries()].filter(([id]) => id !== '__none__').sort((a, b) => b[1] - a[1])
  return new Map(ranked.slice(0, SERIES.length).map(([id], i) => [id, SERIES[i]]))
}

export interface Slice {
  key: string
  name: string
  value: Cents
  color: string
  pct: number
  categoryIds: string[]
}

/** Gasto del mes por categoría para la dona. Las categorías sin color fijo van a "Otros". */
export function categoryBreakdown(txs: Transaction[], cats: Map<string, Category>, colors: Map<string, string>, month: MonthKey): { slices: Slice[]; total: Cents } {
  const by = new Map<string, number>()
  let total = 0
  for (const t of txs) {
    if (t.type !== 'expense' || monthOf(t.date) !== month) continue
    const k = t.categoryId ?? '__none__'
    by.set(k, (by.get(k) ?? 0) + t.amount)
    total += t.amount
  }
  const slices: Slice[] = []
  const other: Slice = { key: '__other__', name: 'Otros', value: 0, color: OTHER_COLOR, pct: 0, categoryIds: [] }
  for (const [id, value] of by) {
    const color = colors.get(id)
    if (color) slices.push({ key: id, name: cats.get(id)?.name ?? 'Sin categoría', value, color, pct: 0, categoryIds: [id] })
    else {
      other.value += value
      if (id !== '__none__') other.categoryIds.push(id)
    }
  }
  slices.sort((a, b) => b.value - a.value)
  if (other.value > 0) slices.push(other)
  for (const s of slices) s.pct = total > 0 ? (s.value / total) * 100 : 0
  return { slices, total }
}

export interface MonthPoint {
  month: MonthKey
  label: string
  income: Cents
  expense: Cents
  balance: Cents
}

/** Los últimos `n` meses que terminan en `end`. */
export function monthlySeries(txs: Transaction[], end: MonthKey, n = 6): MonthPoint[] {
  const months = Array.from({ length: n }, (_, i) => addMonths(end, i - n + 1))
  const idx = new Map(months.map((m, i) => [m, i]))
  const pts: MonthPoint[] = months.map((m) => ({ month: m, label: monthShortName(m), income: 0, expense: 0, balance: 0 }))
  for (const t of txs) {
    const i = idx.get(monthOf(t.date))
    if (i === undefined) continue
    if (t.type === 'income') pts[i].income += t.amount
    else if (t.type === 'expense') pts[i].expense += t.amount
  }
  for (const p of pts) p.balance = p.income - p.expense
  return pts
}

/** Marcas del eje en números redondos: 0, 2 mil, 4 mil… */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0]
  const raw = max / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw
  const ticks: number[] = []
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Math.round(v))
  if (ticks[ticks.length - 1] < max) ticks.push(Math.round(ticks[ticks.length - 1] + step))
  return ticks
}

/** Marcas redondas que cubren valores negativos y positivos (pasos 1, 2 o 5, sin ".5"). */
export function niceRange(min: number, max: number, count = 4): number[] {
  const lo = Math.min(0, min)
  const hi = Math.max(0, max)
  if (lo === hi) return [0]
  const raw = (hi - lo) / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((x) => x >= raw) ?? raw
  const ticks: number[] = []
  for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step * 0.001; v += step) ticks.push(Math.round(v))
  return ticks
}

/**
 * Hallazgos del mes en texto. Devuelve datos (no frases) para que la pantalla formatee los montos
 * respetando el modo privacidad. En el mes en curso compara contra los mismos días del mes anterior,
 * para no comparar medio mes contra un mes completo.
 */
export type Insight =
  | { kind: 'pace'; spent: Cents; diffPct: number; prevMonth: MonthKey; partial: boolean }
  | { kind: 'kept'; pct: number }
  | { kind: 'overspent'; amount: Cents }
  | { kind: 'category'; categoryId: string; name: string; diffPct: number; prevMonth: MonthKey }
  | { kind: 'top'; categoryId: string; name: string; pct: number }
  | { kind: 'biggest'; name: string; amount: Cents; date: string }
  | { kind: 'daily'; perDay: Cents }

const MIN_CATEGORY = 10_000 // $100: cambios en categorías más chicas no son noticia

export function monthInsights(txs: Transaction[], cats: Map<string, Category>, month: MonthKey, today: string): Insight[] {
  const prevMonth = addMonths(month, -1)
  const partial = monthOf(today) === month
  // Último día que se compara: hoy en el mes en curso; el mes completo si ya pasó.
  const upTo = partial ? Number(today.slice(8, 10)) : 31
  const day = (d: string) => Number(d.slice(8, 10))

  let spent = 0
  let prevSpent = 0
  let income = 0
  let biggest: Transaction | null = null
  const byCat = new Map<string, Cents>()
  const prevByCat = new Map<string, Cents>()
  for (const t of txs) {
    const m = monthOf(t.date)
    if (m === month && t.type === 'income') income += t.amount
    if (t.type !== 'expense') continue
    const k = t.categoryId ?? '__none__'
    if (m === month) {
      spent += t.amount
      byCat.set(k, (byCat.get(k) ?? 0) + t.amount)
      if (!biggest || t.amount > biggest.amount) biggest = t
    } else if (m === prevMonth && day(t.date) <= upTo) {
      prevSpent += t.amount
      prevByCat.set(k, (prevByCat.get(k) ?? 0) + t.amount)
    }
  }
  if (spent === 0 && income === 0) return []

  const out: Insight[] = []
  if (prevSpent > 0) out.push({ kind: 'pace', spent, diffPct: ((spent - prevSpent) / prevSpent) * 100, prevMonth, partial })

  if (income > 0) out.push(spent > income ? { kind: 'overspent', amount: spent - income } : { kind: 'kept', pct: ((income - spent) / income) * 100 })

  // La categoría que más cambió en pesos, si el cambio es notable
  let change: { id: string; delta: number; pct: number } | null = null
  for (const [id, prev] of prevByCat) {
    if (id === '__none__' || prev < MIN_CATEGORY) continue
    const now = byCat.get(id) ?? 0
    const pct = ((now - prev) / prev) * 100
    if (Math.abs(pct) < 15) continue
    if (!change || Math.abs(now - prev) > Math.abs(change.delta)) change = { id, delta: now - prev, pct }
  }
  if (change) out.push({ kind: 'category', categoryId: change.id, name: cats.get(change.id)?.name ?? 'Sin categoría', diffPct: change.pct, prevMonth })

  const top = [...byCat].filter(([id]) => id !== '__none__').sort((a, b) => b[1] - a[1])[0]
  if (top && spent > 0 && byCat.size > 1) out.push({ kind: 'top', categoryId: top[0], name: cats.get(top[0])?.name ?? 'Sin categoría', pct: (top[1] / spent) * 100 })

  if (biggest && byCat.size > 1) {
    const b = biggest as Transaction
    out.push({ kind: 'biggest', name: b.note?.trim() || cats.get(b.categoryId ?? '')?.name || 'Un gasto', amount: b.amount, date: b.date })
  }

  if (spent > 0) {
    const [y, m] = month.split('-').map(Number)
    const days = partial ? upTo : new Date(Date.UTC(y, m, 0)).getUTCDate()
    out.push({ kind: 'daily', perDay: Math.round(spent / days) })
  }
  return out
}
