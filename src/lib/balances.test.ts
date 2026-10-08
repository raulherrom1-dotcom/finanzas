import { describe, expect, it } from 'vitest'
import type { Account, Transaction } from '../db/types'
import { cardStatus, computeBalances } from './balances'

const acc = (p: Partial<Account> & Pick<Account, 'id' | 'type'>): Account => ({
  name: p.id,
  initialBalance: 0,
  color: '#3B5BFF',
  archived: false,
  order: 0,
  createdAt: 0,
  ...p,
})

let n = 0
const tx = (p: Partial<Transaction> & Pick<Transaction, 'type' | 'amount' | 'date'>): Transaction => ({
  id: `t${++n}`,
  createdAt: 0,
  updatedAt: 0,
  ...p,
})

describe('saldos', () => {
  it('suma ingresos, resta gastos y mueve transferencias', () => {
    const cash = acc({ id: 'cash', type: 'cash', initialBalance: 50000 })
    const debit = acc({ id: 'debit', type: 'debit' })
    const b = computeBalances(
      [cash, debit],
      [
        tx({ type: 'income', amount: 1000000, date: '2026-10-10', accountId: 'debit' }),
        tx({ type: 'expense', amount: 12550, date: '2026-10-11', accountId: 'cash' }),
        tx({ type: 'transfer', amount: 200000, date: '2026-10-12', accountId: 'debit', toAccountId: 'cash' }),
        tx({ type: 'expense', amount: 999, date: '2026-10-12' }), // sin cuenta: no afecta saldos
      ],
    )
    expect(b.get('cash')).toBe(50000 - 12550 + 200000)
    expect(b.get('debit')).toBe(1000000 - 200000)
  })
})

describe('tarjeta de crédito', () => {
  // Corte el día 5, pago el 25
  const card = acc({ id: 'tdc', type: 'credit', creditLimit: 2000000, cutoffDay: 5, dueDay: 25 })
  const base = [
    tx({ type: 'expense', amount: 300000, date: '2026-09-20', accountId: 'tdc' }), // entra en el corte del 5 oct
    tx({ type: 'expense', amount: 50000, date: '2026-10-08', accountId: 'tdc' }), // siguiente corte
  ]

  it('calcula corte, fecha límite y pago para no generar intereses', () => {
    const s = cardStatus(card, base, '2026-10-10')!
    expect(s.lastCutoff).toBe('2026-10-05')
    expect(s.nextCutoff).toBe('2026-11-05')
    expect(s.dueDate).toBe('2026-10-25')
    expect(s.debt).toBe(350000)
    expect(s.statementBalance).toBe(300000)
    expect(s.remainingToPay).toBe(300000)
    expect(s.available).toBe(1650000)
    expect(s.level).toBe('pending')
  })

  it('avisa cuando faltan 5 días o menos', () => {
    expect(cardStatus(card, base, '2026-10-21')!.level).toBe('soon')
  })

  it('marca vencido si pasó la fecha y falta pagar', () => {
    const s = cardStatus(card, base, '2026-10-27')!
    expect(s.level).toBe('overdue')
    expect(s.daysToDue).toBe(-2)
  })

  it('descuenta pagos hechos después del corte', () => {
    const paid = [...base, tx({ type: 'transfer', amount: 300000, date: '2026-10-15', accountId: 'debit', toAccountId: 'tdc' })]
    const s = cardStatus(card, paid, '2026-10-21')!
    expect(s.remainingToPay).toBe(0)
    expect(s.level).toBe('ok')
    expect(s.debt).toBe(50000)
  })

  it('pago en el mes siguiente cuando el día de pago es menor al de corte', () => {
    const c2 = acc({ id: 'c2', type: 'credit', cutoffDay: 28, dueDay: 18 })
    const s = cardStatus(c2, [tx({ type: 'expense', amount: 1000, date: '2026-09-27', accountId: 'c2' })], '2026-10-02')!
    expect(s.lastCutoff).toBe('2026-09-28')
    expect(s.dueDate).toBe('2026-10-18')
  })

  it('corte el 31 en meses cortos', () => {
    const c3 = acc({ id: 'c3', type: 'credit', cutoffDay: 31, dueDay: 20 })
    const s = cardStatus(c3, [], '2026-02-28')!
    expect(s.lastCutoff).toBe('2026-02-28')
    expect(s.level).toBe('none')
  })
})
