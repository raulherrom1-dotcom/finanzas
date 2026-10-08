import { describe, expect, it } from 'vitest'
import type { Category, Transaction } from '../db/types'
import { categoryBreakdown, categoryColors, monthlySeries, niceRange, niceTicks } from './analysis'

const t = (p: Partial<Transaction>): Transaction => ({ id: Math.random().toString(), type: 'expense', amount: 0, date: '2026-10-05', createdAt: 0, updatedAt: 0, ...p })
const cats = new Map<string, Category>(
  Array.from({ length: 10 }, (_, i) => [`c${i}`, { id: `c${i}`, name: `Cat ${i}`, icon: 'x', color: '#000', kind: 'expense' as const, archived: false, order: i }]),
)

describe('colores de categoría', () => {
  it('el color sigue a la categoría aunque cambie su lugar en el mes', () => {
    const txs = [
      t({ categoryId: 'c0', amount: 9000, date: '2026-09-01' }),
      t({ categoryId: 'c1', amount: 5000, date: '2026-09-01' }),
      t({ categoryId: 'c1', amount: 500, date: '2026-10-01' }),
      t({ categoryId: 'c0', amount: 100, date: '2026-10-01' }),
    ]
    const colors = categoryColors(txs)
    const oct = categoryBreakdown(txs, cats, colors, '2026-10')
    expect(oct.slices[0].key).toBe('c1') // c1 gastó más en octubre…
    expect(oct.slices[0].color).toBe('#10B981') // …pero conserva su color (segundo histórico)
    expect(oct.slices[1].color).toBe('#3B5BFF')
  })

  it('más de 7 categorías se agrupan en Otros (gris, al final)', () => {
    const txs = Array.from({ length: 10 }, (_, i) => t({ categoryId: `c${i}`, amount: (10 - i) * 1000 }))
    const { slices, total } = categoryBreakdown(txs, cats, categoryColors(txs), '2026-10')
    expect(slices).toHaveLength(8)
    expect(slices[7]).toMatchObject({ name: 'Otros', value: 3000 + 2000 + 1000, color: '#94A3B8' })
    expect(total).toBe(55000)
    expect(Math.round(slices.reduce((s, x) => s + x.pct, 0))).toBe(100)
  })
})

describe('series mensuales', () => {
  it('ingresos, gastos y balance de los últimos meses', () => {
    const txs = [t({ type: 'income', amount: 1000, date: '2026-09-10' }), t({ amount: 400, date: '2026-09-11' }), t({ amount: 50, date: '2026-04-01' })]
    const s = monthlySeries(txs, '2026-10', 6)
    expect(s.map((p) => p.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'])
    expect(s[4]).toMatchObject({ income: 1000, expense: 400, balance: 600, label: 'sep' })
  })
  it('marcas redondas del eje', () => {
    expect(niceTicks(1_150_000)).toEqual([0, 500_000, 1_000_000, 1_500_000])
    expect(niceTicks(0)).toEqual([0])
    expect(niceRange(-460000, 300000)).toEqual([-600000, -400000, -200000, 0, 200000, 400000])
    expect(niceRange(100000, 900000)).toEqual([0, 500000, 1000000])
  })
})
