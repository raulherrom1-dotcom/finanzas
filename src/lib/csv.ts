import Papa from 'papaparse'
import type { Account, Category, Transaction } from '../db/types'
import { isValidISODate, makeISO, type ISODate } from './dates'
import { centsToInput, parseAmount } from './money'
import { normalize } from './search'

// ---------- Lectura del archivo ----------

/** Los bancos mexicanos a veces exportan en Windows-1252 (acentos rotos si se lee como UTF-8). */
export function decodeBytes(buf: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '')
  } catch {
    return new TextDecoder('windows-1252').decode(buf)
  }
}

export function parseCsv(text: string): string[][] {
  const res = Papa.parse<string[]>(text.trim(), { skipEmptyLines: 'greedy' })
  return res.data.map((r) => r.map((c) => (c ?? '').trim()))
}

// ---------- Fechas ----------

export type DateFormat = 'dmy' | 'mdy' | 'ymd'

const MONTHS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8,
  sep: 9, sept: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12,
}

function year(y: string): number {
  const n = Number(y)
  return y.length <= 2 ? 2000 + n : n
}

/** Convierte una fecha del banco a "AAAA-MM-DD". Acepta 05/10/2026, 2026-10-05, 05-OCT-26, 5 oct 2026… */
export function parseBankDate(value: string, fmt: DateFormat): ISODate | null {
  const v = normalize(value).replace(/[T\s]\d{1,2}:\d{2}.*$/, '').trim()
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(v)
  if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]))
  m = /^(\d{1,2})[-/.\s]([a-z]{3,4})\.?[-/.\s](\d{2,4})$/.exec(v)
  if (m) return MONTHS[m[2]] ? valid(year(m[3]), MONTHS[m[2]], Number(m[1])) : null
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(v)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    return fmt === 'mdy' ? valid(year(m[3]), a, b) : valid(year(m[3]), b, a)
  }
  return null
}

function valid(y: number, mo: number, d: number): ISODate | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const iso = makeISO(y, mo, d)
  return isValidISODate(iso) ? iso : null
}

/** Adivina si las fechas vienen día/mes o mes/día. En México lo normal es día/mes. */
export function detectDateFormat(values: string[]): DateFormat {
  let dmyOk = 0
  let mdyOk = 0
  for (const v of values) {
    if (parseBankDate(v, 'dmy')) dmyOk++
    if (parseBankDate(v, 'mdy')) mdyOk++
  }
  return mdyOk > dmyOk ? 'mdy' : 'dmy'
}

// ---------- Mapeo de columnas ----------

export interface CsvMapping {
  hasHeader: boolean
  dateCol: number
  descCol: number
  amountMode: 'single' | 'split'
  amountCol: number
  /** Solo columna única: cómo aparecen los gastos */
  expensesAre: 'negative' | 'positive'
  debitCol: number
  creditCol: number
  dateFormat: DateFormat
}

const has = (h: string, words: string[]) => words.some((w) => h.includes(w))

