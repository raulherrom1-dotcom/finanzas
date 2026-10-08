import { describe, expect, it } from 'vitest'
import type { Account, Category, Transaction } from '../db/types'
import { DEFAULT_FILTERS, filterTransactions, groupByDay, totals } from './filters'

const cats = new Map<string, Category>([
  ['c1', { id: 'c1', name: 'Café', icon: 'coffee', color: '#F5A524', kind: 'expense', archived: false, order: 0 }],
  ['c2', { id: 'c2', name: 'Sueldo', icon: 'briefcase', color: '#10B981', kind: 'income', archived: false, order: 1 }],
])
const accs = new Map<string, Account>([
  ['a1', { id: 'a1', name: 'BBVA débito', type: 'debit', initialBalance: 0, color: '#3B5BFF', archived: false, order: 0, createdAt: 0 }],
])
const t = (id: string, p: Partial<Transaction>): Transaction => ({ id, type: 'expense', amount: 100, date: '2026-10-05', createdAt: 0, updatedAt: 0, ...p })

const txs = [
  t('1', { categoryId: 'c1', amount: 4550, note: 'Latte con Ana', accountId: 'a1', date: '2026-10-05', createdAt: 1 }),
  t('2', { categoryId: 'c2', type: 'income', amount: 1000000, date: '2026-10-10' }),
  t('3', { categoryId: 'c1', amount: 3000, date: '2026-09-30' }),
  t('4', { categoryId: 'c1', amount: 2000, date: '2026-10-05', createdAt: 5 }),
]

const f = (p: Partial<typeof DEFAULT_FILTERS>) => ({ ...DEFAULT_FILTERS, period: { kind: 'month' as const, month: '2026-10' }, ...p })

describe('filtros de movimientos', () => {
  it('filtra por mes y ordena del más reciente', () => {
    expect(filterTransactions(txs, f({}), cats, accs).map((x) => x.id)).toEqual(['2', '4', '1'])
  })
  it('busca sin importar acentos ni mayúsculas', () => {
    expect(filterTransactions(txs, f({ q: 'cafe' }), cats, accs).map((x) => x.id)).toEqual(['4', '1'])
    expect(filterTransactions(txs, f({ q: 'ANA' }), cats, accs).map((x) => x.id)).toEqual(['1'])
    expect(filterTransactions(txs, f({ q: 'bbva' }), cats, accs).map((x) => x.id)).toEqual(['1'])
  })
  it('busca por monto', () => {
    expect(filterTransactions(txs, f({ q: '45.50' }), cats, accs).map((x) => x.id)).toEqual(['1'])
  })
  it('filtra por tipo, categoría y cuenta', () => {
    expect(filterTransactions(txs, f({ type: 'income' }), cats, accs).map((x) => x.id)).toEqual(['2'])
    expect(filterTransactions(txs, f({ categoryIds: ['c2'] }), cats, accs).map((x) => x.id)).toEqual(['2'])
    expect(filterTransactions(txs, f({ accountIds: ['a1'] }), cats, accs).map((x) => x.id)).toEqual(['1'])
  })
  it('todo el tiempo', () => {
    expect(filterTransactions(txs, f({ period: { kind: 'all' } }), cats, accs)).toHaveLength(4)
  })
  it('agrupa por día y suma', () => {
    const g = groupByDay(filterTransactions(txs, f({}), cats, accs))
    expect(g.map((x) => [x.date, x.net])).toEqual([
      ['2026-10-10', 1000000],
      ['2026-10-05', -6550],
    ])
    expect(totals(txs)).toEqual({ income: 1000000, expense: 9550 })
  })
})
