import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { readLocal, writeLocal } from '../lib/storage'
import type { ID, TxType } from '../db/types'

export type QuickAddRequest = { editId?: ID; type?: TxType } | null

export type ToastTone = 'success' | 'info' | 'error'
export type ToastMsg = { id: number; text: string; tone: ToastTone; action?: { label: string; run: () => void } }

interface AppState {
  privacy: boolean
  togglePrivacy: () => void
  quickAdd: QuickAddRequest
  openQuickAdd: (req?: { editId?: ID; type?: TxType }) => void
  closeQuickAdd: () => void
  toast: ToastMsg | null
  showToast: (text: string, opts?: { tone?: ToastTone; action?: ToastMsg['action'] }) => void
  dismissToast: () => void
}

const Ctx = createContext<AppState | null>(null)

let toastSeq = 0

export function AppProvider({ children }: { children: ReactNode }) {
  const [privacy, setPrivacy] = useState(() => readLocal('privacy', false))
  const [quickAdd, setQuickAdd] = useState<QuickAddRequest>(null)
  const [toast, setToast] = useState<ToastMsg | null>(null)

  const togglePrivacy = useCallback(() => {
    setPrivacy((p) => {
      writeLocal('privacy', !p)
      return !p
    })
  }, [])

  const openQuickAdd = useCallback((req: { editId?: ID; type?: TxType } = {}) => setQuickAdd(req), [])
  const closeQuickAdd = useCallback(() => setQuickAdd(null), [])

  const showToast = useCallback<AppState['showToast']>((text, opts = {}) => {
    setToast({ id: ++toastSeq, text, tone: opts.tone ?? 'success', action: opts.action })
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])

  const value = useMemo(
    () => ({ privacy, togglePrivacy, quickAdd, openQuickAdd, closeQuickAdd, toast, showToast, dismissToast }),
    [privacy, togglePrivacy, quickAdd, openQuickAdd, closeQuickAdd, toast, showToast, dismissToast],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp fuera de AppProvider')
  return v
}
