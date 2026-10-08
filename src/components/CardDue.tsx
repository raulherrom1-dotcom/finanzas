import { CalendarClock, CircleCheck, TriangleAlert } from 'lucide-react'
import type { CardStatus } from '../lib/balances'
import { relativeDays, shortDate } from '../lib/dates'
import { cn } from '../lib/cn'
import { useMoney } from './ui/Amount'

/** Línea con el pago de la tarjeta: cuánto y para cuándo, con color según urgencia. */
export function CardDue({ status, className }: { status: CardStatus; className?: string }) {
  const money = useMoney()
  const { level, remainingToPay, dueDate, daysToDue } = status

  if (level === 'none' || level === 'ok') {
    return (
      <p className={cn('flex items-center gap-1.5 text-sm text-muted', className)}>
        <CircleCheck size={16} className="shrink-0 text-pos" />
        {level === 'none' ? 'Sin saldo por pagar' : `Pagado este corte. Próximo corte ${shortDate(status.nextCutoff)}`}
      </p>
    )
  }

  const box =
    level === 'overdue' ? 'bg-neg-soft text-neg-ink' : level === 'soon' ? 'bg-warn-soft text-warn-ink' : 'bg-info text-info-ink'
  const Icon = level === 'pending' ? CalendarClock : TriangleAlert
  const when =
    level === 'overdue'
      ? `venció ${relativeDays(dueDate)}`
      : daysToDue === 0
        ? 'vence hoy'
        : `antes del ${shortDate(dueDate)} (${relativeDays(dueDate)})`

  return (
    <p className={cn('flex items-start gap-2 rounded-xl px-3 py-2 text-sm font-semibold', box, className)}>
      <Icon size={16} strokeWidth={2.4} className="mt-0.5 shrink-0" />
      <span>
        Paga {money(remainingToPay)} {when}
      </span>
    </p>
  )
}
