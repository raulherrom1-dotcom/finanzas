import { Eye, EyeOff, Settings } from 'lucide-react'
import { IconButton } from '../components/ui/Button'
import { Amount } from '../components/ui/Amount'
import { useSetting } from '../db/db'
import { useApp } from '../state/app'
import { navigate } from '../lib/router'
import { currentMonth, longDate, monthName, todayISO } from '../lib/dates'

export function Inicio() {
  const name = useSetting('userName', 'Raúl')
  const { privacy, togglePrivacy } = useApp()
  const month = currentMonth()
  const today = todayISO()

  return (
    <>
      <header className="pt-safe px-4 pb-4">
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold tracking-tight">Hola, {name}</h1>
            <p className="text-sm text-muted">{longDate(today)}</p>
          </div>
          <IconButton label={privacy ? 'Mostrar montos' : 'Ocultar montos'} tone="surface" onClick={togglePrivacy}>
            {privacy ? <EyeOff size={20} strokeWidth={2.2} /> : <Eye size={20} strokeWidth={2.2} />}
          </IconButton>
          <IconButton label="Ajustes" tone="surface" onClick={() => navigate('/ajustes')}>
            <Settings size={20} strokeWidth={2.2} />
          </IconButton>
        </div>
      </header>

      <div className="px-4">
        <section className="hero-gradient rounded-hero p-5 text-white shadow-hero">
          <p className="text-sm font-semibold">Balance de {monthName(month)}</p>
          <Amount cents={0} className="mt-1 block text-2xl font-extrabold tracking-tight" />
        </section>
      </div>
    </>
  )
}
