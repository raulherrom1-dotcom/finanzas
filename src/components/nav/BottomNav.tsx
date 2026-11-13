import { ArrowLeftRight, ChartPie, Gauge, House, Plus, type LucideIcon } from 'lucide-react'
import { navigate, tabOf, useRoute, type Tab } from '../../lib/router'
import { useApp } from '../../state/app'
import { cn } from '../../lib/cn'

const TABS: Array<{ id: Tab; label: string; path: string; icon: LucideIcon }> = [
  { id: 'inicio', label: 'Inicio', path: '/', icon: House },
  { id: 'movimientos', label: 'Movimientos', path: '/movimientos', icon: ArrowLeftRight },
  { id: 'presupuesto', label: 'Presupuesto', path: '/presupuesto', icon: Gauge },
  { id: 'analisis', label: 'Análisis', path: '/analisis', icon: ChartPie },
]

/** Barra inferior con 4 secciones y el botón "+" flotando al centro. */
export function BottomNav() {
  const path = useRoute()
  const active = tabOf(path)
  const { openQuickAdd } = useApp()

  const item = (t: (typeof TABS)[number]) => {
    const on = active === t.id
    const Icon = t.icon
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => navigate(t.path)}
        aria-current={on ? 'page' : undefined}
        className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 active:opacity-70"
      >
        <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200', on && 'bg-accent-soft')}>
          <Icon size={22} strokeWidth={on ? 2.4 : 2} className={on ? 'text-accent' : 'text-muted'} />
        </span>
        <span className={cn('max-w-full truncate text-[12px] leading-4', on ? 'font-bold text-accent-press' : 'font-semibold text-muted')}>{t.label}</span>
      </button>
    )
  }

  return (
    <nav
      aria-label="Secciones"
      className="relative z-40 shrink-0 border-t border-line bg-bg/95 backdrop-blur-md"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="flex h-(--nav-height) items-stretch px-1">
        {TABS.slice(0, 2).map(item)}
        <div className="w-[76px] shrink-0" aria-hidden />
        {TABS.slice(2).map(item)}
      </div>
      <button
        type="button"
        aria-label="Registrar movimiento"
        onClick={() => openQuickAdd()}
        className="absolute top-0 left-1/2 flex size-[60px] -translate-x-1/2 -translate-y-[38%] items-center justify-center rounded-full bg-accent text-white shadow-float ring-[5px] ring-bg transition-[transform,background-color] duration-150 active:scale-95 active:bg-accent-press"
      >
        <Plus size={30} strokeWidth={2.6} />
      </button>
    </nav>
  )
}
