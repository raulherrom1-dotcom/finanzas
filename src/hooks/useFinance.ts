import { useAccounts, useAllTransactions, useBudgets, useCategories, useGoalContributions, useGoals, useRecurring } from '../db/queries'

/** Todos los datos que necesitan las pantallas de resumen. */
export function useFinance() {
  const txs = useAllTransactions()
  const accounts = useAccounts({ includeArchived: true })
  const categories = useCategories({ includeArchived: true })
  const budgets = useBudgets()
  const recurring = useRecurring()
  const goals = useGoals()
  const contributions = useGoalContributions()
  return { loaded: txs !== undefined, txs: txs ?? [], accounts, categories, budgets, recurring, goals, contributions }
}
