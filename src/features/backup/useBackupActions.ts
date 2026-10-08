import { useApp } from '../../state/app'
import { backupFileName, buildBackup, markBackupDone, saveFile } from '../../lib/backup'

/** Guardar el respaldo completo (compartido por Inicio y Ajustes). */
export function useSaveBackup() {
  const { showToast } = useApp()
  return async () => {
    try {
      const backup = await buildBackup()
      const ok = await saveFile(JSON.stringify(backup), backupFileName(), 'application/json')
      if (!ok) return false
      await markBackupDone()
      showToast('Respaldo guardado')
      return true
    } catch {
      showToast('No se pudo guardar el respaldo. Inténtalo de nuevo.', { tone: 'error' })
      return false
    }
  }
}
