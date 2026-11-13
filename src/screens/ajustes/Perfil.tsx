import { useEffect, useState } from 'react'
import Dexie from 'dexie'
import { Check, Trash2, UserRound } from 'lucide-react'
import { ScreenHeader, SectionTitle } from '../../components/ui/ScreenHeader'
import { Field, TextInput } from '../../components/ui/Form'
import { Button, IconButton } from '../../components/ui/Button'
import { ConfirmSheet } from '../../components/ui/Confirm'
import { getSetting, newId, setSetting } from '../../db/db'
import { useApp } from '../../state/app'
import { navigate } from '../../lib/router'
import { activeProfile, dbNameFor, listProfiles, MAIN_PROFILE, saveProfiles, switchProfile, type Profile } from '../../lib/profiles'

export function Perfil() {
  const me = activeProfile()
  const [name, setName] = useState<string | null>(null)
  const [profiles, setProfiles] = useState(listProfiles)
  const [newName, setNewName] = useState('')
  const [toDelete, setToDelete] = useState<Profile | null>(null)
  const { showToast } = useApp()

  useEffect(() => {
    getSetting('userName', me.name).then(setName)
  }, [me.name])

  if (name === null) return null

  /** Guarda la lista con el nombre actual de este perfil, para que se vea bien desde los otros. */
  const withMyName = (list: Profile[], myName: string) =>
    list.some((p) => p.id === me.id) ? list.map((p) => (p.id === me.id ? { ...p, name: myName } : p)) : [{ ...me, name: myName }, ...list]

  const saveName = async () => {
    const clean = name.trim() || me.name
    await setSetting('userName', clean)
    saveProfiles(withMyName(profiles, clean))
    showToast('Nombre guardado')
    navigate('/ajustes')
  }

  const addProfile = () => {
    const clean = newName.trim()
    if (!clean) return
    const id = newId()
    saveProfiles([...withMyName(profiles, name.trim() || me.name), { id, name: clean }])
    switchProfile(id)
  }

  const removeProfile = async (p: Profile) => {
    await Dexie.delete(dbNameFor(p.id))
    const list = profiles.filter((x) => x.id !== p.id)
    saveProfiles(list)
    setProfiles(list)
    setToDelete(null)
    showToast(`Perfil de ${p.name} borrado`)
  }

  const others = profiles.filter((p) => p.id !== me.id)

  return (
    <>
      <ScreenHeader title="Perfiles" back="/ajustes" />
      <div className="px-4">
        <Field label="Tu nombre en este perfil" hint="Se usa en el saludo de Inicio.">
          {(id) => <TextInput id={id} value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Button block size="lg" onClick={saveName}>
          Guardar nombre
        </Button>

        <section className="mt-8">
          <SectionTitle>Perfiles en este celular</SectionTitle>
          <ul className="overflow-hidden rounded-card border border-line bg-surface">
            <li className="flex min-h-16 items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <span className="flex size-10 items-center justify-center btn-primary rounded-full">
                <Check size={20} strokeWidth={2.4} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold">{name.trim() || me.name}</span>
                <span className="block text-sm text-muted">Estás aquí</span>
              </span>
            </li>
            {others.map((p) => (
              <li key={p.id} className="flex items-center gap-1 border-b border-line pr-2 last:border-b-0">
                <button type="button" onClick={() => switchProfile(p.id)} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left active:bg-accent-soft">
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent-light">
                    <UserRound size={20} strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold">{p.name}</span>
                    <span className="block text-sm text-muted">Toca para cambiar</span>
                  </span>
                </button>
                {p.id !== MAIN_PROFILE && (
                  <IconButton label={`Borrar perfil de ${p.name}`} tone="surface" onClick={() => setToDelete(p)}>
                    <Trash2 size={18} />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6">
          <Field label="Agregar perfil" hint="Cada perfil tiene sus propias cuentas, movimientos, presupuestos y metas.">
            {(id) => <TextInput id={id} value={newName} maxLength={24} placeholder="Nombre" onChange={(e) => setNewName(e.target.value)} />}
          </Field>
          <Button block variant="secondary" disabled={!newName.trim()} onClick={addProfile}>
            Crear y cambiar a este perfil
          </Button>
        </section>
      </div>

      <ConfirmSheet
        open={toDelete !== null}
        title={`¿Borrar el perfil de ${toDelete?.name ?? ''}?`}
        confirmLabel="Borrar perfil"
        onConfirm={() => toDelete && removeProfile(toDelete)}
        onCancel={() => setToDelete(null)}
      >
        Se borran todos sus movimientos, cuentas, presupuestos y metas de este celular. Si quieres conservarlos, entra a su perfil y haz un respaldo primero.
      </ConfirmSheet>
    </>
  )
}
