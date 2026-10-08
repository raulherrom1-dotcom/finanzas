import { describe, expect, it } from 'vitest'
import { addDays, addMonths, addMonthsToDate, dayLabel, daysBetween, isValidISODate, monthEnd, monthLabel, relativeDays, shortDate, todayISO, weekStart } from './dates'

describe('zona horaria de Ciudad de México', () => {
  it('a las 11 pm en CDMX ya es el día siguiente en UTC, pero hoy sigue siendo hoy', () => {
    // 2026-10-08 05:30 UTC = 2026-10-07 23:30 en CDMX (UTC-6, sin horario de verano)
    expect(todayISO(new Date('2026-10-08T05:30:00Z'))).toBe('2026-10-07')
    expect(todayISO(new Date('2026-10-08T06:00:00Z'))).toBe('2026-10-08')
  })
  it('fin de mes', () => {
    expect(todayISO(new Date('2026-11-01T03:00:00Z'))).toBe('2026-10-31')
  })
})

describe('aritmética de fechas', () => {
  it('suma días cruzando meses y años', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('suma meses', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })
  it('31 de enero + 1 mes = 28 de febrero', () => {
    expect(addMonthsToDate('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonthsToDate('2026-02-28', 1, 31)).toBe('2026-03-31')
  })
  it('días entre fechas', () => {
    expect(daysBetween('2026-10-01', '2026-10-31')).toBe(30)
  })
  it('semana empieza en lunes', () => {
    expect(weekStart('2026-10-07')).toBe('2026-10-05') // miércoles → lunes
    expect(weekStart('2026-10-11')).toBe('2026-10-05') // domingo → lunes anterior
    expect(weekStart('2026-10-05')).toBe('2026-10-05')
  })
  it('último día del mes', () => {
    expect(monthEnd('2028-02')).toBe('2028-02-29')
  })
  it('valida fechas', () => {
    expect(isValidISODate('2026-02-30')).toBe(false)
    expect(isValidISODate('2026-02-28')).toBe(true)
  })
})

describe('etiquetas en español', () => {
  it('meses y días', () => {
    expect(monthLabel('2026-10')).toBe('Octubre 2026')
    expect(shortDate('2026-10-07')).toBe('7 oct')
    expect(dayLabel('2026-10-07', '2026-10-07')).toBe('Hoy')
    expect(dayLabel('2026-10-06', '2026-10-07')).toBe('Ayer')
    expect(dayLabel('2026-10-05', '2026-10-07')).toBe('Lunes 5 oct')
    expect(relativeDays('2026-10-10', '2026-10-07')).toBe('en 3 días')
  })
})
