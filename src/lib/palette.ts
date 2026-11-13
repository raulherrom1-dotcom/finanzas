// Colores de gráficas por categoría, en el orden pedido. El último (gris) se usa para "Otros".
export const CHART_COLORS = ['#3B5BFF', '#10B981', '#8B5CF6', '#F5A524', '#06B6D4', '#F2545B', '#6C8CFF', '#94A3B8'] as const

export const COLORS = {
  accent: '#8C7BFF',
  accentPress: '#B9AFFF',
  accentSoft: '#231F52',
  accentLight: '#8C7BFF',
  ink: '#F3F5FF',
  muted: '#9BA5C9',
  line: '#262F55',
  surface: '#121833',
  pos: '#34D399',
  posSoft: '#0C2B27',
  warn: '#FBBF24',
  warnSoft: '#2E2410',
  neg: '#FB7185',
  negSoft: '#35141F',
} as const

/** Fondo suave de un color de categoría (para el círculo del ícono), transparente sobre el tema oscuro. */
export function softBg(color: string, strength = 14): string {
  return `color-mix(in srgb, ${color} ${strength + 8}%, transparent)`
}

/** Versión clara del color para el ícono: sobre fondo oscuro mide ≥4.6:1 con toda la paleta. */
export function iconInk(color: string): string {
  return `color-mix(in srgb, ${color} 72%, white)`
}
