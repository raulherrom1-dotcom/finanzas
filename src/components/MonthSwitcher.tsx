import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from './ui/Button'
import { addMonths, currentMonth, monthLabel, type MonthKey } from '../lib/dates'
import { cn } from '../lib/cn'

/** Navegación entre meses: ‹ Octubre 2026 › */
export function MonthSwitcher({ month, onChange, className, allowFuture }: { month: MonthKey; onChange: (m: MonthKey) => void; className?: string; allowFuture?: boolean }) {
  const now = currentMonth()
  const canNext = allowFuture || month < now
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <IconButton label="Mes anterior" tone="surface" onClick={() => onChange(addMonths(month, -1))}>
        <ChevronLeft size={22} strokeWidth={2.4} />
      </IconButton>
      <button
        type="button"
        onClick={() => onChange(now)}
        disabled={month === now}
        className="min-h-11 flex-1 rounded-full text-center text-base font-extrabold disabled:cursor-default"
        aria-label={month === now ? monthLabel(month) : `${monthLabel(month)}. Toca para volver al mes actual`}
      >
        {monthLabel(month)}
        {month !== now && <span className="block text-xs font-semibold text-accent-press">Volver a este mes</span>}
      </button>
      <IconButton label="Mes siguiente" tone="surface" onClick={() => canNext && onChange(addMonths(month, 1))} disabled={!canNext} className="disabled:opacity-35">
        <ChevronRight size={22} strokeWidth={2.4} />
      </IconButton>
    </div>
  )
}
