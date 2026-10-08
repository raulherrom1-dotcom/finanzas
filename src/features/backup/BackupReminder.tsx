import { useLiveQuery } from 'dexie-react-hooks'
import { DatabaseBackup } from 'lucide-react'
import { Callout } from '../../components/ui/Callout'
import { Button } from '../../components/ui/Button'
import { db, setSetting, useSetting } from '../../db/db'
import { BACKUP_REMINDER_DAYS } from '../../lib/backup'
import { useSaveBackup } from './useBackupActions'

const DAY = 86_400_000

/** Recordatorio suave: si pasaron más de 30 días sin respaldo (iOS puede borrar datos de PWAs poco usadas). */
export function BackupReminder() {
  const lastBackup = useSetting<number | null>('lastBackupAt', null)
  const firstOpened = useSetting<number | null>('firstOpenedAt', null)
  const snoozedUntil = useSetting<number | null>('backupReminderSnoozedUntil', null)
  const hasData = useLiveQuery(async () => (await db.transactions.filter((t) => !t.sample).count()) > 0, [])
  const saveBackup = useSaveBackup()

  const since = lastBackup ?? firstOpened
  if (!hasData || !since) return null
  const days = Math.floor((Date.now() - since) / DAY)
  if (days <= BACKUP_REMINDER_DAYS || (snoozedUntil && Date.now() < snoozedUntil)) return null

  return (
    <Callout
      icon={DatabaseBackup}
      title="Es buen momento para un respaldo"
      action={
        <div className="flex gap-2">
          <Button size="sm" onClick={saveBackup}>
            Guardar respaldo
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSetting('backupReminderSnoozedUntil', Date.now() + 7 * DAY)}>
            En una semana
          </Button>
        </div>
      }
    >
      {lastBackup ? `Tu último respaldo fue hace ${days} días.` : 'Todavía no guardas un respaldo.'} iOS puede borrar los datos de apps que no se abren seguido; guárdalo en Archivos o iCloud.
    </Callout>
  )
}
