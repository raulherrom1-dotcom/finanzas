import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from './ui/Button'
import { currentMonth, type MonthKey } from '../lib/dates'
import { CALENDAR, freqOf, periodTitle, shiftPeriod, type PayCycle } from '../lib/budget'
import { cn } from '../lib/cn'

const UNIT = {
  monthly: { prev: 'Mes anterior', next: 'Mes siguiente', back: 'Volver a este mes' },
  biweekly: { prev: 'Quincena anterior', next: 'Quincena siguiente', back: 'Volver a esta quincena' },
  weekly: { prev: 'Semana anterior', next: 'Semana siguiente', back: 'Volver a esta semana' },
}

/** Navegación entre meses (o periodos de pago si recibe `cycle`): ‹ Octubre 2026 › */
export function MonthSwitcher({
  month,
  onChange,
  className,
  allowFuture,
  now = currentMonth(),
  cycle = CALENDAR,
}: {
  month: MonthKey
  onChange: (m: MonthKey) => void
  className?: string
  allowFuture?: boolean
  /** Mes (o periodo) actual */
  now?: MonthKey
  cycle?: PayCycle
}) {
  const canNext = allowFuture || month < now
  const unit = UNIT[freqOf(cycle)]
  const title = periodTitle(cycle, month)
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <IconButton label={unit.prev} tone="surface" onClick={() => onChange(shiftPeriod(cycle, month, -1))}>
        <ChevronLeft size={22} strokeWidth={2.4} />
      </IconButton>
      <button
        type="button"
        onClick={() => onChange(now)}
        disabled={month === now}
        className="min-h-11 flex-1 rounded-full text-center text-base font-extrabold disabled:cursor-default"
        aria-label={month === now ? title : `${title}. ${unit.back}`}
      >
        {title}
        {month !== now && <span className="block text-xs font-semibold text-accent-press">{unit.back}</span>}
      </button>
      <IconButton label={unit.next} tone="surface" onClick={() => canNext && onChange(shiftPeriod(cycle, month, 1))} disabled={!canNext} className="disabled:opacity-35">
        <ChevronRight size={22} strokeWidth={2.4} />
      </IconButton>
    </div>
  )
}
