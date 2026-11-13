import { ChevronRight, CreditCard, DatabaseBackup, LayoutGrid, Repeat, Target, UserRound, type LucideIcon } from 'lucide-react'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { navigate } from '../../lib/router'

const ITEMS: Array<{ path: string; label: string; hint: string; icon: LucideIcon }> = [
  { path: '/ajustes/cuentas', label: 'Cuentas', hint: 'Efectivo, débito, crédito y ahorro', icon: CreditCard },
  { path: '/ajustes/categorias', label: 'Categorías', hint: 'Crea, edita o archiva', icon: LayoutGrid },
  { path: '/ajustes/recurrentes', label: 'Recurrentes', hint: 'Renta, suscripciones, sueldo', icon: Repeat },
  { path: '/ajustes/metas', label: 'Metas de ahorro', hint: 'Objetivos y abonos', icon: Target },
  { path: '/ajustes/respaldo', label: 'Respaldo y datos', hint: 'Exportar, importar y datos de ejemplo', icon: DatabaseBackup },
  { path: '/ajustes/perfil', label: 'Perfiles', hint: 'Tu nombre y otras personas en este celular', icon: UserRound },
]

export function Ajustes() {
  return (
    <>
      <ScreenHeader title="Ajustes" back="/" />
      <ul className="mx-4 overflow-hidden rounded-card border border-line bg-surface">
        {ITEMS.map(({ path, label, hint, icon: Icon }) => (
          <li key={path} className="border-b border-line last:border-b-0">
            <button type="button" onClick={() => navigate(path)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left active:bg-accent-soft">
              <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon size={20} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold">{label}</span>
                <span className="block truncate text-sm text-muted">{hint}</span>
              </span>
              <ChevronRight size={20} className="text-muted" />
            </button>
          </li>
        ))}
      </ul>
      <p className="mx-6 mt-4 text-xs text-muted">Tus datos se guardan solo en este celular. Nada se sube a internet.</p>
    </>
  )
}
