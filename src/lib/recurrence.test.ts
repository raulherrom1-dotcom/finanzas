import { describe, expect, it } from 'vitest'
import { dueDates, firstOccurrence, nextOccurrence } from './recurrence'

describe('recurrencias', () => {
  it('mensual el día 10 (sueldo)', () => {
    const r = { frequency: 'monthly' as const, startDate: '2026-08-10', nextDate: '2026-08-10' }
    expect(dueDates(r, '2026-10-07')).toEqual({ dates: ['2026-08-10', '2026-09-10'], nextDate: '2026-10-10' })
    expect(dueDates(r, '2026-10-10').dates).toHaveLength(3)
  })

  it('mensual el 31 se ajusta a meses cortos y regresa al 31', () => {
    const r = { frequency: 'monthly' as const, startDate: '2026-01-31', nextDate: '2026-01-31' }
    expect(dueDates(r, '2026-04-30').dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('quincenal: 15 y último día', () => {
    expect(firstOccurrence('biweekly', '2026-02-03')).toBe('2026-02-15')
    expect(firstOccurrence('biweekly', '2026-02-16')).toBe('2026-02-28')
    expect(firstOccurrence('biweekly', '2026-02-15')).toBe('2026-02-15')
    const r = { frequency: 'biweekly' as const, startDate: '2026-02-15', nextDate: '2026-02-15' }
    expect(dueDates(r, '2026-04-01').dates).toEqual(['2026-02-15', '2026-02-28', '2026-03-15', '2026-03-31'])
  })

  it('semanal', () => {
    expect(nextOccurrence('weekly', '2026-12-28', 28)).toBe('2027-01-04')
  })

  it('se pone al corriente aunque pase mucho tiempo sin abrir la app', () => {
    const r = { frequency: 'monthly' as const, startDate: '2025-01-05', nextDate: '2025-01-05' }
    const { dates, nextDate } = dueDates(r, '2026-10-07')
    expect(dates).toHaveLength(22)
    expect(nextDate).toBe('2026-11-05')
  })

  it('respeta la fecha final', () => {
    const r = { frequency: 'weekly' as const, startDate: '2026-10-01', nextDate: '2026-10-01', endDate: '2026-10-15' }
    expect(dueDates(r, '2026-12-01').dates).toEqual(['2026-10-01', '2026-10-08', '2026-10-15'])
  })
})
