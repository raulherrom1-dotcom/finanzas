/** Minúsculas y sin acentos, para buscar "cafe" y encontrar "Café". */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}
