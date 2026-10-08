import type { Account, Category } from './types'

// Categorías que vienen cargadas desde el inicio. Se pueden editar o archivar.
type Seed = Pick<Category, 'id' | 'name' | 'icon' | 'color' | 'kind'>

const EXPENSE: Seed[] = [
  { id: 'cat-comida', name: 'Comida', icon: 'utensils', color: '#F5A524', kind: 'expense' },
  { id: 'cat-super', name: 'Súper', icon: 'shopping-cart', color: '#10B981', kind: 'expense' },
  { id: 'cat-transporte', name: 'Transporte', icon: 'bus', color: '#06B6D4', kind: 'expense' },
  { id: 'cat-escuela', name: 'Escuela', icon: 'graduation-cap', color: '#3B5BFF', kind: 'expense' },
  { id: 'cat-gym', name: 'Gym', icon: 'dumbbell', color: '#F2545B', kind: 'expense' },
  { id: 'cat-suscripciones', name: 'Suscripciones', icon: 'tv', color: '#8B5CF6', kind: 'expense' },
  { id: 'cat-ocio', name: 'Ocio', icon: 'party-popper', color: '#6C8CFF', kind: 'expense' },
  { id: 'cat-salud', name: 'Salud', icon: 'heart-pulse', color: '#F2545B', kind: 'expense' },
  { id: 'cat-hogar', name: 'Renta y hogar', icon: 'house', color: '#8B5CF6', kind: 'expense' },
  { id: 'cat-servicios', name: 'Servicios', icon: 'zap', color: '#06B6D4', kind: 'expense' },
  { id: 'cat-celular', name: 'Celular', icon: 'smartphone', color: '#3B5BFF', kind: 'expense' },
  { id: 'cat-ropa', name: 'Ropa', icon: 'shirt', color: '#6C8CFF', kind: 'expense' },
  { id: 'cat-regalos', name: 'Regalos', icon: 'gift', color: '#F5A524', kind: 'expense' },
  { id: 'cat-otros-gasto', name: 'Otros', icon: 'ellipsis', color: '#94A3B8', kind: 'expense' },
]

const INCOME: Seed[] = [
  { id: 'cat-sueldo', name: 'Sueldo', icon: 'briefcase', color: '#10B981', kind: 'income' },
  { id: 'cat-beca', name: 'Beca', icon: 'graduation-cap', color: '#3B5BFF', kind: 'income' },
  { id: 'cat-extras', name: 'Extras', icon: 'hand-coins', color: '#8B5CF6', kind: 'income' },
  { id: 'cat-regalos-ingreso', name: 'Regalos', icon: 'gift', color: '#F5A524', kind: 'income' },
  { id: 'cat-reembolsos', name: 'Reembolsos', icon: 'undo-2', color: '#06B6D4', kind: 'income' },
  { id: 'cat-otros-ingreso', name: 'Otros', icon: 'ellipsis', color: '#94A3B8', kind: 'income' },
]

export const DEFAULT_CATEGORIES: Category[] = [...EXPENSE, ...INCOME].map((c, i) => ({
  ...c,
  archived: false,
  order: i,
}))

export const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc-efectivo',
    name: 'Efectivo',
    type: 'cash',
    initialBalance: 0,
    color: '#10B981',
    archived: false,
    order: 0,
    createdAt: 0,
  },
]

export const ACCOUNT_COLORS = ['#3B5BFF', '#10B981', '#8B5CF6', '#F5A524', '#06B6D4', '#F2545B', '#6C8CFF', '#94A3B8']

export const ACCOUNT_ICON: Record<Account['type'], string> = {
  cash: 'banknote',
  debit: 'wallet',
  credit: 'credit-card',
  savings: 'piggy-bank',
}
