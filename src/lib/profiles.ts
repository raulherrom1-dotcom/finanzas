import { readLocal, writeLocal } from './storage'

// Cada perfil tiene su propia base de datos en el celular. El perfil principal usa la original ('finanzas').

export interface Profile {
  id: string
  name: string
}

export const MAIN_PROFILE = 'main'
const LIST = 'finanzas:profiles'
const ACTIVE = 'finanzas:activeProfile'

export function listProfiles(): Profile[] {
  return readLocal<Profile[]>(LIST, [{ id: MAIN_PROFILE, name: 'Raúl' }])
}

export function saveProfiles(list: Profile[]) {
  writeLocal(LIST, list)
}

export function activeProfile(): Profile {
  const id = readLocal(ACTIVE, MAIN_PROFILE)
  const list = listProfiles()
  return list.find((p) => p.id === id) ?? list.find((p) => p.id === MAIN_PROFILE) ?? { id: MAIN_PROFILE, name: 'Raúl' }
}

export function dbNameFor(id: string): string {
  return id === MAIN_PROFILE ? 'finanzas' : `finanzas-${id}`
}

/** Clave de localStorage propia del perfil activo (borradores, última cuenta usada). */
export function profileKey(key: string): string {
  const id = activeProfile().id
  return id === MAIN_PROFILE ? `finanzas:${key}` : `finanzas:${id}:${key}`
}

/** Cambia de perfil recargando la app, para que todo abra con la base de datos de ese perfil. */
export function switchProfile(id: string) {
  writeLocal(ACTIVE, id)
  location.hash = '/'
  location.reload()
}
