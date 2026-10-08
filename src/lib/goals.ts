import type { Cents, Goal, GoalContribution } from '../db/types'
import { daysBetween, todayISO, type ISODate } from './dates'

export interface GoalView {
  goal: Goal
  saved: Cents
  pct: number
  remaining: Cents
  done: boolean
  /** Meses que faltan para la fecha objetivo (al menos 1) */
  monthsLeft: number | null
  /** Cuánto ahorrar al mes para llegar a tiempo */
  perMonth: Cents | null
  overdue: boolean
}

export function goalViews(goals: Goal[], contributions: GoalContribution[], today: ISODate = todayISO()): GoalView[] {
  const saved = new Map<string, Cents>()
  for (const c of contributions) saved.set(c.goalId, (saved.get(c.goalId) ?? 0) + c.amount)
  return goals
    .filter((g) => !g.archived)
    .map((goal) => {
      const s = Math.max(0, saved.get(goal.id) ?? 0)
      const remaining = Math.max(0, goal.target - s)
      const done = s >= goal.target
      let monthsLeft: number | null = null
      let perMonth: Cents | null = null
      let overdue = false
      if (goal.deadline && !done) {
        const days = daysBetween(today, goal.deadline)
        overdue = days < 0
        monthsLeft = Math.max(1, Math.ceil(days / 30.44))
        perMonth = overdue ? remaining : Math.ceil(remaining / monthsLeft)
      }
      return { goal, saved: s, pct: goal.target > 0 ? Math.min(100, (s / goal.target) * 100) : 0, remaining, done, monthsLeft, perMonth, overdue }
    })
}

/** La meta "más cercana": la de fecha más próxima; si ninguna tiene fecha, la más avanzada. */
export function nearestGoal(views: GoalView[]): GoalView | null {
  const open = views.filter((v) => !v.done)
  if (!open.length) return null
  const dated = open.filter((v) => v.goal.deadline).sort((a, b) => (a.goal.deadline! < b.goal.deadline! ? -1 : 1))
  if (dated.length) return dated[0]
  return [...open].sort((a, b) => b.pct - a.pct)[0]
}
