import { useRef } from 'react'
import { Delete } from 'lucide-react'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const

/** Teclado numérico grande de la app (no usa el del iPhone para no tapar las categorías). */
export function Keypad({ onKey }: { onKey: (key: string) => void }) {
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null)
  const held = useRef(false)

  const startHold = () => {
    held.current = false
    hold.current = setTimeout(() => {
      held.current = true
      onKey('clear')
    }, 550)
  }
  const endHold = () => {
    if (hold.current) clearTimeout(hold.current)
    hold.current = null
  }

  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Teclado numérico">
      {KEYS.map((k) =>
        k === 'back' ? (
          <button
            key={k}
            type="button"
            aria-label="Borrar (mantén presionado para borrar todo)"
            className="flex h-[52px] items-center justify-center rounded-2xl text-ink transition-[transform,background-color] duration-100 active:scale-95 active:bg-accent-soft"
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onClick={() => {
              if (!held.current) onKey('back')
              held.current = false
            }}
          >
            <Delete size={26} strokeWidth={2.1} />
          </button>
        ) : (
          <button
            key={k}
            type="button"
            className="num flex h-[52px] items-center justify-center rounded-2xl bg-surface text-[24px] font-bold text-ink transition-[transform,background-color] duration-100 active:scale-95 active:bg-accent-soft"
            onClick={() => onKey(k)}
          >
            {k}
          </button>
        ),
      )}
    </div>
  )
}
