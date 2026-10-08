import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { navigate } from '../../lib/router'
import { IconButton } from './Button'

/** Encabezado de pantalla: título grande alineado a la izquierda, acciones a la derecha. */
export function ScreenHeader({ title, back, right, subtitle }: { title: ReactNode; back?: string; right?: ReactNode; subtitle?: ReactNode }) {
  return (
    <header className="pt-safe px-4 pb-3">
      <div className="flex min-h-11 items-center gap-1">
        {back && (
          <IconButton label="Volver" className="-ml-2" onClick={() => navigate(back)}>
            <ChevronLeft size={26} strokeWidth={2.4} />
          </IconButton>
        )}
        <h1 className="min-w-0 flex-1 truncate text-xl font-extrabold tracking-tight">{title}</h1>
        {right && <div className="flex items-center gap-1">{right}</div>}
      </div>
      {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
    </header>
  )
}

/** Título de sección dentro de una pantalla. */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex min-h-11 items-center justify-between gap-2">
      <h2 className="text-base font-extrabold tracking-tight">{children}</h2>
      {action}
    </div>
  )
}
