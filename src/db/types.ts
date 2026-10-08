import type { ISODate, MonthKey } from '../lib/dates'

export type ID = string

/** Montos SIEMPRE en centavos (enteros). */
export type Cents = number

export type AccountType = 'cash' | 'debit' | 'credit' | 'savings'

export interface Account {
  id: ID
  name: string
  type: AccountType
  /** Saldo al empezar a usar la app. En tarjetas de crédito, la deuda inicial va en negativo. */
  initialBalance: Cents
  color: string
  /** Solo tarjetas de crédito */
  creditLimit?: Cents
  cutoffDay?: number
  dueDay?: number
  archived: boolean
  order: number
  createdAt: number
  sample?: boolean
}

export type CategoryKind = 'expense' | 'income'

export interface Category {
  id: ID
  name: string
  icon: string
  color: string
  kind: CategoryKind
  archived: boolean
  order: number
  sample?: boolean
}

export type TxType = 'expense' | 'income' | 'transfer'
export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'transfer' | 'other'

export interface Transaction {
  id: ID
  type: TxType
  /** Siempre positivo; el signo lo da el tipo. */
  amount: Cents
  date: ISODate
  categoryId?: ID
  /** Cuenta de origen (gasto/transferencia) o destino (ingreso). */
  accountId?: ID
  /** Solo transferencias: cuenta destino. */
  toAccountId?: ID
  method?: PaymentMethod
  note?: string
  recurringId?: ID
  /** Huella de la fila del CSV del banco, para no importar dos veces. */
  importHash?: string
  createdAt: number
  updatedAt: number
  sample?: boolean
}

/** Presupuesto vigente desde `fromMonth` hasta que haya otro más reciente. */
export interface Budget {
  /** `${categoryId}:${fromMonth}` */
  id: string
  categoryId: ID | 'total'
  amount: Cents
  fromMonth: MonthKey
  sample?: boolean
}

export type Frequency = 'weekly' | 'biweekly' | 'monthly'

export interface Recurring {
  id: ID
  name: string
  type: TxType
  amount: Cents
  categoryId?: ID
  accountId?: ID
  toAccountId?: ID
  note?: string
  frequency: Frequency
  /** Primera fecha. En mensual define el día del mes. */
  startDate: ISODate
  /** Próxima fecha por generar. */
  nextDate: ISODate
  endDate?: ISODate
  active: boolean
  createdAt: number
  sample?: boolean
}

export interface Goal {
  id: ID
  name: string
  target: Cents
  deadline?: ISODate
  icon: string
  color: string
  completedAt?: number
  archived: boolean
  createdAt: number
  sample?: boolean
}

export interface GoalContribution {
  id: ID
  goalId: ID
  /** Positivo = abono, negativo = retiro. */
  amount: Cents
  date: ISODate
  note?: string
  createdAt: number
  sample?: boolean
}

export interface Setting {
  key: string
  value: unknown
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Tarjeta de crédito',
  savings: 'Ahorro',
}

export const TX_TYPE_LABEL: Record<TxType, string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  transfer: 'Transferencia',
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  debit: 'Tarjeta de débito',
  credit: 'Tarjeta de crédito',
  transfer: 'Transferencia',
  other: 'Otro',
}

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
}
