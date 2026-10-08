import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AppProvider } from './state/app'
import { requestPersistentStorage } from './lib/storage'

requestPersistentStorage()

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
