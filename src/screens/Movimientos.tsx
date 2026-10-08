import { ArrowLeftRight } from 'lucide-react'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { EmptyState } from '../components/ui/Callout'
import { Button } from '../components/ui/Button'
import { useApp } from '../state/app'

export function Movimientos() {
  const { openQuickAdd } = useApp()
  return (
    <>
      <ScreenHeader title="Movimientos" />
      <div className="px-4">
        <EmptyState icon={ArrowLeftRight} title="Todavía no hay movimientos" action={<Button onClick={() => openQuickAdd()}>Registrar movimiento</Button>}>
          Registra tu primer gasto o ingreso con el botón +.
        </EmptyState>
      </div>
    </>
  )
}
