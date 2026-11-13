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

/** Cápsula de vidrio flotante con 4 secciones y el botón "+" al centro. El contenido pasa por debajo. */
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
        <span
          className={cn(
            'flex h-7 w-12 items-center justify-center rounded-full transition-[background-color,box-shadow] duration-200',
            on && 'bg-accent-soft shadow-[0_0_18px_rgba(140,123,255,0.45)]',
          )}
        >
          <Icon size={22} strokeWidth={on ? 2.4 : 2} className={on ? 'text-accent-press' : 'text-muted'} />
        </span>
        <span className={cn('max-w-full truncate text-[11px] leading-4 tracking-tight', on ? 'font-bold text-ink' : 'font-semibold text-muted')}>{t.label}</span>
      </button>
    )
  }

  return (
    <nav aria-label="Secciones" className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-2" style={{ paddingBottom: 'calc(var(--safe-bottom) + 8px)' }}>
      <div className="glass pointer-events-auto relative mx-auto flex h-(--nav-height) max-w-[560px] items-stretch rounded-[30px] px-0.5 shadow-card">
        {TABS.slice(0, 2).map(item)}
        <div className="w-[68px] shrink-0" aria-hidden />
        {TABS.slice(2).map(item)}
        <button
          type="button"
          aria-label="Registrar movimiento"
          onClick={() => openQuickAdd()}
          className="btn-primary absolute top-0 left-1/2 flex size-[62px] -translate-x-1/2 -translate-y-[40%] items-center justify-center rounded-full ring-[5px] ring-bg transition-transform duration-150 active:scale-95"
        >
          <Plus size={30} strokeWidth={2.6} />
        </button>
      </div>
    </nav>
  )
}
