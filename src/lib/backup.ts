import { db, setSetting } from '../db/db'
import type { Account, Budget, Category, Goal, GoalContribution, Recurring, Setting, Transaction } from '../db/types'
import { todayISO } from './dates'
import { activeProfile, MAIN_PROFILE } from './profiles'

// Respaldo completo en JSON. Se guarda en el celular (Archivos / iCloud) con la hoja de compartir.

export const BACKUP_APP = 'finanzas'
export const BACKUP_VERSION = 1

export interface BackupFile {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  data: {
    accounts: Account[]
    categories: Category[]
    transactions: Transaction[]
    budgets: Budget[]
    recurring: Recurring[]
    goals: Goal[]
    goalContributions: GoalContribution[]
    settings: Setting[]
  }
}

/** Ajustes que viajan en el respaldo; los demás son de este celular. */
const BACKUP_SETTINGS = ['userName', 'payCycle']

const TABLES = ['accounts', 'categories', 'transactions', 'budgets', 'recurring', 'goals', 'goalContributions', 'settings'] as const

export async function buildBackup(): Promise<BackupFile> {
  const [accounts, categories, transactions, budgets, recurring, goals, goalContributions, settings] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.budgets.toArray(),
    db.recurring.toArray(),
    db.goals.toArray(),
    db.goalContributions.toArray(),
    db.settings.toArray(),
  ])
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { accounts, categories, transactions, budgets, recurring, goals, goalContributions, settings: settings.filter((s) => BACKUP_SETTINGS.includes(s.key)) },
  }
}

export function backupFileName(): string {
  const p = activeProfile()
  // Con varios perfiles, el nombre evita que un respaldo reemplace al de otra persona en Archivos.
  const who = p.id === MAIN_PROFILE ? '' : `-${p.name.replace(/[^\p{L}\p{N}]+/gu, '-')}`
  return `finanzas-respaldo${who}-${todayISO()}.json`
}

/** Revisa que el archivo sea un respaldo de esta app antes de tocar nada. */
export function readBackup(text: string): BackupFile {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un respaldo válido (no es JSON).')
  }
  const b = json as Partial<BackupFile>
  if (!b || b.app !== BACKUP_APP || typeof b.version !== 'number' || !b.data) throw new Error('Este archivo no es un respaldo de Finanzas.')
  if (b.version > BACKUP_VERSION) throw new Error('El respaldo es de una versión más nueva de la app. Actualiza la app e inténtalo de nuevo.')
  for (const t of TABLES) {
    const rows = (b.data as Record<string, unknown>)[t]
    if (rows !== undefined && !Array.isArray(rows)) throw new Error(`El respaldo está dañado (${t}).`)
  }
  for (const tx of b.data.transactions ?? []) {
    if (typeof tx.id !== 'string' || typeof tx.date !== 'string' || !Number.isInteger(tx.amount)) throw new Error('El respaldo tiene movimientos dañados.')
  }
  return b as BackupFile
}

/** Reemplaza TODOS los datos por los del respaldo. */
export async function restoreBackup(b: BackupFile) {
  await db.transaction('rw', [db.accounts, db.categories, db.transactions, db.budgets, db.recurring, db.goals, db.goalContributions, db.settings], async () => {
    for (const t of TABLES) {
      const table = db.table(t)
      if (t === 'settings') {
        // Conserva fechas de respaldo y recordatorios de este celular
        const rows = (b.data.settings ?? []).filter((s) => BACKUP_SETTINGS.includes(s.key))
        await table.bulkPut(rows)
        continue
      }
      await table.clear()
      const rows = (b.data as Record<string, unknown[]>)[t] ?? []
      if (rows.length) await table.bulkAdd(rows)
    }
  })
}

export async function markBackupDone() {
  await setSetting('lastBackupAt', Date.now())
}

const isMobile = () => typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

/**
 * En iPhone abre la hoja de compartir (para "Guardar en Archivos"); en computadora descarga.
 * Devuelve false si se canceló.
 */
export async function saveFile(content: string, filename: string, type: string): Promise<boolean> {
  const blob = new Blob([content], { type })
  const file = new File([blob], filename, { type })
  if (isMobile() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return true
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false
      // Si compartir falla por otra razón, intenta descargar
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return true
}

/** Abre el selector de archivos y devuelve el elegido. */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}

export const BACKUP_REMINDER_DAYS = 30
