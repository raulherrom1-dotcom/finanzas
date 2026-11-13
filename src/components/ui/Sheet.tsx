import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { IconButton } from './Button'

const CLOSE_MS = 220

/**
 * Hoja modal que sube desde abajo. Se cierra arrastrando hacia abajo, tocando el fondo o con Escape.
 * Se mantiene encima del teclado de iOS usando visualViewport.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  bodyClassName,
  hideHeader,
  headerRight,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
  bodyClassName?: string
  hideHeader?: boolean
  headerRight?: ReactNode
}) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [kb, setKb] = useState(0)
  const drag = useRef<{ startY: number; t: number } | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Montar / desmontar con animación de salida
  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      setDragY(0)
    } else if (mounted) {
      setClosing(true)
      const t = setTimeout(() => {
        setMounted(false)
        setClosing(false)
      }, CLOSE_MS)
      return () => clearTimeout(t)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape para cerrar y foco inicial
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    panel.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.({ preventScroll: true })
    }
  }, [open, onClose])

  // Altura del teclado de iOS
  useEffect(() => {
    if (!open) return
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setKb(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [open])

  if (!mounted) return null

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { startY: e.clientY, t: performance.now() }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setDragY(Math.max(0, e.clientY - drag.current.startY))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current) return
    const dy = e.clientY - drag.current.startY
    const v = dy / Math.max(1, performance.now() - drag.current.t)
    drag.current = null
    if (dy > 110 || (dy > 30 && v > 0.6)) onClose()
    else setDragY(0)
  }

  return createPortal(
    <div className="fixed inset-0 z-50" role="presentation">
      <div
        className={cn('absolute inset-0 bg-ink/40 transition-opacity duration-200', closing ? 'opacity-0' : 'animate-fade-in')}
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'absolute inset-x-0 mx-auto flex max-w-[560px] flex-col rounded-t-(--radius-sheet) bg-bg shadow-sheet outline-none',
          !closing && dragY === 0 && 'animate-sheet-up',
          className,
        )}
        style={{
          bottom: kb,
          maxHeight: `calc(100dvh - var(--safe-top) - 16px - ${kb}px)`,
          transform: closing ? 'translateY(100%)' : dragY ? `translateY(${dragY}px)` : undefined,
          transition: closing ? `transform ${CLOSE_MS}ms cubic-bezier(0.4,0,1,1)` : drag.current ? 'none' : 'transform 220ms var(--ease-out-quick)',
        }}
      >
        <div
          className="shrink-0 touch-none pt-2"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          {!hideHeader && (
            <div className="flex min-h-12 items-center gap-2 px-5 pt-1">
              <h2 id={titleId} className="flex-1 text-lg font-extrabold tracking-tight">
                {title}
              </h2>
              {headerRight}
              <IconButton label="Cerrar" tone="surface" onClick={onClose} onPointerDown={(e) => e.stopPropagation()}>
                <X size={20} strokeWidth={2.4} />
              </IconButton>
            </div>
          )}
        </div>
        <div className={cn('scroll-area min-h-0 flex-1 px-5 pb-4', bodyClassName)}>{children}</div>
        {footer && <div className="shrink-0 px-5 pt-2 pb-[calc(var(--safe-bottom)+16px)]">{footer}</div>}
        {!footer && <div className="shrink-0 pb-(--safe-bottom)" />}
      </div>
    </div>,
    document.body,
  )
}
