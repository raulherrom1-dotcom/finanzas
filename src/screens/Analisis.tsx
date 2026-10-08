import { ChartPie } from 'lucide-react'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { EmptyState } from '../components/ui/Callout'

export function Analisis() {
  return (
    <>
      <ScreenHeader title="Análisis" />
      <div className="px-4">
        <EmptyState icon={ChartPie} title="Aquí verás tus gráficas">
          En cuanto registres movimientos aparecerá en qué se va tu dinero mes a mes.
        </EmptyState>
      </div>
    </>
  )
}
