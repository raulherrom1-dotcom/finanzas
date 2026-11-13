import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Trophy } from 'lucide-react'
import { CHART_COLORS } from '../lib/palette'

const DOTS = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2
  const dist = 90 + (i % 3) * 28
  return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, color: CHART_COLORS[i % 7], size: 10 + (i % 3) * 4, delay: (i % 4) * 30 }
})

/** Celebración breve al cumplir una meta: trofeo y ráfaga de círculos de la paleta. */
export function Celebration({ title, onDone }: { title: string; onDone: () => void }) {
  // El temporizador no se reinicia aunque la pantalla se vuelva a pintar.
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    const t = setTimeout(() => done.current(), 2200)
    return () => clearTimeout(t)
  }, [])

  return createPortal(
    <div className="animate-fade-in fixed inset-0 z-[80] flex items-center justify-center bg-bg/80 backdrop-blur-sm" onClick={onDone} role="alert">
      <div className="relative flex flex-col items-center px-8 text-center">
        <div className="relative flex size-28 items-center justify-center">
          {DOTS.map((d, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                width: d.size,
                height: d.size,
                background: d.color,
                ['--dx' as string]: `${d.dx}px`,
                ['--dy' as string]: `${d.dy}px`,
                animation: `burst 1100ms var(--ease-out-quick) ${d.delay}ms both`,
              }}
            />
          ))}
          <span className="animate-pop flex size-24 items-center justify-center btn-primary rounded-full">
            <Trophy size={44} strokeWidth={2} />
          </span>
        </div>
        <p className="animate-toast-in mt-6 text-xl font-extrabold tracking-tight">¡Meta cumplida!</p>
        <p className="animate-toast-in mt-1 max-w-[28ch] text-base text-muted">{title}</p>
      </div>
    </div>,
    document.body,
  )
}
