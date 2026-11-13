import { useState } from 'react'
import { Archive, ChevronDown, ChevronRight, Plus, RotateCcw } from 'lucide-react'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { Button, IconButton } from '../../components/ui/Button'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { ColorPicker, Field, IconPicker, Segmented, TextInput } from '../../components/ui/Form'
import { Sheet } from '../../components/ui/Sheet'
import { ConfirmSheet } from '../../components/ui/Confirm'
import { useCategories } from '../../db/queries'
import { categoryUsage, saveCategory, setCategoryArchived } from '../../db/actions'
import type { Category, CategoryKind } from '../../db/types'
import { useApp } from '../../state/app'
import { cn } from '../../lib/cn'

export function Categorias() {
  const [kind, setKind] = useState<CategoryKind>('expense')
  const all = useCategories({ includeArchived: true }).filter((c) => c.kind === kind)
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const { showToast } = useApp()

  const active = all.filter((c) => !c.archived)
  const archived = all.filter((c) => c.archived)

  return (
    <>
      <ScreenHeader
        title="Categorías"
        back="/ajustes"
        right={
          <IconButton label="Nueva categoría" tone="soft" onClick={() => setEditing('new')}>
            <Plus size={22} strokeWidth={2.4} />
          </IconButton>
        }
      />
      <div className="px-4">
        <Segmented
          className="mb-4"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'expense', label: 'Gastos' },
            { value: 'income', label: 'Ingresos' },
          ]}
        />

        <ul className="overflow-hidden rounded-card border border-line bg-surface">
          {active.map((c) => (
            <li key={c.id} className="border-b border-line last:border-b-0">
              <button type="button" onClick={() => setEditing(c)} className="flex min-h-15 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-accent-soft">
                <CategoryIcon icon={c.icon} color={c.color} size={40} />
                <span className="flex-1 truncate text-base font-bold">{c.name}</span>
                <ChevronRight size={20} className="text-muted" />
              </button>
            </li>
          ))}
        </ul>

        {archived.length > 0 && (
          <div className="mt-6">
            <button type="button" onClick={() => setShowArchived((s) => !s)} className="flex min-h-11 items-center gap-1 text-sm font-bold text-muted">
              Archivadas ({archived.length})
              <ChevronDown size={18} className={cn('transition-transform', showArchived && 'rotate-180')} />
            </button>
            {showArchived && (
              <ul className="mt-2 space-y-2">
                {archived.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-card border border-line px-4 py-3">
                    <CategoryIcon icon={c.icon} color="#94A3B8" size={36} />
                    <p className="min-w-0 flex-1 truncate font-semibold text-muted">{c.name}</p>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<RotateCcw size={16} />}
                      onClick={async () => {
                        await setCategoryArchived(c.id, false)
                        showToast('Categoría restaurada')
                      }}
                    >
                      Restaurar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing && editing !== 'new' ? 'Editar categoría' : 'Nueva categoría'}>
        {editing !== null && (
          <CategoryForm key={editing === 'new' ? 'new' : editing.id} category={editing === 'new' ? undefined : editing} defaultKind={kind} onClose={() => setEditing(null)} />
        )}
      </Sheet>
    </>
  )
}

function CategoryForm({ category, defaultKind, onClose }: { category?: Category; defaultKind: CategoryKind; onClose: () => void }) {
  const { showToast } = useApp()
  const [name, setName] = useState(category?.name ?? '')
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? defaultKind)
  const [icon, setIcon] = useState(category?.icon ?? 'sparkles')
  const [color, setColor] = useState(category?.color ?? '#3B5BFF')
  const [error, setError] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState<number | null>(null)

  const save = async () => {
    if (!name.trim()) {
      setError('Escribe un nombre.')
      return
    }
    await saveCategory({ id: category?.id, name: name.trim(), kind, icon, color })
    showToast(category ? 'Categoría guardada' : 'Categoría creada')
    onClose()
  }

  const archive = async () => {
    if (!category) return
    await setCategoryArchived(category.id, true)
    setConfirmArchive(null)
    showToast('Categoría archivada')
    onClose()
  }

  return (
    <div className="pt-2">
      <div className="mb-5 flex items-center gap-3">
        <CategoryIcon icon={icon} color={color} size={52} />
        <p className="min-w-0 flex-1 truncate text-lg font-extrabold">{name.trim() || 'Nueva categoría'}</p>
      </div>

      <Field label="Nombre" error={error}>
        {(id) => <TextInput id={id} value={name} maxLength={28} placeholder="Ej. Café" onChange={(e) => (setName(e.target.value), setError(null))} />}
      </Field>

      {!category && (
        <div className="mb-4">
          <p className="mb-1.5 text-sm font-bold">Tipo</p>
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { value: 'expense', label: 'Gasto' },
              { value: 'income', label: 'Ingreso' },
            ]}
          />
        </div>
      )}

      <div className="mb-4">
        <p className="mb-1 text-sm font-bold">Color</p>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="mb-5">
        <p className="mb-2 text-sm font-bold">Ícono</p>
        <IconPicker value={icon} color={color} onChange={setIcon} />
      </div>

      <div className="sticky bottom-0 -mx-5 bg-elev px-5 pt-2 pb-1">
        <Button size="lg" block onClick={save}>
          {category ? 'Guardar cambios' : 'Crear categoría'}
        </Button>
        {category && (
          <Button variant="ghost" block className="mt-1" icon={<Archive size={18} />} onClick={async () => setConfirmArchive(await categoryUsage(category.id))}>
            Archivar categoría
          </Button>
        )}
      </div>

      <ConfirmSheet open={confirmArchive !== null} title="¿Archivar esta categoría?" confirmLabel="Archivar" tone="primary" onCancel={() => setConfirmArchive(null)} onConfirm={archive}>
        {confirmArchive
          ? `Tus ${confirmArchive} movimientos con esta categoría no cambian. Solo dejará de aparecer al registrar.`
          : 'Dejará de aparecer al registrar. Puedes restaurarla cuando quieras.'}
      </ConfirmSheet>
    </div>
  )
}
