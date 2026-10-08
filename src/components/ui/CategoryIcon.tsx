import { getIcon } from '../../lib/icons'
import { iconInk, softBg } from '../../lib/palette'
import { cn } from '../../lib/cn'

/** Ícono dentro de un círculo con el fondo suave de su color. */
export function CategoryIcon({ icon, color, size = 44, className }: { icon?: string; color?: string; size?: number; className?: string }) {
  const Icon = getIcon(icon)
  const c = color ?? '#94A3B8'
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full', className)}
      style={{ width: size, height: size, background: softBg(c, 16), color: iconInk(c) }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.48)} strokeWidth={2.1} />
    </span>
  )
}
