import { cn } from '../../lib/cn'

export type Level = 'ok' | 'warn' | 'over'

/** Nivel de un presupuesto: normal, cerca del límite (80%) o excedido. */
export function levelFor(pct: number): Level {
  if (pct > 100) return 'over'
  if (pct >= 80) return 'warn'
  return 'ok'
}

const FILL: Record<Level, string> = { ok: 'bg-accent', warn: 'bg-warn', over: 'bg-neg' }

/** Barra de progreso que se llena con animación al aparecer. */
export function ProgressBar({ pct, level, color, className, thin }: { pct: number; level?: Level; color?: string; className?: string; thin?: boolean }) {
  const lv = level ?? levelFor(pct)
  const w = Math.max(0, Math.min(100, pct))
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-line', thin ? 'h-1.5' : 'h-2.5', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div
        className={cn('animate-fill-x h-full rounded-full transition-[width] duration-500', !color && FILL[lv])}
        style={{ width: `${w}%`, background: color }}
      />
    </div>
  )
}

/** Anillo de progreso (presupuesto total). */
export function ProgressRing({
  pct,
  size = 96,
  stroke = 10,
  level,
  track = 'var(--color-line)',
  children,
}: {
  pct: number
  size?: number
  stroke?: number
  level?: Level
  track?: string
  children?: React.ReactNode
}) {
  const lv = level ?? levelFor(pct)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const w = Math.max(0, Math.min(100, pct))
  const color = lv === 'over' ? 'var(--color-neg)' : lv === 'warn' ? 'var(--color-warn)' : 'var(--color-accent)'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - w / 100)}
          className="ring-fill"
          style={{ ['--ring-c' as string]: `${c}` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
