import { useState } from 'react'
import { Sheet } from '../components/ui/Sheet'
import { Button } from '../components/ui/Button'
import { DaySelect, Field } from '../components/ui/Form'
import { setSetting } from '../db/db'
import { useApp } from '../state/app'
import { CALENDAR, periodStart, type PayCycle } from '../lib/budget'
import { addDays, addMonths, monthName, shortDate, type MonthKey } from '../lib/dates'

/** Día de pago habitual y, si este mes te pagaron otro día, la fecha real de inicio del periodo. */
export function PeriodSheet({ open, month, cycle, onClose }: { open: boolean; month: MonthKey; cycle: PayCycle; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="¿Cuándo empieza tu periodo?">
      {open && <PeriodForm month={month} cycle={cycle} onClose={onClose} />}
    </Sheet>
  )
}

function PeriodForm({ month, cycle, onClose }: { month: MonthKey; cycle: PayCycle; onClose: () => void }) {
  const { showToast } = useApp()
  const [payDay, setPayDay] = useState(cycle.payDay)
  const [start, setStart] = useState(periodStart(cycle, month))

  const next: PayCycle = { payDay, starts: cycle.starts }
  // El inicio tiene que quedar entre el periodo anterior y el siguiente
  const min = addDays(periodStart(next, addMonths(month, -1)), 1)
  const max = addDays(periodStart(next, addMonths(month, 1)), -1)
  const error = start < min || start > max ? `Elige una fecha entre el ${shortDate(min)} y el ${shortDate(max)}.` : null

  const save = async () => {
    if (error) return
    const starts = { ...cycle.starts }
    if (start === periodStart({ payDay, starts: {} }, month)) delete starts[month]
    else starts[month] = start
    await setSetting('payCycle', { payDay, starts })
    showToast('Periodo guardado')
    onClose()
  }

  return (
    <div className="pt-2">
      <Field label="Normalmente me pagan el" hint="Tu presupuesto va de un pago al día antes del siguiente.">
        {(id) => (
          <DaySelect
            id={id}
            value={payDay}
            onChange={(d) => {
              const day = d ?? CALENDAR.payDay
              setPayDay(day)
              setStart(periodStart({ payDay: day, starts: cycle.starts }, month))
            }}
          />
        )}
      </Field>

      <Field label={`El periodo de ${monthName(month)} empieza el`} hint="Si este mes te pagan otro día, cámbialo solo aquí." error={error}>
        {(id) => (
          <input
            id={id}
            type="date"
            value={start}
            min={min}
            max={max}
            onChange={(e) => e.target.value && setStart(e.target.value)}
            className="h-13 w-full rounded-2xl border border-line bg-surface px-3 text-base font-semibold"
          />
        )}
      </Field>

      <Button size="lg" block disabled={!!error} onClick={save}>
        Guardar
      </Button>
    </div>
  )
}
