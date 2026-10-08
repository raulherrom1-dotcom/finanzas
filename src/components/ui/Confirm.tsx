import type { ReactNode } from 'react'
import { Sheet } from './Sheet'
import { Button } from './Button'

/** Confirmación para acciones que no se pueden deshacer fácilmente. */
export function ConfirmSheet({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = 'danger',
}: {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  tone?: 'danger' | 'primary'
}) {
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant={tone} size="lg" className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {children && <div className="pb-2 text-base text-muted">{children}</div>}
    </Sheet>
  )
}
