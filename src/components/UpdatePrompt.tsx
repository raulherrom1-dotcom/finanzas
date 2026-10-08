import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'
import { useApp } from '../state/app'
import { Button } from './ui/Button'

/** Avisa cuando hay una versión nueva de la app o cuando ya funciona sin internet. */
export function UpdatePrompt() {
  const { showToast } = useApp()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Revisa si hay versión nueva cada vez que la app vuelve al frente.
      if (!reg) return
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {})
      })
    },
  })

  useEffect(() => {
    if (offlineReady) {
      showToast('Lista para usarse sin internet', { tone: 'info' })
      setOfflineReady(false)
    }
  }, [offlineReady, setOfflineReady, showToast])

  if (!needRefresh) return null
  return (
    <div className="fixed inset-x-0 top-0 z-[70] px-4" style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}>
      <div className="animate-toast-in mx-auto flex max-w-[480px] items-center gap-3 rounded-card bg-info p-3 pl-4 text-info-ink shadow-card">
        <RefreshCw size={20} strokeWidth={2.2} className="shrink-0" />
        <p className="flex-1 text-sm font-semibold">Hay una versión nueva de la app.</p>
        <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
          Luego
        </Button>
        <Button size="sm" onClick={() => updateServiceWorker(true)}>
          Actualizar
        </Button>
      </div>
    </div>
  )
}
