import { useEffect, useRef, type ReactNode } from 'react'
import { Construction } from 'lucide-react'
import { BottomNav } from './components/nav/BottomNav'
import { Toaster } from './components/ui/Toast'
import { UpdatePrompt } from './components/UpdatePrompt'
import { QuickAddSheet } from './features/quick-add/QuickAddSheet'
import { ScreenHeader } from './components/ui/ScreenHeader'
import { EmptyState } from './components/ui/Callout'
import { useRoute } from './lib/router'
import { useApp } from './state/app'
import { runRecurring } from './db/recurring'
import { Inicio } from './screens/Inicio'
import { Movimientos } from './screens/Movimientos'
import { Presupuesto } from './screens/Presupuesto'
import { Analisis } from './screens/Analisis'
import { Ajustes } from './screens/ajustes/Ajustes'
import { Cuentas } from './screens/ajustes/Cuentas'
import { Categorias } from './screens/ajustes/Categorias'
import { Perfil } from './screens/ajustes/Perfil'
import { Recurrentes } from './screens/ajustes/Recurrentes'
import { Metas } from './screens/ajustes/Metas'

function screenFor(path: string): ReactNode {
  if (path === '/') return <Inicio />
  if (path.startsWith('/movimientos')) return <Movimientos />
  if (path.startsWith('/presupuesto')) return <Presupuesto />
  if (path.startsWith('/analisis')) return <Analisis />
  if (path === '/ajustes') return <Ajustes />
  if (path === '/ajustes/cuentas') return <Cuentas />
  if (path === '/ajustes/categorias') return <Categorias />
  if (path === '/ajustes/perfil') return <Perfil />
  if (path === '/ajustes/recurrentes') return <Recurrentes />
  if (path === '/ajustes/metas') return <Metas />
  if (path.startsWith('/ajustes/')) return <Pending />
  return <Inicio />
}

function Pending() {
  return (
    <>
      <ScreenHeader title="Próximamente" back="/ajustes" />
      <div className="px-4">
        <EmptyState icon={Construction} title="Esta sección llega en una siguiente fase" />
      </div>
    </>
  )
}

export default function App() {
  const path = useRoute()
  const main = useRef<HTMLElement>(null)
  const { showToast } = useApp()

  // Recurrentes: se generan al abrir la app y cada vez que vuelve al frente.
  useEffect(() => {
    const run = () =>
      runRecurring()
        .then((n) => n > 0 && showToast(n === 1 ? 'Se registró 1 movimiento recurrente' : `Se registraron ${n} movimientos recurrentes`, { tone: 'info' }))
        .catch(() => {})
    run()
    const onVisible = () => document.visibilityState === 'visible' && run()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [showToast])

  useEffect(() => {
    main.current?.scrollTo({ top: 0 })
  }, [path])

  return (
    <>
      <main ref={main} className="scroll-area relative flex-1">
        <div key={path} className="animate-screen-in pb-8">
          {screenFor(path)}
        </div>
      </main>
      <BottomNav />
      <QuickAddSheet />
      <Toaster />
      <UpdatePrompt />
    </>
  )
}
