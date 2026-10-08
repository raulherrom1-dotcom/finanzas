import { useEffect } from 'react'
import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { useApp } from '../../state/app'
import { cn } from '../../lib/cn'

/** Aviso breve que aparece arriba de la barra inferior. */
export function Toaster() {
  const { toast, dismissToast } = useApp()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(dismissToast, toast.action ? 4500 : 2400)
    return () => clearTimeout(t)
  }, [toast, dismissToast])

  if (!toast) return null
  const Icon = toast.tone === 'error' ? CircleAlert : toast.tone === 'info' ? Info : CircleCheck

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
      style={{ bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 20px)' }}
      role="status"
      aria-live="polite"
    >
      <div
        key={toast.id}
        className="animate-toast-in pointer-events-auto flex max-w-[420px] min-h-12 items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-4 text-sm font-semibold text-white shadow-float"
      >
        <Icon size={20} strokeWidth={2.4} className={cn('shrink-0', toast.tone === 'error' ? 'text-neg' : toast.tone === 'info' ? 'text-accent-light' : 'text-pos')} />
        <span className="py-1 pr-2">{toast.text}</span>
        {toast.action && (
          <button
            type="button"
            className="h-10 rounded-full bg-white/15 px-4 font-bold text-white active:bg-white/25"
            onClick={() => {
              toast.action?.run()
              dismissToast()
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
    </div>
  )
}
