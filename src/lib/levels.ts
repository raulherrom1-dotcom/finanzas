export type Level = 'ok' | 'warn' | 'over'

/** Nivel de un presupuesto: normal, cerca del límite (80%) o excedido. */
export function levelFor(pct: number): Level {
  if (pct > 100) return 'over'
  if (pct >= 80) return 'warn'
  return 'ok'
}
