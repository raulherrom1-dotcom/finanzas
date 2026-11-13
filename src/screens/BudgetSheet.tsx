import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Sheet } from '../components/ui/Sheet'
import { Button } from '../components/ui/Button'
import { Field, MoneyInput } from '../components/ui/Form'
import { CategoryChips } from '../components/CategoryChips'
import { setBudget } from '../db/actions'
import type { Category } from '../db/types'
import { useApp } from '../state/app'
import { CYCLE_WORDS, freqOf, periodTitle, type PayCycle } from '../lib/budget'
import { monthLabel, type MonthKey } from '../lib/dates'
import { useMoney } from '../components/ui/Amount'

export type BudgetTarget = { kind: 'total' } | { kind: 'category'; category?: Category }

/** Poner, cambiar o quitar el presupuesto de cada periodo (mes, quincena o semana). */
export function BudgetSheet({
  target,
  month,
  current,
  average,
  categories,
  cycle,
  onClose,
}: {
  target: BudgetTarget | null
  month: MonthKey
  current: (categoryId: string) => number | null
  average: (categoryId: string) => number
  categories: Category[]
  cycle: PayCycle
  onClose: () => void
}) {
  const title = !target ? '' : target.kind === 'total' ? 'Presupuesto total' : target.category ? `Presupuesto de ${target.category.name}` : 'Nuevo presupuesto'
  return (
    <Sheet open={target !== null} onClose={onClose} title={title}>
      {target && (
        <BudgetForm
          key={target.kind === 'total' ? 'total' : (target.category?.id ?? 'new')}
          target={target}
          month={month}
          current={current}
          average={average}
          categories={categories}
          cycle={cycle}
          onClose={onClose}
        />
      )}
    </Sheet>
  )
}

function BudgetForm({
  target,
  month,
  current,
  average,
  categories,
  cycle,
  onClose,
}: {
  target: BudgetTarget
  month: MonthKey
  current: (categoryId: string) => number | null
  average: (categoryId: string) => number
  categories: Category[]
  cycle: PayCycle
  onClose: () => void
}) {
  const words = CYCLE_WORDS[freqOf(cycle)]
  const fromLabel = freqOf(cycle) === 'monthly' ? monthLabel(month).toLowerCase() : `la ${periodTitle(cycle, month).toLowerCase()}`
  const { showToast } = useApp()
  const money = useMoney()
  const [categoryId, setCategoryId] = useState<string | undefined>(target.kind === 'total' ? 'total' : target.category?.id)
  const existing = categoryId ? current(categoryId) : null
  const [amount, setAmount] = useState<number | null>(existing)
  const [inputKey, setInputKey] = useState(0)
  const avg = categoryId ? average(categoryId) : 0
  const pickCategory = target.kind === 'category' && !target.category

  const save = async () => {
    if (!categoryId || !amount) return
    await setBudget(categoryId, month, amount)
    showToast('Presupuesto guardado')
    onClose()
  }

  const remove = async () => {
    if (!categoryId) return
    await setBudget(categoryId, month, 0)
    showToast('Presupuesto quitado')
    onClose()
  }

  return (
    <div className="pt-2">
      {pickCategory && (
        <div className="mb-5">
          <p className="mb-2 text-sm font-bold">Categoría</p>
          <CategoryChips
            categories={categories.filter((c) => c.kind === 'expense' && !c.archived)}
            isSelected={(c) => c.id === categoryId}
            isDisabled={(c) => current(c.id) !== null}
            onPick={(c) => {
              setCategoryId(c.id)
              setAmount(null)
              setInputKey((k) => k + 1)
            }}
          />
        </div>
      )}

      {categoryId && (
        <>
          <Field label={words.limit} hint={`Aplica desde ${fromLabel} en adelante.`}>
            {(id) => <MoneyInput key={inputKey} id={id} cents={amount} onChange={setAmount} />}
          </Field>

          {avg > 0 && (
            <button
              type="button"
              onClick={() => {
                const rounded = Math.ceil(avg / 10000) * 10000
                setAmount(rounded)
                setInputKey((k) => k + 1)
              }}
              className="mb-5 flex w-full items-center gap-3 rounded-card bg-info p-4 text-left text-info-ink active:brightness-97"
            >
              <Sparkles size={20} className="shrink-0" />
              <span className="flex-1 text-sm">
                En {words.recent} gastaste en promedio <strong>{money(avg)}</strong> {words.per}.
                <span className="mt-0.5 block font-bold">Usar {money(Math.ceil(avg / 10000) * 10000, { noCents: true })}</span>
              </span>
            </button>
          )}

          <Button size="lg" block disabled={!amount} onClick={save}>
            Guardar presupuesto
          </Button>
          {existing !== null && (
            <Button variant="ghost" block className="mt-1 text-neg-ink active:bg-neg-soft" onClick={remove}>
              Quitar presupuesto
            </Button>
          )}
        </>
      )}
    </div>
  )
}
