import { describe, expect, it } from 'vitest'
import type { Account, Budget, Category, Transaction } from '../db/types'
import { averageSpent, budgetFor, categoryBudgetLines, monthSavings, monthTotals, spentByCategory, totalBudget } from './budget'

const b = (categoryId: string, amount: number, fromMonth: string): Budget => ({ id: `${categoryId}:${fromMonth}`, categoryId, amount, fromMonth })
const t = (p: Partial<Transaction>): Transaction => ({ id: Math.random().toString(), type: 'expense', amount: 0, date: '2026-10-05', createdAt: 0, updatedAt: 0, ...p })
const cat = (id: string, kind: Category['kind'] = 'expense'): Category => ({ id, name: id, icon: 'x', color: '#000', kind, archived: false, order: 0 })

describe('presupuestos por mes', () => {
  const budgets = [b('comida', 300000, '2026-08'), b('comida', 350000, '2026-10'), b('ocio', 0, '2026-10'), b('ocio', 100000, '2026-09')]
  it('usa el más reciente vigente', () => {
    expect(budgetFor(budgets, 'comida', '2026-07')).toBeNull()
    expect(budgetFor(budgets, 'comida', '2026-09')).toBe(300000)
    expect(budgetFor(budgets, 'comida', '2026-10')).toBe(350000)
    expect(budgetFor(budgets, 'comida', '2027-03')).toBe(350000)
  })
  it('un 0 quita el presupuesto desde ese mes', () => {
    expect(budgetFor(budgets, 'ocio', '2026-09')).toBe(100000)
    expect(budgetFor(budgets, 'ocio', '2026-10')).toBeNull()
  })
})

describe('niveles 80% y excedido', () => {
  it('clasifica cada categoría', () => {
    const spent = new Map([
      ['a', 70000],
      ['b', 85000],
      ['c', 120000],
    ])
    const lines = categoryBudgetLines([cat('a'), cat('b'), cat('c')], [b('a', 100000, '2026-10'), b('b', 100000, '2026-10'), b('c', 100000, '2026-10')], spent, '2026-10')
    expect(lines.map((l) => [l.category.id, l.level])).toEqual([
      ['c', 'over'],
      ['b', 'warn'],
      ['a', 'ok'],
    ])
    expect(lines[0].remaining).toBe(-20000)
  })
})

describe('presupuesto total y ritmo', () => {
  it('usa la suma de categorías si no hay total', () => {
    const tb = totalBudget([b('a', 100000, '2026-10'), b('b', 50000, '2026-10')], [cat('a'), cat('b')], 30000, '2026-10', '2026-10-07')!
    expect(tb.implicit).toBe(true)
    expect(tb.budget).toBe(150000)
  })
  it('calcula lo que puedes gastar por día y el ritmo', () => {
    // 31 días; día 7 → 25 días restantes contando hoy
    const tb = totalBudget([b('total', 1000000, '2026-10')], [], 500000, '2026-10', '2026-10-07')!
    expect(tb.daysLeft).toBe(25)
    expect(tb.perDay).toBe(20000)
    expect(tb.pace).toBe('ahead') // 50% gastado con 22.6% del mes
  })
  it('sin presupuesto devuelve null', () => {
    expect(totalBudget([], [cat('a')], 100, '2026-10')).toBeNull()
  })
})

describe('resumen del mes', () => {
  const txs = [
    t({ type: 'income', amount: 950000, date: '2026-10-10', categoryId: 'sueldo' }),
    t({ type: 'expense', amount: 12550, date: '2026-10-02', categoryId: 'comida' }),
    t({ type: 'expense', amount: 9999, date: '2026-09-30', categoryId: 'comida' }),
    t({ type: 'transfer', amount: 100000, date: '2026-10-11', accountId: 'deb', toAccountId: 'aho' }),
    t({ type: 'transfer', amount: 20000, date: '2026-10-12', accountId: 'aho', toAccountId: 'deb' }),
  ]
  const accounts = [{ id: 'aho', type: 'savings' } as Account, { id: 'deb', type: 'debit' } as Account]
  it('ingresos, gastos y balance', () => {
    expect(monthTotals(txs, '2026-10')).toEqual({ income: 950000, expense: 12550, balance: 937450 })
    expect(spentByCategory(txs, '2026-10').get('comida')).toBe(12550)
  })
  it('ahorro = abonos a metas + transferencias netas a ahorro', () => {
    const contributions = [{ id: 'c', goalId: 'g', amount: 150000, date: '2026-10-11', createdAt: 0 }]
    expect(monthSavings(txs, contributions, accounts, '2026-10')).toBe(150000 + 100000 - 20000)
  })
  it('promedio de los meses anteriores', () => {
    const hist = [t({ amount: 30000, date: '2026-07-03' }), t({ amount: 10000, date: '2026-09-03' }), t({ amount: 999999, date: '2026-10-01' })]
    expect(averageSpent(hist, 'total', '2026-10')).toBe(20000)
  })
})
