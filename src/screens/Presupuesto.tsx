import { Gauge } from 'lucide-react'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { EmptyState } from '../components/ui/Callout'

export function Presupuesto() {
  return (
    <>
      <ScreenHeader title="Presupuesto" />
      <div className="px-4">
        <EmptyState icon={Gauge} title="Define cuánto quieres gastar">
          Pon un límite mensual total y por categoría para ver cuánto te queda.
        </EmptyState>
      </div>
    </>
  )
}
