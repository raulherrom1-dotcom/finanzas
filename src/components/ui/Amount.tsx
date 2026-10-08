import { formatMXN, splitMXN } from '../../lib/money'
import { cn } from '../../lib/cn'
import { useApp } from '../../state/app'

type Tone = 'ink' | 'pos' | 'neg' | 'warn' | 'muted' | 'inherit'

const TONE: Record<Tone, string> = {
  ink: 'text-ink',
  pos: 'text-pos-ink',
  neg: 'text-neg-ink',
  warn: 'text-warn-ink',
  muted: 'text-muted',
  inherit: '',
}

/**
 * Monto con los centavos más pequeños. Respeta el modo privacidad.
 * El tamaño se controla con la clase de texto del padre o `className`.
 */
export function Amount({
  cents,
  sign,
  tone = 'inherit',
  className,
  centsClassName,
  hideCents,
  ignorePrivacy,
}: {
  cents: number
  sign?: boolean
  tone?: Tone
  className?: string
  centsClassName?: string
  hideCents?: boolean
  ignorePrivacy?: boolean
}) {
  const { privacy } = useApp()
  if (privacy && !ignorePrivacy) {
    return (
      <span className={cn('num whitespace-nowrap', TONE[tone], className)} aria-label="Monto oculto">
        $<span className="tracking-[0.12em]">•••</span>
      </span>
    )
  }
  const p = splitMXN(cents, { sign })
  return (
    <span className={cn('num whitespace-nowrap', TONE[tone], className)} aria-label={formatMXN(cents, { sign })}>
      <span aria-hidden>
        {p.sign}
        {p.whole}
        {!hideCents && <span className={cn('text-[length:max(0.6em,11px)] opacity-80', centsClassName)}>{p.cents}</span>}
      </span>
    </span>
  )
}

/** Texto plano que respeta privacidad (para frases como "Te quedan $1,200"). */
export function useMoney() {
  const { privacy } = useApp()
  return (cents: number, opts?: { sign?: boolean; noCents?: boolean }) => (privacy ? '$•••' : formatMXN(cents, opts))
}
