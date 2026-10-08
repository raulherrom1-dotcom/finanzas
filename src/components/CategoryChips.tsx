import type { Category } from '../db/types'
import { CategoryIcon } from './ui/CategoryIcon'
import { cn } from '../lib/cn'

/** Chips de categorías con ícono, para elegir una o varias. */
export function CategoryChips({
  categories,
  isSelected,
  onPick,
  isDisabled,
}: {
  categories: Category[]
  isSelected: (c: Category) => boolean
  onPick: (c: Category) => void
  isDisabled?: (c: Category) => boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const on = isSelected(c)
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            disabled={isDisabled?.(c)}
            onClick={() => onPick(c)}
            className={cn(
              'flex h-10 items-center gap-1.5 rounded-full border pr-3.5 pl-1 text-sm font-semibold disabled:opacity-40',
              on ? 'border-accent bg-accent-soft text-accent-press' : 'border-line bg-surface text-ink',
            )}
          >
            <CategoryIcon icon={c.icon} color={c.color} size={30} />
            {c.name}
          </button>
        )
      })}
    </div>
  )
}
