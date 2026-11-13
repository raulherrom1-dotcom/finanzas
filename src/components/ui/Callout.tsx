import type { ReactNode } from 'react'
import { Info, TriangleAlert, CircleAlert, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

type Tone = 'info' | 'warn' | 'neg'

const TONE: Record<Tone, { box: string; icon: LucideIcon }> = {
  info: { box: 'bg-info text-info-ink', icon: Info },
  warn: { box: 'bg-warn-soft text-warn-ink', icon: TriangleAlert },
  neg: { box: 'bg-neg-soft text-neg-ink', icon: CircleAlert },
}

/** Cuadro de aviso o información. */
export function Callout({
  tone = 'info',
  title,
  children,
  icon,
  action,
  className,
}: {
  tone?: Tone
  title?: ReactNode
  children?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}) {
  const Icon = icon ?? TONE[tone].icon
  return (
    <div className={cn('flex gap-3 rounded-card p-4', TONE[tone].box, className)}>
      <Icon size={20} strokeWidth={2.2} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-bold">{title}</p>}
        {children && <div className={cn('text-sm', title && 'mt-0.5')}>{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}

/** Estado vacío: una invitación a actuar, no un mensaje triste. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center rounded-card bg-info px-6 py-8 text-center text-info-ink', className)}>
      <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-accent-soft shadow-glow">
        <Icon size={26} strokeWidth={2} className="text-accent-light" />
      </span>
      <p className="text-base font-bold">{title}</p>
      {children && <p className="mt-1 max-w-[30ch] text-sm">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
