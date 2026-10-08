import { describe, expect, it } from 'vitest'
import type { Category, Transaction } from '../db/types'
import { DEFAULT_CATEGORIES } from '../db/defaults'
import { buildRows, categoryHistory, decodeBytes, detectDateFormat, guessMapping, importHashes, parseBankDate, parseCsv, possibleDuplicates, suggestCategory, transactionsToCsv } from './csv'

// Ejemplos inventados con el formato típico de bancos mexicanos
const CARGO_ABONO = `Fecha,Descripción,Cargo,Abono,Saldo
05/10/2026,UBER *TRIP,"89.50",,"10,410.50"
06/10/2026,NETFLIX.COM,219.00,,"10,191.50"
10/10/2026,PAGO DE NOMINA EMPRESA SA,,"12,000.00","22,191.50"
10/10/2026,UBER *TRIP,"89.50",,"22,102.00"`

const UNA_COLUMNA = `Fecha;Concepto;Importe
2026-10-05;OXXO REFORMA;-45,50
2026-10-07;SPEI RECIBIDO;1.500,00
2026-10-07;WALMART EXPRESS;-623,10`

describe('lectura de CSV', () => {
  it('lee Windows-1252 sin romper acentos', () => {
    const bytes = new Uint8Array([0x46, 0x65, 0x63, 0x68, 0x61, 0x3b, 0x44, 0x65, 0x73, 0x63, 0x72, 0x69, 0x70, 0x63, 0x69, 0xf3, 0x6e]) // "Fecha;Descripción" en 1252
    expect(decodeBytes(bytes.buffer)).toBe('Fecha;Descripción')
  })
  it('detecta encabezados Cargo/Abono', () => {
    const rows = parseCsv(CARGO_ABONO)
    const m = guessMapping(rows)
    expect(m).toMatchObject({ hasHeader: true, dateCol: 0, descCol: 1, amountMode: 'split', debitCol: 2, creditCol: 3, dateFormat: 'dmy' })
    const out = buildRows(rows, m)
    expect(out.map((r) => [r.date, r.amount, r.type])).toEqual([
      ['2026-10-05', 8950, 'expense'],
      ['2026-10-06', 21900, 'expense'],
      ['2026-10-10', 1200000, 'income'],
      ['2026-10-10', 8950, 'expense'],
    ])
  })
  it('una columna con punto y coma y coma decimal', () => {
    const rows = parseCsv(UNA_COLUMNA)
    const m = guessMapping(rows)
    expect(m).toMatchObject({ amountMode: 'single', amountCol: 2, descCol: 1, expensesAre: 'negative' })
    expect(buildRows(rows, m).map((r) => [r.date, r.amount, r.type])).toEqual([
      ['2026-10-05', 4550, 'expense'],
      ['2026-10-07', 150000, 'income'],
      ['2026-10-07', 62310, 'expense'],
    ])
  })
  it('estado de cuenta de tarjeta con cargos en positivo', () => {
    const rows = parseCsv('Fecha,Concepto,Monto\n01/10/2026,SPOTIFY,129.00\n02/10/2026,CINEPOLIS,180.00')
    const m = guessMapping(rows)
    expect(m.expensesAre).toBe('positive')
    expect(buildRows(rows, m).every((r) => r.type === 'expense')).toBe(true)
  })
})

describe('fechas del banco', () => {
  it('varios formatos', () => {
    expect(parseBankDate('05/10/2026', 'dmy')).toBe('2026-10-05')
    expect(parseBankDate('5/10/26', 'dmy')).toBe('2026-10-05')
    expect(parseBankDate('2026-10-05', 'dmy')).toBe('2026-10-05')
    expect(parseBankDate('05-OCT-2026', 'dmy')).toBe('2026-10-05')
    expect(parseBankDate('5 dic 2026', 'dmy')).toBe('2026-12-05')
    expect(parseBankDate('05/10/2026 14:33', 'dmy')).toBe('2026-10-05')
    expect(parseBankDate('10/05/2026', 'mdy')).toBe('2026-10-05')
    expect(parseBankDate('31/02/2026', 'dmy')).toBeNull()
  })
  it('detecta mes/día si algún día pasa de 12', () => {
    expect(detectDateFormat(['10/25/2026', '10/05/2026'])).toBe('mdy')
    expect(detectDateFormat(['05/10/2026', '06/10/2026'])).toBe('dmy')
  })
})

describe('duplicados', () => {
  const rows = buildRows(parseCsv(CARGO_ABONO), guessMapping(parseCsv(CARGO_ABONO)))
  it('la misma fila repetida en el archivo tiene huellas distintas; reimportar da las mismas', () => {
    const a = importHashes(rows, 'acc')
    const b = importHashes(rows, 'acc')
    expect(a).toEqual(b)
    expect(new Set(a).size).toBe(4)
    expect(importHashes(rows, 'otra')[0]).not.toBe(a[0])
  })
  it('marca posibles duplicados contra registros manuales', () => {
    const manual: Transaction[] = [{ id: 'm', type: 'expense', amount: 21900, date: '2026-10-06', createdAt: 0, updatedAt: 0 }]
    expect([...possibleDuplicates(rows, manual)]).toEqual([1])
  })
})

describe('categoría sugerida', () => {
  const cats = DEFAULT_CATEGORIES as Category[]
  it('por palabras clave', () => {
    const h = new Map<string, string>()
    expect(suggestCategory('UBER *TRIP', 'expense', cats, h)).toBe('cat-transporte')
    expect(suggestCategory('UBER EATS', 'expense', cats, h)).toBe('cat-comida')
    expect(suggestCategory('NETFLIX.COM', 'expense', cats, h)).toBe('cat-suscripciones')
    expect(suggestCategory('PAGO DE NOMINA EMPRESA', 'income', cats, h)).toBe('cat-sueldo')
    expect(suggestCategory('ALGO RARO', 'expense', cats, h)).toBe('cat-otros-gasto')
  })
  it('aprende de lo que ya categorizaste', () => {
    const h = categoryHistory([{ id: 'x', type: 'expense', amount: 1, date: '2026-01-01', note: 'OXXO REFORMA', categoryId: 'cat-comida', createdAt: 0, updatedAt: 0 }])
    expect(suggestCategory('oxxo reforma', 'expense', cats, h)).toBe('cat-comida')
  })
})

describe('exportar', () => {
  it('CSV con BOM, gastos en negativo y nombres', () => {
    const csv = transactionsToCsv(
      [{ id: '1', type: 'expense', amount: 12550, date: '2026-10-07', categoryId: 'c', accountId: 'a', note: 'Tacos, con "salsa"', createdAt: 0, updatedAt: 0 }],
      new Map([['c', { name: 'Comida' } as Category]]),
      new Map([['a', { name: 'Efectivo' } as never]]),
    )
    expect(csv.startsWith('﻿Fecha,Tipo,Monto,Categoría,Cuenta,Cuenta destino,Nota')).toBe(true)
    expect(csv).toContain('2026-10-07,Gasto,-125.50,Comida,Efectivo,,"Tacos, con ""salsa"""')
  })
})
