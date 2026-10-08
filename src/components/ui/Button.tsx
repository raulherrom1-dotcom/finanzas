import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'surface'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-white active:bg-accent-press disabled:bg-accent-soft disabled:text-muted',
  secondary: 'bg-accent-soft text-accent-press active:bg-line',
  ghost: 'bg-transparent text-accent-press active:bg-accent-soft',
  danger: 'bg-neg-soft text-neg-ink active:brightness-95',
  surface: 'bg-surface text-ink border border-line active:bg-accent-soft',
}

const SIZE: Record<Size, string> = {
  sm: 'h-11 px-4 text-sm gap-1.5',
  md: 'h-12 px-5 text-base gap-2',
  lg: 'h-14 px-6 text-base gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  block?: boolean
  icon?: ReactNode
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold transition-[transform,background-color] duration-150 active:scale-[0.98] disabled:active:scale-100',
        VARIANT[variant],
        SIZE[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className,
  children,
  tone = 'plain',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'plain' | 'surface' | 'soft' | 'onAccent' }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-[transform,background-color] duration-150 active:scale-95',
        tone === 'plain' && 'text-ink active:bg-surface',
        tone === 'surface' && 'border border-line bg-surface text-ink active:bg-accent-soft',
        tone === 'soft' && 'bg-accent-soft text-accent-press active:bg-line',
        tone === 'onAccent' && 'bg-white/15 text-white active:bg-white/25',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
