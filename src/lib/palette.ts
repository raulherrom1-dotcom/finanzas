// Colores de gráficas por categoría, en el orden pedido. El último (gris) se usa para "Otros".
export const CHART_COLORS = ['#3B5BFF', '#10B981', '#8B5CF6', '#F5A524', '#06B6D4', '#F2545B', '#6C8CFF', '#94A3B8'] as const

export const COLORS = {
  accent: '#3B5BFF',
  accentPress: '#2B47D6',
  accentSoft: '#E6ECFF',
  accentLight: '#6C8CFF',
  ink: '#0F1B3D',
  muted: '#6B7894',
  line: '#E3EAF8',
  surface: '#F4F7FE',
  pos: '#10B981',
  posSoft: '#E3F8F0',
  warn: '#F5A524',
  warnSoft: '#FEF3DC',
  neg: '#F2545B',
  negSoft: '#FEECEC',
} as const

/** Fondo suave de un color de categoría (para el círculo del ícono). */
export function softBg(color: string, strength = 14): string {
  return `color-mix(in srgb, ${color} ${strength}%, white)`
}

/**
 * Color legible para texto/ícono sobre su fondo suave. Algunos colores de la paleta
 * (ámbar, cian, verde) son muy claros para ícono pequeño, así que se oscurecen un poco.
 */
export function iconInk(color: string): string {
  return `color-mix(in srgb, ${color} 82%, #0F1B3D)`
}
