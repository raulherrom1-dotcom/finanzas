import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { runRecurring, saveRecurring, scheduleNext } from './recurring'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('generación de recurrentes', () => {
  it('genera lo pendiente desde la última vez y no duplica', async () => {
    await saveRecurring({ name: 'Sueldo', type: 'income', amount: 950000, categoryId: 'cat-sueldo', accountId: 'acc-efectivo', frequency: 'monthly', startDate: '2026-07-10', active: true })
    expect(await runRecurring('2026-10-07')).toBe(3) // jul, ago, sep
    expect(await runRecurring('2026-10-07')).toBe(0)
    expect(await runRecurring('2026-10-10')).toBe(1)
    const txs = await db.transactions.orderBy('date').toArray()
    expect(txs.map((t) => t.date)).toEqual(['2026-07-10', '2026-08-10', '2026-09-10', '2026-10-10'])
    expect(txs[0].note).toBe('Sueldo')
    expect(txs[0].method).toBe('cash')
    const r = await db.recurring.toArray()
    expect(r[0].nextDate).toBe('2026-11-10')
  })

  it('no vuelve a crear un movimiento que borraste', async () => {
    await saveRecurring({ name: 'Spotify', type: 'expense', amount: 12900, frequency: 'monthly', startDate: '2026-10-01', active: true })
    await runRecurring('2026-10-07')
    await db.transactions.clear()
    expect(await runRecurring('2026-10-07')).toBe(0)
  })

  it('pausado no genera', async () => {
    await saveRecurring({ name: 'Gym', type: 'expense', amount: 49900, frequency: 'monthly', startDate: '2026-09-05', active: false })
    expect(await runRecurring('2026-10-07')).toBe(0)
  })

  it('al reprogramar no rellena fechas pasadas', () => {
    expect(scheduleNext('monthly', '2026-01-15', { from: '2026-10-07' })).toBe('2026-10-15')
    expect(scheduleNext('biweekly', '2026-01-01', { from: '2026-10-16' })).toBe('2026-10-31')
    expect(scheduleNext('monthly', '2026-01-15', { from: '2026-10-07', after: '2026-10-15' })).toBe('2026-11-15')
  })
})
