import { useEffect, useState } from 'react'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Field, TextInput } from '../../components/ui/Form'
import { Button } from '../../components/ui/Button'
import { getSetting, setSetting } from '../../db/db'
import { useApp } from '../../state/app'
import { navigate } from '../../lib/router'

export function Perfil() {
  const [name, setName] = useState<string | null>(null)
  const { showToast } = useApp()

  useEffect(() => {
    getSetting('userName', 'Raúl').then(setName)
  }, [])

  if (name === null) return null

  return (
    <>
      <ScreenHeader title="Tu nombre" back="/ajustes" />
      <div className="px-4">
        <Field label="¿Cómo quieres que te salude?" hint="Solo se usa en el saludo de Inicio.">
          {(id) => <TextInput id={id} value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Button
          block
          size="lg"
          onClick={async () => {
            await setSetting('userName', name.trim() || 'Raúl')
            showToast('Nombre guardado')
            navigate('/ajustes')
          }}
        >
          Guardar nombre
        </Button>
      </div>
    </>
  )
}
