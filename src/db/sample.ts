import { db } from './db'
import type { Account, Budget, Goal, GoalContribution, Recurring, Transaction } from './types'
import { addDays, addMonths, addMonthsToDate, currentMonth, monthStart, todayISO, weekday, type ISODate } from '../lib/dates'
import { dueDates, firstOccurrence } from '../lib/recurrence'

// Datos de ejemplo FICTICIOS para ver la app con gráficas desde el inicio.
// Todo va marcado con `sample: true` para poder borrarlo sin tocar tus datos reales.

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pesos = (n: number) => Math.round(n * 100)

export async function hasSampleData(): Promise<boolean> {
  return (await db.accounts.filter((a) => !!a.sample).count()) > 0 || (await db.transactions.filter((t) => !!t.sample).count()) > 0
}

export async function loadSampleData(): Promise<void> {
  if (await hasSampleData()) return
  const r = rng(20261007)
  const rand = (min: number, max: number) => min + r() * (max - min)
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)]

  const today = todayISO()
  const startMonth = addMonths(currentMonth(), -4)
  const start = monthStart(startMonth)
  const now = Date.now()

  const accounts: Account[] = [
    { id: 'sample-debito', name: 'Débito nómina', type: 'debit', initialBalance: pesos(6800), color: '#3B5BFF', archived: false, order: 1, createdAt: now, sample: true },
    {
      id: 'sample-tdc',
      name: 'Tarjeta Azul',
      type: 'credit',
      initialBalance: 0,
      color: '#8B5CF6',
      creditLimit: pesos(15000),
      cutoffDay: 3,
      dueDay: 23,
      archived: false,
      order: 2,
      createdAt: now,
      sample: true,
    },
    { id: 'sample-ahorro', name: 'Ahorro', type: 'savings', initialBalance: pesos(10000), color: '#10B981', archived: false, order: 3, createdAt: now, sample: true },
  ]

  const txs: Transaction[] = []
  let n = 0
  const add = (t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'sample'> & { id?: string }) => {
    n++
    txs.push({ ...t, id: t.id ?? `sample-tx-${n}`, createdAt: now + n, updatedAt: now + n, sample: true } as Transaction)
  }

  // Recurrentes y sus ocurrencias pasadas
  const recDefs: Array<Omit<Recurring, 'id' | 'nextDate' | 'createdAt' | 'active' | 'sample' | 'startDate'> & { id: string; day: number }> = [
    { id: 'sample-rec-sueldo', name: 'Sueldo practicante', type: 'income', amount: pesos(12000), categoryId: 'cat-sueldo', accountId: 'sample-debito', frequency: 'monthly', day: 10 },
    { id: 'sample-rec-beca', name: 'Beca', type: 'income', amount: pesos(1800), categoryId: 'cat-beca', accountId: 'sample-debito', frequency: 'monthly', day: 20 },
    { id: 'sample-rec-renta', name: 'Renta del cuarto', type: 'expense', amount: pesos(2800), categoryId: 'cat-hogar', accountId: 'sample-debito', frequency: 'monthly', day: 1 },
    { id: 'sample-rec-gym', name: 'Gym', type: 'expense', amount: pesos(499), categoryId: 'cat-gym', accountId: 'sample-debito', frequency: 'monthly', day: 5 },
    { id: 'sample-rec-celular', name: 'Plan de celular', type: 'expense', amount: pesos(249), categoryId: 'cat-celular', accountId: 'sample-tdc', frequency: 'monthly', day: 12 },
    { id: 'sample-rec-spotify', name: 'Spotify', type: 'expense', amount: pesos(129), categoryId: 'cat-suscripciones', accountId: 'sample-tdc', frequency: 'monthly', day: 15 },
    { id: 'sample-rec-netflix', name: 'Netflix', type: 'expense', amount: pesos(219), categoryId: 'cat-suscripciones', accountId: 'sample-tdc', frequency: 'monthly', day: 22 },
  ]
  const recurring: Recurring[] = recDefs.map(({ day, ...d }) => {
    const startDate = `${startMonth}-${String(day).padStart(2, '0')}`
    const first = firstOccurrence(d.frequency, startDate)
    const { dates, nextDate } = dueDates({ frequency: d.frequency, startDate, nextDate: first }, today)
    for (const date of dates) {
      add({ id: `rec:${d.id}:${date}`, type: d.type, amount: d.amount, date, categoryId: d.categoryId, accountId: d.accountId, recurringId: d.id, note: d.name, method: d.accountId === 'sample-tdc' ? 'credit' : 'debit' })
    }
    return { ...d, startDate, nextDate, active: true, createdAt: now, sample: true }
  })

  // Gastos del día a día
  const comida = ['Tacos', 'Comida corrida', 'Torta', 'Sushi', 'Pizza con amigos', 'Chilaquiles', 'Pozole', undefined, undefined, undefined]
  const transporte = ['Metro', 'Uber', 'DiDi', 'Metrobús', 'Gasolina', undefined]
  const ocio = ['Cine', 'Concierto', 'Bar', 'Boliche', 'Videojuego', undefined]
  const escuela = ['Copias', 'Libro', 'Material', 'Inscripción a taller']
  const salud = ['Farmacia', 'Consulta', 'Dentista']
  const payWith = (): { accountId: string; method: Transaction['method'] } => {
    const x = r()
    if (x < 0.45) return { accountId: 'acc-efectivo', method: 'cash' }
    if (x < 0.75) return { accountId: 'sample-debito', method: 'debit' }
    return { accountId: 'sample-tdc', method: 'credit' }
  }

  for (let d = start; d <= today; d = addDays(d, 1)) {
    const dow = weekday(d) // 0 lunes … 6 domingo
    const day = Number(d.slice(8, 10))

    const meals = r() < 0.62 ? (r() < 0.3 ? 2 : 1) : 0
    for (let i = 0; i < meals; i++) add({ type: 'expense', amount: pesos(Math.round(rand(45, 185))), date: d, categoryId: 'cat-comida', note: pick(comida), ...payWith() })
    if (dow < 5 && r() < 0.8) add({ type: 'expense', amount: pesos(Math.round(rand(18, 140))), date: d, categoryId: 'cat-transporte', note: pick(transporte), ...payWith() })
    if (dow === 5) {
      const card = r() < 0.5
      add({ type: 'expense', amount: pesos(Math.round(rand(340, 760)) + 0.5), date: d, categoryId: 'cat-super', note: pick(['Súper', 'Walmart', 'Mercado', undefined]), accountId: card ? 'sample-tdc' : 'sample-debito', method: card ? 'credit' : 'debit' })
    }
    if (r() < 0.1) add({ type: 'expense', amount: pesos(Math.round(rand(150, 560))), date: d, categoryId: 'cat-ocio', note: pick(ocio), ...payWith() })
    if (dow < 5 && r() < 0.07) add({ type: 'expense', amount: pesos(Math.round(rand(35, 340))), date: d, categoryId: 'cat-escuela', note: pick(escuela), ...payWith() })
    if (r() < 0.035) add({ type: 'expense', amount: pesos(Math.round(rand(120, 580))), date: d, categoryId: 'cat-salud', note: pick(salud), ...payWith() })
    if (r() < 0.02) add({ type: 'expense', amount: pesos(Math.round(rand(320, 890))), date: d, categoryId: 'cat-ropa', accountId: 'sample-tdc', method: 'credit' })

    // Retiros en cajero, ahorro y pago de tarjeta
    if (day === 2 || day === 16) add({ type: 'transfer', amount: pesos(1200), date: d, accountId: 'sample-debito', toAccountId: 'acc-efectivo', note: 'Retiro en cajero' })
    if (day === 11) add({ type: 'transfer', amount: pesos(1000), date: d, accountId: 'sample-debito', toAccountId: 'sample-ahorro', note: 'Ahorro del mes' })
    if (day === 21) add({ type: 'transfer', amount: pesos(2600), date: d, accountId: 'sample-debito', toAccountId: 'sample-tdc', note: 'Pago de tarjeta' })
  }
  add({ type: 'income', amount: pesos(1500), date: addDays(start, 40), categoryId: 'cat-extras', accountId: 'sample-debito', note: 'Diseño de logo' })
  add({ type: 'income', amount: pesos(500), date: addDays(start, 75), categoryId: 'cat-regalos-ingreso', accountId: 'acc-efectivo', note: 'Cumpleaños' })

  const budgets: Budget[] = (
    [
      ['total', 12000],
      ['cat-comida', 2800],
      ['cat-transporte', 1300],
      ['cat-super', 2200],
      ['cat-ocio', 900],
      ['cat-suscripciones', 400],
      ['cat-escuela', 500],
    ] as const
  ).map(([categoryId, amount]) => ({ id: `${categoryId}:${startMonth}`, categoryId, amount: pesos(amount), fromMonth: startMonth, sample: true }))

  const goals: Goal[] = [
    { id: 'sample-goal-laptop', name: 'Laptop nueva', target: pesos(18000), deadline: addMonthsToDate(today, 6), icon: 'laptop', color: '#3B5BFF', archived: false, createdAt: now, sample: true },
    { id: 'sample-goal-viaje', name: 'Viaje a Oaxaca', target: pesos(7500), deadline: `${today.slice(0, 4)}-12-15`, icon: 'plane', color: '#F5A524', archived: false, createdAt: now, sample: true },
    { id: 'sample-goal-emergencia', name: 'Fondo de emergencia', target: pesos(15000), icon: 'piggy-bank', color: '#10B981', archived: false, createdAt: now, sample: true },
  ]
  const contributions: GoalContribution[] = []
  const contribute = (goalId: string, amount: number, date: ISODate) =>
    contributions.push({ id: `sample-gc-${contributions.length}`, goalId, amount: pesos(amount), date, createdAt: now, sample: true })
  for (let m = 0; m <= 4; m++) {
    const date = `${addMonths(startMonth, m)}-11`
    if (date > today) break
    contribute('sample-goal-laptop', 1500, date)
    contribute('sample-goal-viaje', m % 2 ? 1400 : 900, date)
  }
  contribute('sample-goal-emergencia', 2000, addDays(start, 12))
  contribute('sample-goal-emergencia', 1000, addDays(start, 70))

  await db.transaction('rw', [db.accounts, db.transactions, db.recurring, db.budgets, db.goals, db.goalContributions], async () => {
    await db.accounts.bulkPut(accounts)
    await db.transactions.bulkPut(txs)
    await db.recurring.bulkPut(recurring)
    await db.budgets.bulkPut(budgets)
    await db.goals.bulkPut(goals)
    await db.goalContributions.bulkPut(contributions)
  })
}

/** Borra solo los datos de ejemplo. Si usaste una cuenta de ejemplo con movimientos reales, la conserva. */
export async function removeSampleData(): Promise<void> {
  await db.transaction('rw', [db.accounts, db.transactions, db.recurring, db.budgets, db.goals, db.goalContributions], async () => {
    await db.transactions.filter((t) => !!t.sample).delete()
    await db.recurring.filter((x) => !!x.sample).delete()
    await db.budgets.filter((x) => !!x.sample).delete()
    await db.goalContributions.filter((x) => !!x.sample).delete()
    // Metas de ejemplo: se conservan si les abonaste algo real
    for (const g of await db.goals.filter((x) => !!x.sample).toArray()) {
      const real = await db.goalContributions.where('goalId').equals(g.id).count()
      if (real > 0) await db.goals.update(g.id, { sample: false })
      else await db.goals.delete(g.id)
    }
    for (const a of await db.accounts.filter((x) => !!x.sample).toArray()) {
      const used = (await db.transactions.where('accountId').equals(a.id).count()) + (await db.transactions.where('toAccountId').equals(a.id).count())
      if (used > 0) await db.accounts.update(a.id, { sample: false })
      else await db.accounts.delete(a.id)
    }
  })
}
