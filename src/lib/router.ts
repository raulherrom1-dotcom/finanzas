import { useSyncExternalStore } from 'react'

// Router mínimo con hash (#/movimientos). Funciona en GitHub Pages sin configurar el servidor.

function read(): string {
  const h = location.hash.replace(/^#/, '')
  return h.startsWith('/') ? h : '/'
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute(): string {
  return useSyncExternalStore(subscribe, read, () => '/')
}

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  if (read() === path) return
  if (opts.replace) {
    history.replaceState(null, '', `#${path}`)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    location.hash = path
  }
}

export type Tab = 'inicio' | 'movimientos' | 'presupuesto' | 'analisis'

export function tabOf(path: string): Tab {
  if (path.startsWith('/movimientos')) return 'movimientos'
  if (path.startsWith('/presupuesto')) return 'presupuesto'
  if (path.startsWith('/analisis')) return 'analisis'
  return 'inicio'
}
