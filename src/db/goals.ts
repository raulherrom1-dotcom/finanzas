import { db, newId } from './db'
import type { Goal } from './types'
import type { ISODate } from '../lib/dates'

export type GoalInput = Pick<Goal, 'name' | 'target' | 'icon' | 'color'> & { id?: string; deadline?: ISODate }

export async function saveGoal(input: GoalInput): Promise<string> {
  const clean = { ...input }
  if (!clean.deadline) delete clean.deadline
  if (clean.id) {
    const prev = await db.goals.get(clean.id)
    if (!prev) return clean.id
    const row: Goal = { ...prev, ...clean, id: clean.id }
    if (!input.deadline) delete row.deadline
    await db.goals.put(row)
    await refreshCompletion(clean.id)
    return clean.id
  }
  const id = newId()
  await db.goals.add({ ...clean, id, archived: false, createdAt: Date.now() })
  return id
}

export async function goalSaved(goalId: string): Promise<number> {
  let total = 0
  await db.goalContributions.where('goalId').equals(goalId).each((c) => (total += c.amount))
  return total
}

/** Marca o desmarca la meta como cumplida. Devuelve true si se acaba de cumplir. */
async function refreshCompletion(goalId: string): Promise<boolean> {
  const g = await db.goals.get(goalId)
  if (!g) return false
  const saved = await goalSaved(goalId)
  const reached = saved >= g.target
  if (reached && !g.completedAt) {
    await db.goals.update(goalId, { completedAt: Date.now() })
    return true
  }
  if (!reached && g.completedAt) await db.goals.update(goalId, { completedAt: undefined })
  return false
}

/** Abona (monto positivo) o retira (negativo). Devuelve si con esto se cumplió la meta. */
export async function addContribution(goalId: string, amount: number, date: ISODate, note?: string): Promise<{ completed: boolean }> {
  await db.goalContributions.add({ id: newId(), goalId, amount: Math.round(amount), date, note: note?.trim() || undefined, createdAt: Date.now() })
  return { completed: await refreshCompletion(goalId) }
}

export async function deleteContribution(id: string) {
  const c = await db.goalContributions.get(id)
  await db.goalContributions.delete(id)
  if (c) await refreshCompletion(c.goalId)
}

export async function deleteGoal(id: string) {
  await db.transaction('rw', db.goals, db.goalContributions, async () => {
    await db.goalContributions.where('goalId').equals(id).delete()
    await db.goals.delete(id)
  })
}
