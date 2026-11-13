import { useEffect, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Database, Download, FileSpreadsheet, FileUp, ShieldAlert, ShieldCheck, Sparkles, Trash2, Upload } from 'lucide-react'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Button } from '../../components/ui/Button'
import { ConfirmSheet } from '../../components/ui/Confirm'
import { db, useSetting } from '../../db/db'
import { byId } from '../../db/queries'
import { hasSampleData, loadSampleData, removeSampleData } from '../../db/sample'
import { useApp } from '../../state/app'
import { pickFile, readBackup, restoreBackup, saveFile, type BackupFile } from '../../lib/backup'
import { transactionsToCsv } from '../../lib/csv'
import { daysBetween, longDate, todayISO } from '../../lib/dates'
import { navigate } from '../../lib/router'
import { useSaveBackup } from '../../features/backup/useBackupActions'
import { activeProfile, listProfiles } from '../../lib/profiles'
import { cn } from '../../lib/cn'

export function Respaldo() {
  const { showToast } = useApp()
  const saveBackup = useSaveBackup()
  const lastBackup = useSetting<number | null>('lastBackupAt', null)
  const txCount = useLiveQuery(() => db.transactions.count(), []) ?? 0
  const sample = useLiveQuery(() => hasSampleData(), [])
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [restore, setRestore] = useState<BackupFile | null>(null)
  const [confirm, setConfirm] = useState<null | 'removeSample' | 'wipe'>(null)
  const [busy, setBusy] = useState(false)
  // Con varios perfiles, los avisos dicen de quién son los datos
  const whose = listProfiles().length > 1 ? ` del perfil de ${activeProfile().name}` : ''

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(false))
  }, [])

  const days = lastBackup ? daysBetween(todayISO(new Date(lastBackup)), todayISO()) : null
  const stale = days === null || days > 30

  const exportCsv = async () => {
    const [txs, cats, accs] = await Promise.all([db.transactions.toArray(), db.categories.toArray(), db.accounts.toArray()])
    if (!txs.length) return showToast('Todavía no hay movimientos para exportar', { tone: 'info' })
    const ok = await saveFile(transactionsToCsv(txs, byId(cats), byId(accs)), `finanzas-movimientos-${todayISO()}.csv`, 'text/csv')
    if (ok) showToast('Movimientos exportados')
  }

  const chooseBackup = async () => {
    const file = await pickFile('application/json,.json')
    if (!file) return
    try {
      setRestore(readBackup(await file.text()))
    } catch (e) {
      showToast((e as Error).message, { tone: 'error' })
    }
  }

  return (
    <>
      <ScreenHeader title="Respaldo y datos" back="/ajustes" />
      <div className="space-y-5 px-4">
        <section className={cn('flex gap-3 rounded-card p-4', stale ? 'bg-warn-soft text-warn-ink' : 'bg-pos-soft text-pos-ink')}>
          {stale ? <ShieldAlert size={22} className="mt-0.5 shrink-0" /> : <ShieldCheck size={22} className="mt-0.5 shrink-0" />}
          <div className="text-sm">
            <p className="font-bold">
              {days === null ? 'Todavía no has hecho un respaldo' : days === 0 ? 'Respaldaste hoy' : `Último respaldo hace ${days} ${days === 1 ? 'día' : 'días'}`}
            </p>
            <p className="mt-0.5">
              {persisted
                ? 'El navegador marcó tus datos como permanentes. Aun así, guarda un respaldo de vez en cuando.'
                : 'Tus datos viven solo en este celular, y iOS puede borrar los de apps que no usas en semanas. Guarda un respaldo en Archivos o iCloud.'}
            </p>
          </div>
        </section>

        <Group title="Respaldo completo" hint="Incluye cuentas, categorías, movimientos, presupuestos, recurrentes y metas.">
          <Button size="lg" block icon={<Download size={19} />} onClick={saveBackup}>
            Guardar respaldo
          </Button>
          <Button size="lg" block variant="secondary" icon={<Upload size={19} />} onClick={chooseBackup}>
            Restaurar respaldo
          </Button>
        </Group>

        <Group title="Movimientos en CSV" hint="Para abrir en Excel o Numbers, o traer los movimientos de tu banco.">
          <Button size="lg" block variant="secondary" icon={<FileSpreadsheet size={19} />} onClick={exportCsv}>
            Exportar movimientos
          </Button>
          <Button size="lg" block variant="secondary" icon={<FileUp size={19} />} onClick={() => navigate('/ajustes/importar')}>
            Importar CSV del banco
          </Button>
        </Group>

        <Group title="Datos de ejemplo" hint="Movimientos inventados para ver las gráficas. Se borran sin tocar tus datos.">
          {sample ? (
            <Button size="lg" block variant="danger" icon={<Trash2 size={19} />} onClick={() => setConfirm('removeSample')}>
              Borrar datos de ejemplo
            </Button>
          ) : (
            <Button
              size="lg"
              block
              variant="secondary"
              icon={<Sparkles size={19} />}
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                await loadSampleData()
                setBusy(false)
                showToast('Datos de ejemplo cargados')
              }}
            >
              Cargar datos de ejemplo
            </Button>
          )}
        </Group>

        <Group title="Empezar de cero">
          <Button size="lg" block variant="ghost" className="text-neg-ink active:bg-neg-soft" icon={<Database size={19} />} onClick={() => setConfirm('wipe')}>
            Borrar todos mis datos
          </Button>
        </Group>
        <p className="px-1 text-xs text-muted">{txCount} movimientos guardados en este celular. Nada se sube a internet.</p>
      </div>

      <ConfirmSheet
        open={!!restore}
        title="¿Restaurar este respaldo?"
        confirmLabel="Restaurar"
        tone="primary"
        onCancel={() => setRestore(null)}
        onConfirm={async () => {
          if (!restore) return
          await restoreBackup(restore)
          setRestore(null)
          showToast('Respaldo restaurado')
          navigate('/')
        }}
      >
        {restore && (
          <>
            Respaldo del {longDate(todayISO(new Date(restore.exportedAt))).toLowerCase()} con {restore.data.transactions?.length ?? 0} movimientos y{' '}
            {restore.data.accounts?.length ?? 0} cuentas. <strong className="text-ink">Reemplaza todo lo que hay ahora{whose || ' en la app'}.</strong>
          </>
        )}
      </ConfirmSheet>

      <ConfirmSheet
        open={confirm === 'removeSample'}
        title="¿Borrar los datos de ejemplo?"
        confirmLabel="Borrar"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await removeSampleData()
          setConfirm(null)
          showToast('Datos de ejemplo borrados')
        }}
      >
        Solo se quitan los movimientos, cuentas, metas y presupuestos de ejemplo. Lo que registraste tú se queda.
      </ConfirmSheet>

      <ConfirmSheet
        open={confirm === 'wipe'}
        title="¿Borrar todos tus datos?"
        confirmLabel="Borrar todo"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await db.delete()
          location.hash = '/'
          location.reload()
        }}
      >
        Se borran movimientos, cuentas, presupuestos, recurrentes y metas{whose || ' de este celular'}. No se puede deshacer: guarda un respaldo antes si lo podrías necesitar.
      </ConfirmSheet>
    </>
  )
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-extrabold tracking-tight">{title}</h2>
      {hint && <p className="mb-3 text-sm text-muted">{hint}</p>}
      <div className={cn('space-y-2', !hint && 'mt-2')}>{children}</div>
    </section>
  )
}
