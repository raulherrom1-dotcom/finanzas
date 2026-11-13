import { useState } from 'react'
import { Sheet } from '../components/ui/Sheet'
import { Button } from '../components/ui/Button'
import { DaySelect, Field, Segmented } from '../components/ui/Form'
import { setSetting } from '../db/db'
import { FREQUENCY_LABEL, type Frequency } from '../db/types'
import { useApp } from '../state/app'
import { CALENDAR, CYCLE_WORDS, DEFAULT_WEEKDAY, freqOf, nominalStart, periodOf, periodStart, shiftPeriod, type PayCycle, type PeriodKey } from '../lib/budget'
import { addDays, shortDate, todayISO, type ISODate } from '../lib/dates'

const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const FREQS: Frequency[] = ['monthly', 'biweekly', 'weekly']

/** Cada cuándo te pagan y, si un pago cayó otro día, la fecha real de inicio de ese periodo. */
export function PeriodSheet({
  open,
  month,
  cycle,
  onSaved,
  onClose,
}: {
  open: boolean
  month: PeriodKey
  cycle: PayCycle
  /** Recibe el periodo que se editó, para mostrarlo. */
  onSaved: (key: PeriodKey) => void
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title="¿Cuándo te pagan?">
      {open && <PeriodForm month={month} cycle={cycle} onSaved={onSaved} onClose={onClose} />}
    </Sheet>
  )
}

function PeriodForm({ month, cycle, onSaved, onClose }: { month: PeriodKey; cycle: PayCycle; onSaved: (key: PeriodKey) => void; onClose: () => void }) {
  const { showToast } = useApp()
  const [freq, setFreq] = useState(freqOf(cycle))
  const [payDay, setPayDay] = useState(cycle.payDay)
  const [wd, setWd] = useState(cycle.weekday ?? DEFAULT_WEEKDAY)
  /** null = la fecha normal del periodo */
  const [startEdit, setStartEdit] = useState<ISODate | null>(null)

  const next: PayCycle = { frequency: freq, payDay, weekday: wd, starts: cycle.starts }
  // Si cambia la forma de pago, las claves de periodo cambian: se edita el periodo de hoy
  const sameScheme = freq === freqOf(cycle) && (freq !== 'weekly' || wd === (cycle.weekday ?? DEFAULT_WEEKDAY))
  const key = sameScheme ? month : periodOf(next, todayISO())
  const start = startEdit ?? periodStart(next, key)
  const end = addDays(periodStart(next, shiftPeriod(next, key, 1)), -1)
  // El inicio tiene que quedar entre el periodo anterior y el siguiente
  const min = addDays(periodStart(next, shiftPeriod(next, key, -1)), 1)
  const error = start < min || start > end ? `Elige una fecha entre el ${shortDate(min)} y el ${shortDate(end)}.` : null

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setStartEdit(null)
  }

  const save = async () => {
    if (error) return
    const starts = { ...cycle.starts }
    if (start === nominalStart(next, key)) delete starts[key]
    else starts[key] = start
    await setSetting('payCycle', { ...next, starts })
    showToast('Periodo guardado')
    onSaved(key)
    onClose()
  }

  return (
    <div className="pt-2">
      <p className="mb-2 text-sm font-bold">Me pagan</p>
      <Segmented className="mb-4" value={freq} onChange={reset(setFreq)} options={FREQS.map((f) => ({ value: f, label: FREQUENCY_LABEL[f] }))} />

      {freq === 'monthly' && (
        <Field label="Normalmente me pagan el" hint="Tu presupuesto va de un pago al día antes del siguiente.">
          {(id) => <DaySelect id={id} value={payDay} onChange={(d) => reset(setPayDay)(d ?? CALENDAR.payDay)} />}
        </Field>
      )}
      {freq === 'biweekly' && <p className="mb-4 rounded-2xl bg-info px-4 py-3 text-sm text-info-ink">Los días 15 y último de cada mes.</p>}
      {freq === 'weekly' && (
        <Field label="Me pagan cada">
          {(id) => (
            <select
              id={id}
              value={wd}
              onChange={(e) => reset(setWd)(Number(e.target.value))}
              className="h-13 w-full appearance-none rounded-2xl border border-line bg-surface px-4 text-base font-semibold"
            >
              {WEEKDAYS.map((name, i) => (
                <option key={name} value={i}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      <Field label="Este periodo empieza el" hint={`Termina el ${shortDate(end)}. Si este pago cae otro día, cámbialo solo aquí.`} error={error}>
        {(id) => (
          <input
            id={id}
            type="date"
            value={start}
            min={min}
            max={end}
            onChange={(e) => e.target.value && setStartEdit(e.target.value)}
            className="h-13 w-full rounded-2xl border border-line bg-surface px-3 text-base font-semibold"
          />
        )}
      </Field>

      {freq !== freqOf(cycle) && (
        <p className="mb-4 rounded-2xl bg-warn-soft px-4 py-3 text-sm font-semibold text-warn-ink">
          Tus límites ahora serán {CYCLE_WORDS[freq].per}. Revisa los montos después de guardar.
        </p>
      )}

      <Button size="lg" block disabled={!!error} onClick={save}>
        Guardar
      </Button>
    </div>
  )
}
