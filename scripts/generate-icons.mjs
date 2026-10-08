// Genera los íconos de la app a partir de scripts/icon.svg.
// Uso: npm run icons
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const svg = await readFile(new URL('./icon.svg', import.meta.url))
const out = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url))

const sizes = [
  ['apple-touch-icon-180x180.png', 180],
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['maskable-icon-512x512.png', 512],
]

for (const [name, size] of sizes) {
  // Sin transparencia: iOS pone fondo negro a los PNG con alfa.
  await sharp(svg, { density: 384 }).resize(size, size).flatten({ background: '#3B5BFF' }).png().toFile(out(name))
}

// Favicon con esquinas redondeadas para pestañas del navegador.
const favicon = svg
  .toString()
  .replace('<rect width="512" height="512"', '<rect width="512" height="512" rx="112"')
await writeFile(out('favicon.svg'), favicon)

console.log('Íconos generados en public/')