/** Propone un mapeo leyendo los encabezados (Fecha, Concepto, Cargo, Abono, Importe…). */
export function guessMapping(rows: string[][]): CsvMapping {
  const first = rows[0] ?? []
  const headers = first.map(normalize)
  const looksHeader = first.length > 0 && first.every((c) => parseAmount(c) === null || c === '') && first.some((c) => /[a-z]/i.test(c))
  const find = (words: string[]) => headers.findIndex((h) => has(h, words))

  let dateCol = looksHeader ? find(['fecha', 'date', 'dia']) : -1
  const descCol = looksHeader ? find(['descripcion', 'concepto', 'detalle', 'description', 'movimiento', 'referencia', 'establecimiento', 'comercio']) : -1
  const debitCol = looksHeader ? find(['cargo', 'retiro', 'debito', 'debit', 'withdrawal', 'egreso']) : -1
  const creditCol = looksHeader ? find(['abono', 'deposito', 'credito', 'credit', 'deposit', 'ingreso']) : -1
  let amountCol = looksHeader ? find(['monto', 'importe', 'amount', 'cantidad', 'valor']) : -1

  const data = looksHeader ? rows.slice(1) : rows
  const sample = data.slice(0, 30)
  const cols = Math.max(0, ...rows.map((r) => r.length))
  // Sin encabezados: la primera columna que parece fecha y la que parece monto
  if (dateCol < 0) dateCol = Math.max(0, [...Array(cols).keys()].find((c) => sample.filter((r) => parseBankDate(r[c] ?? '', 'dmy')).length > sample.length / 2) ?? 0)
  const numeric = (c: number) => sample.filter((r) => parseAmount(r[c] ?? '') !== null).length > sample.length / 2
  if (amountCol < 0 && debitCol < 0) amountCol = [...Array(cols).keys()].reverse().find((c) => c !== dateCol && numeric(c)) ?? -1
  const fallbackDesc = [...Array(cols).keys()].find((c) => c !== dateCol && !numeric(c)) ?? (dateCol === 0 ? 1 : 0)

  const split = debitCol >= 0 && creditCol >= 0
  const amounts = sample.map((r) => parseAmount(r[amountCol] ?? '') ?? 0)
  const negatives = amounts.filter((a) => a < 0).length
  return {
    hasHeader: looksHeader,
    dateCol,
    descCol: descCol >= 0 ? descCol : fallbackDesc,
    amountMode: split ? 'split' : 'single',
    amountCol: amountCol >= 0 ? amountCol : Math.max(0, debitCol),
    // Si casi no hay negativos, probablemente los gastos vienen en positivo (estado de cuenta de tarjeta)
    expensesAre: negatives === 0 && amounts.length > 0 ? 'positive' : 'negative',
    debitCol: Math.max(0, debitCol),
    creditCol: Math.max(0, creditCol),
    dateFormat: detectDateFormat(sample.map((r) => r[dateCol] ?? '')),
  }
}

export interface ImportRow {
  index: number
  date: ISODate | null
  description: string
  amount: number
  type: 'expense' | 'income'
  error?: string
}

export function buildRows(rows: string[][], m: CsvMapping): ImportRow[] {
  const data = m.hasHeader ? rows.slice(1) : rows
  return data.map((r, index) => {
    const date = parseBankDate(r[m.dateCol] ?? '', m.dateFormat)
    const description = (r[m.descCol] ?? '').replace(/\s+/g, ' ').trim()
    let amount = 0
    let type: ImportRow['type'] = 'expense'
    if (m.amountMode === 'split') {
      const debit = Math.abs(parseAmount(r[m.debitCol] ?? '') ?? 0)
      const credit = Math.abs(parseAmount(r[m.creditCol] ?? '') ?? 0)
      if (debit > 0) amount = debit
      else {
        amount = credit
        type = 'income'
      }
    } else {
      const v = parseAmount(r[m.amountCol] ?? '') ?? 0
      amount = Math.abs(v)
      const negative = v < 0
      type = (m.expensesAre === 'negative') === negative ? 'expense' : 'income'
    }
    let error: string | undefined
    if (!date) error = 'Fecha no válida'
    else if (amount === 0) error = 'Sin monto'
    return { index, date, description, amount, type, error }
  })
}

// ---------- Duplicados ----------

