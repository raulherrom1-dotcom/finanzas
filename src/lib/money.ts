// Todos los montos se manejan como enteros en centavos. Nunca se hace aritmética con decimales.

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const mxnNoCents = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const grouped = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })

/** 123450 → "$1,234.50" */
export function formatMXN(cents: number, opts: { sign?: boolean; noCents?: boolean } = {}): string {
  const abs = Math.abs(cents)
  const body = opts.noCents ? mxnNoCents.format(Math.round(abs / 100)) : mxn.format(abs / 100)
  if (cents < 0) return `−${body}`
  if (opts.sign && cents > 0) return `+${body}`
  return body
}

/** Partes para mostrar los centavos más pequeños: { sign, whole: "$1,234", cents: ".50" } */
export function splitMXN(cents: number, opts: { sign?: boolean } = {}) {
  const abs = Math.abs(cents)
  const whole = Math.floor(abs / 100)
  const rest = abs % 100
  const sign = cents < 0 ? '−' : opts.sign && cents > 0 ? '+' : ''
  return { sign, whole: `$${grouped.format(whole)}`, cents: `.${String(rest).padStart(2, '0')}` }
}

/** Formato compacto para espacios chicos: $12.3 mil, $1.2 M */
export function formatCompact(cents: number): string {
  const pesos = Math.abs(cents) / 100
  const sign = cents < 0 ? '−' : ''
  if (pesos >= 1_000_000) return `${sign}$${trim(pesos / 1_000_000)} M`
  if (pesos >= 10_000) return `${sign}$${trim(pesos / 1000)} mil`
  return `${sign}${mxnNoCents.format(pesos)}`
}

function trim(n: number) {
  return n.toFixed(1).replace(/\.0$/, '')
}

/**
 * Convierte texto a centavos sin pasar por flotantes.
 * Acepta "1,234.50", "$1234.5", "1234", "-250.00", "(250.00)". Devuelve null si no es un número.
 */
export function parseAmount(input: string): number | null {
  let s = input.trim().replace(/\s/g, '').replace(/[$€]|MXN|MN/gi, '')
  if (!s) return null
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  if (s.startsWith('-') || s.startsWith('−')) {
    negative = !negative
    s = s.slice(1)
  }
  if (s.endsWith('-')) {
    negative = !negative
    s = s.slice(0, -1)
  }
  // Formato con coma decimal (ej. "1.234,50" o "250,5"): se detecta si la coma va al final con 1-2 dígitos.
  if (/^\d{1,3}(\.\d{3})*,\d{1,2}$/.test(s) || /^\d+,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else {
    s = s.replace(/,/g, '')
  }
  const m = /^(\d*)(?:\.(\d*))?$/.exec(s)
  if (!m || (m[1] === '' && (m[2] ?? '') === '')) return null
  const whole = m[1] === '' ? 0 : Number(m[1])
  const dec = (m[2] ?? '').padEnd(3, '0')
  let cents = whole * 100 + Number(dec.slice(0, 2))
  if (Number(dec[2]) >= 5) cents += 1
  if (!Number.isSafeInteger(cents)) return null
  return negative ? -cents : cents
}

/** 123450 → "1234.50" (para llenar un input) */
export function centsToInput(cents: number): string {
  const abs = Math.abs(cents)
  const s = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
  return cents < 0 ? `-${s}` : s
}

export const MAX_WHOLE_DIGITS = 9

/** Lógica del teclado del registro rápido. `value` es texto como "1234.5". */
export function pressKey(value: string, key: string): string {
  if (key === 'back') return value.slice(0, -1)
  if (key === 'clear') return ''
  if (key === '.') {
    if (value.includes('.')) return value
    return value === '' ? '0.' : value + '.'
  }
  if (!/^\d$/.test(key)) return value
  const [whole, dec] = value.split('.')
  if (dec !== undefined) {
    if (dec.length >= 2) return value
    return value + key
  }
  if (whole === '0') return key
  if (whole.length >= MAX_WHOLE_DIGITS) return value
  return value + key
}

/** "1234.5" → 123450 */
export function keypadToCents(value: string): number {
  return parseAmount(value) ?? 0
}

/** Muestra el texto del teclado con separador de miles: "1234.5" → "1,234.5" */
export function formatKeypad(value: string): string {
  if (value === '') return '0'
  const [whole, dec] = value.split('.')
  const w = grouped.format(Number(whole || '0'))
  return dec === undefined ? w : `${w}.${dec}`
}

export function percent(part: number, total: number): number {
  if (total <= 0) return 0
  return (part / total) * 100
}
