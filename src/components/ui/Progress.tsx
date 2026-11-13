import { useId } from 'react'
import { cn } from '../../lib/cn'
import { levelFor, type Level } from '../../lib/levels'

const FILL: Record<Level, string> = { ok: 'bg-linear-to-r from-accent to-cyan', warn: 'bg-warn', over: 'bg-neg' }

/** Barra de progreso que se llena con animación al aparecer. */
export function ProgressBar({ pct, level, color, className, thin }: { pct: number; level?: Level; color?: string; className?: string; thin?: boolean }) {
  const lv = level ?? levelFor(pct)
  const w = Math.max(0, Math.min(100, pct))
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-white/[0.08]', thin ? 'h-1.5' : 'h-2.5', className)}
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
  track = 'rgba(255,255,255,0.08)',
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
  const grad = `ring${useId().replace(/:/g, '')}`
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const w = Math.max(0, Math.min(100, pct))
  const color = lv === 'over' ? 'var(--color-neg)' : lv === 'warn' ? 'var(--color-warn)' : `url(#${grad})`
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8c7bff" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
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
          style={{ ['--ring-c' as string]: `${c}`, filter: `drop-shadow(0 0 6px ${lv === 'ok' ? 'rgba(140,123,255,0.55)' : lv === 'warn' ? 'rgba(251,191,36,0.5)' : 'rgba(251,113,133,0.5)'})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
