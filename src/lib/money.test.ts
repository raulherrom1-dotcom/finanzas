import { describe, expect, it } from 'vitest'
import { centsToInput, formatCompact, formatKeypad, formatMXN, keypadToCents, parseAmount, pressKey, splitMXN } from './money'

describe('formatMXN', () => {
  it('formatea pesos mexicanos con comas y dos decimales', () => {
    expect(formatMXN(123450)).toBe('$1,234.50')
    expect(formatMXN(0)).toBe('$0.00')
    expect(formatMXN(5)).toBe('$0.05')
    expect(formatMXN(100000000)).toBe('$1,000,000.00')
  })
  it('signos', () => {
    expect(formatMXN(-2500)).toBe('−$25.00')
    expect(formatMXN(2500, { sign: true })).toBe('+$25.00')
  })
  it('sin centavos', () => {
    expect(formatMXN(123450, { noCents: true })).toBe('$1,235')
  })
})

describe('splitMXN', () => {
  it('separa entero y centavos', () => {
    expect(splitMXN(123450)).toEqual({ sign: '', whole: '$1,234', cents: '.50' })
    expect(splitMXN(-7)).toEqual({ sign: '−', whole: '$0', cents: '.07' })
  })
})

describe('formatCompact', () => {
  it('abrevia montos grandes', () => {
    expect(formatCompact(1234500)).toBe('$12.3 mil')
    expect(formatCompact(950000)).toBe('$9,500')
    expect(formatCompact(250000000)).toBe('$2.5 M')
  })
})

describe('parseAmount', () => {
  it('lee distintos formatos', () => {
    expect(parseAmount('1,234.50')).toBe(123450)
    expect(parseAmount('$1234.5')).toBe(123450)
    expect(parseAmount('1234')).toBe(123400)
    expect(parseAmount('.5')).toBe(50)
    expect(parseAmount('-250.00')).toBe(-25000)
    expect(parseAmount('(250.00)')).toBe(-25000)
    expect(parseAmount('1.234,50')).toBe(123450)
    expect(parseAmount('250,5')).toBe(25050)
    expect(parseAmount(' $ 99.99 MXN')).toBe(9999)
  })
  it('redondea el tercer decimal', () => {
    expect(parseAmount('0.125')).toBe(13)
    expect(parseAmount('0.124')).toBe(12)
  })
  it('evita errores de flotantes', () => {
    expect(parseAmount('0.1')! + parseAmount('0.2')!).toBe(30)
    expect(parseAmount('19.99')).toBe(1999)
  })
  it('rechaza texto inválido', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('.')).toBeNull()
  })
})

describe('teclado', () => {
  const type = (keys: string[]) => keys.reduce(pressKey, '')
  it('arma montos', () => {
    expect(type(['1', '2', '5', '0', '.', '5'])).toBe('1250.5')
    expect(keypadToCents('1250.5')).toBe(125050)
  })
  it('no permite más de dos decimales ni dos puntos', () => {
    expect(type(['1', '.', '2', '3', '4', '.'])).toBe('1.23')
  })
  it('quita ceros a la izquierda', () => {
    expect(type(['0', '0', '7'])).toBe('7')
    expect(type(['.', '5'])).toBe('0.5')
  })
  it('borra', () => {
    expect(pressKey('12.3', 'back')).toBe('12.')
  })
  it('muestra separador de miles', () => {
    expect(formatKeypad('1234567.8')).toBe('1,234,567.8')
    expect(formatKeypad('')).toBe('0')
  })
  it('centsToInput', () => {
    expect(centsToInput(123405)).toBe('1234.05')
  })
})
