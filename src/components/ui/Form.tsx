import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import { centsToInput, parseAmount } from '../../lib/money'
import { CHART_COLORS } from '../../lib/palette'
import { ICON_NAMES } from '../../lib/icons'
import { CategoryIcon } from './CategoryIcon'

export function Field({ label, hint, children, error }: { label: string; hint?: ReactNode; children: (id: string) => ReactNode; error?: string | null }) {
  const id = useId()
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-ink">
        {label}
      </label>
      {children(id)}
      {error ? <p className="mt-1.5 text-sm font-semibold text-neg-ink">{error}</p> : hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

const inputBase =
  'block h-13 w-full rounded-2xl border border-line bg-surface px-4 text-base font-semibold text-ink placeholder:font-medium placeholder:text-muted outline-none transition-colors focus:border-accent focus:bg-bg'

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} autoComplete="off" {...rest} />
}

/** Campo de monto con teclado numérico de iOS. Trabaja en centavos. */
export function MoneyInput({
  id,
  cents,
  onChange,
  placeholder = '0.00',
  allowNegative,
}: {
  id?: string
  cents: number | null
  onChange: (cents: number | null) => void
  placeholder?: string
  allowNegative?: boolean
}) {
  const [text, setText] = useState(() => (cents === null ? '' : centsToInput(cents)))
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base font-bold text-muted">$</span>
      <input
        id={id}
        className={cn(inputBase, 'num pl-8')}
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          const raw = e.target.value.replace(allowNegative ? /[^\d.,-]/g : /[^\d.,]/g, '')
          setText(raw)
          const v = parseAmount(raw)
          onChange(v === null ? null : allowNegative ? v : Math.abs(v))
        }}
        onBlur={() => {
          const v = parseAmount(text)
          if (v !== null) setText(centsToInput(v))
        }}
      />
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
  fit,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: ReactNode }>
  className?: string
  size?: 'sm' | 'md'
  /** Cada opción toma el ancho de su texto (para etiquetas de largo distinto). */
  fit?: boolean
}) {
  return (
    <div role="radiogroup" className={cn('flex rounded-full border border-line bg-surface p-1', className)}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex min-w-0 items-center justify-center rounded-full font-bold transition-[background-color,color,box-shadow] duration-200',
              fit ? 'flex-auto px-3' : 'flex-1 px-2',
              size === 'md' ? 'h-11 text-sm' : 'h-11 text-[13px]',
              on ? 'bg-bg text-accent-press shadow-card' : 'text-muted active:text-ink',
            )}
          >
            <span className="truncate">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Color" className="grid grid-cols-8">
      {CHART_COLORS.map((c) => {
        const on = c.toLowerCase() === value.toLowerCase()
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={c}
            onClick={() => onChange(c)}
            className="flex h-11 items-center justify-center rounded-full"
          >
            <span
              className={cn('flex size-8 items-center justify-center rounded-full transition-transform duration-150', on && 'scale-110 ring-2 ring-offset-2 ring-offset-bg')}
              style={{ background: c, ['--tw-ring-color' as string]: c }}
            >
              {on && <Check size={16} strokeWidth={3} className="text-white" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function IconPicker({ value, color, onChange }: { value: string; color: string; onChange: (icon: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Ícono" className="grid grid-cols-6 gap-1.5">
      {ICON_NAMES.map((name) => {
        const on = name === value
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={name}
            onClick={() => onChange(name)}
            className={cn('flex aspect-square items-center justify-center rounded-2xl border-2 transition-colors', on ? 'border-accent bg-bg' : 'border-transparent')}
          >
            <CategoryIcon icon={name} color={on ? color : '#94A3B8'} size={40} />
          </button>
        )
      })}
    </div>
  )
}

export function DaySelect({ id, value, onChange, placeholder = 'Elige un día' }: { id?: string; value: number | undefined; onChange: (d: number | undefined) => void; placeholder?: string }) {
  return (
    <select
      id={id}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      className={cn(inputBase, 'appearance-none')}
    >
      <option value="">{placeholder}</option>
      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
        <option key={d} value={d}>
          Día {d}
        </option>
      ))}
    </select>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex min-h-12 w-full items-center justify-between gap-3 text-left">
      <span className="text-base font-semibold">{label}</span>
      <span className={cn('relative h-8 w-13 shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-accent' : 'bg-line')}>
        <span className={cn('absolute top-1 left-1 size-6 rounded-full bg-white shadow-card transition-transform duration-200', checked && 'translate-x-5')} />
      </span>
    </button>
  )
}
