import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { buildBackup, readBackup, restoreBackup } from './backup'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('respaldo JSON', () => {
  it('exporta e importa sin perder datos ni centavos', async () => {
    await db.transactions.add({ id: 't1', type: 'expense', amount: 12550, date: '2026-10-07', categoryId: 'cat-comida', createdAt: 1, updatedAt: 1 })
    await db.settings.put({ key: 'userName', value: 'Raúl' })
    const text = JSON.stringify(await buildBackup())

    await db.transactions.clear()
    await db.transactions.add({ id: 'otro', type: 'income', amount: 1, date: '2026-01-01', createdAt: 0, updatedAt: 0 })
    await restoreBackup(readBackup(text))

    const txs = await db.transactions.toArray()
    expect(txs).toHaveLength(1)
    expect(txs[0]).toMatchObject({ id: 't1', amount: 12550 })
    expect((await db.categories.count()) > 10).toBe(true)
    expect((await db.settings.get('userName'))?.value).toBe('Raúl')
  })

  it('rechaza archivos que no son respaldos', () => {
    expect(() => readBackup('hola')).toThrow(/no es JSON/)
    expect(() => readBackup('{"app":"otra"}')).toThrow(/no es un respaldo de Finanzas/)
    expect(() => readBackup('{"app":"finanzas","version":1,"data":{"transactions":[{"id":"x","date":"2026-01-01","amount":1.5}]}}')).toThrow(/dañados/)
  })
})