function fnv(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/**
 * Huella de cada fila: fecha + monto + tipo + descripción + cuenta + número de repetición.
 * Volver a importar el mismo archivo (o uno que se encime) da las mismas huellas.
 */
export function importHashes(rows: ImportRow[], accountId: string | undefined): string[] {
  const seen = new Map<string, number>()
  return rows.map((r) => {
    const base = `${r.date}|${r.amount}|${r.type}|${normalize(r.description)}|${accountId ?? ''}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return `csv:${fnv(base)}:${n}`
  })
}

/** Movimientos ya registrados a mano con la misma fecha, monto y tipo (posibles duplicados). */
export function possibleDuplicates(rows: ImportRow[], existing: Transaction[]): Set<number> {
  const keys = new Map<string, number>()
  for (const t of existing) if (!t.importHash && t.type !== 'transfer') {
    const k = `${t.date}|${t.amount}|${t.type}`
    keys.set(k, (keys.get(k) ?? 0) + 1)
  }
  const out = new Set<number>()
  for (const r of rows) {
    const k = `${r.date}|${r.amount}|${r.type}`
    const left = keys.get(k) ?? 0
    if (left > 0) {
      out.add(r.index)
      keys.set(k, left - 1)
    }
  }
  return out
}

// ---------- Categoría sugerida ----------

const RULES: Array<[string, string[]]> = [
  ['cat-comida', ['uber eats', 'ubereats', 'didi food', 'rappi', 'starbucks', 'restaurante', 'taqueria', 'tacos', 'pizza', 'burger', 'mcdonald', 'kfc', 'domino', 'little caesar', 'vips', 'sanborns', 'cafe', 'comida']],
  ['cat-super', ['walmart', 'soriana', 'chedraui', 'aurrera', 'la comer', 'costco', 'sams', 'heb', 'superama', 'city market', 'fresko', 'super ']],
  ['cat-transporte', ['uber', 'didi', 'cabify', 'metro', 'gasolin', 'pemex', 'caseta', 'peaje', 'estacionamiento', 'parking', 'ado ']],
  ['cat-suscripciones', ['netflix', 'spotify', 'disney', 'hbo', 'prime video', 'amazon prime', 'apple.com', 'icloud', 'youtube', 'xbox', 'playstation', 'crunchyroll', 'openai', 'chatgpt']],
  ['cat-gym', ['smart fit', 'smartfit', 'sport city', 'gimnasio', 'gym', 'fitness']],
  ['cat-salud', ['farmacia', 'similares', 'benavides', 'del ahorro', 'san pablo', 'hospital', 'medic', 'laboratorio', 'chopo', 'dentista']],
  ['cat-servicios', ['cfe', 'telmex', 'izzi', 'totalplay', 'megacable', 'naturgy', 'agua ']],
  ['cat-celular', ['telcel', 'at&t', 'movistar', 'bait ']],
  ['cat-ropa', ['zara', 'h&m', 'pull&bear', 'bershka', 'liverpool', 'palacio de hierro', 'c&a', 'shein']],
  ['cat-escuela', ['colegiatura', 'universidad', 'libreria', 'gandhi', 'papeleria', 'office depot']],
  ['cat-ocio', ['cinepolis', 'cinemex', 'ticketmaster', 'steam', 'eticket']],
  ['cat-sueldo', ['nomina', 'sueldo', 'salario']],
  ['cat-beca', ['beca']],
  ['cat-reembolsos', ['reembolso', 'devolucion', 'bonificacion']],
]

/**
 * Categoría sugerida: primero lo que ya usaste para esa misma descripción;
 * luego palabras clave (Uber → Transporte, Netflix → Suscripciones…); si no, "Otros".
 */
export function suggestCategory(description: string, type: 'expense' | 'income', categories: Category[], history: Map<string, string>): string | undefined {
  const active = new Map(categories.filter((c) => !c.archived && c.kind === type).map((c) => [c.id, c]))
  const d = normalize(description)
  const prev = history.get(`${type}|${d}`)
  if (prev && active.has(prev)) return prev
  for (const [id, words] of RULES) if (active.has(id) && words.some((w) => `${d} `.includes(w))) return id
  const fallback = type === 'expense' ? 'cat-otros-gasto' : 'cat-otros-ingreso'
  if (active.has(fallback)) return fallback
  return [...active.values()].sort((a, b) => a.order - b.order)[0]?.id
}

/** Descripción → categoría usada antes, para aprender de tus correcciones. */
export function categoryHistory(txs: Transaction[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const t of [...txs].sort((a, b) => a.updatedAt - b.updatedAt)) if (t.note && t.categoryId && t.type !== 'transfer') m.set(`${t.type}|${normalize(t.note)}`, t.categoryId)
  return m
}

// ---------- Exportar ----------

const TYPE_ES = { expense: 'Gasto', income: 'Ingreso', transfer: 'Transferencia' } as const

/** CSV de movimientos (con BOM para que Excel respete los acentos). Gastos en negativo. */
export function transactionsToCsv(txs: Transaction[], cats: Map<string, Category>, accs: Map<string, Account>): string {
  const rows = [...txs]
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))
    .map((t) => ({
      Fecha: t.date,
      Tipo: TYPE_ES[t.type],
      Monto: centsToInput(t.type === 'expense' ? -t.amount : t.amount),
      Categoría: t.categoryId ? (cats.get(t.categoryId)?.name ?? '') : '',
      Cuenta: t.accountId ? (accs.get(t.accountId)?.name ?? '') : '',
      'Cuenta destino': t.toAccountId ? (accs.get(t.toAccountId)?.name ?? '') : '',
      Nota: t.note ?? '',
    }))
  return '﻿' + Papa.unparse(rows, { newline: '\r\n' })
}
