import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AppProvider } from './state/app'
import { requestPersistentStorage } from './lib/storage'
import { getSetting, setSetting } from './db/db'

requestPersistentStorage()

// Fecha de primer uso: sirve para el recordatorio de respaldo si nunca has respaldado.
getSetting<number | null>('firstOpenedAt', null)
  .then((v) => {
    if (v === null) void setSetting('firstOpenedAt', Date.now())
  })
  .catch(() => {})

// Solo en desarrollo: atajos para probar con datos de ejemplo desde la consola.
if (import.meta.env.DEV) {
  import('./db/sample').then((m) => Object.assign(window, { __sample: m }))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)
