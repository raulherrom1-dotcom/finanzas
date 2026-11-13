# Finanzas — contexto para Claude

PWA personal de finanzas que Raúl usa en su iPhone (instalada desde Safari). Lee también README.md.

## Cómo trabajar con Raúl
- Raúl es practicante (le pagan mensual el día 10). Háblale en español, sencillo.
- Antes de cambios grandes: plan breve y esperar su confirmación. Si se trabaja por fases, avisar al terminar cada una y seguir con la siguiente sin esperar.
- Un commit por fase o cambio terminado, en la rama main. Raúl hace el push: nunca subir nada sin que lo pida.

## Producto
- Toda la interfaz en español; moneda MXN con formato $1,234.50.
- Sin login ni servidor: todo vive en el celular (IndexedDB). Funciona 100% sin internet.
- Privacidad: el repo NUNCA debe contener datos de Raúl. Respaldos (finanzas-*.json) y CSV están en .gitignore. Los datos de ejemplo son ficticios y van marcados con `sample: true`.
- Publicación: GitHub Pages con GitHub Actions (.github/workflows/deploy.yml, corre `npm test` y luego `npm run build`). Repo: github.com/raulherrom1-dotcom/finanzas. Vite toma la ruta base de BASE_PATH, que el workflow calcula del nombre del repo.

## Stack
React 19 + Vite 8 + TypeScript 7, Tailwind CSS v4 (tokens en src/index.css con @theme), Dexie 4 + dexie-react-hooks, vite-plugin-pwa 2, Recharts 3 (pantalla Análisis cargada con lazy), lucide-react, @fontsource-variable/plus-jakarta-sans, papaparse, Vitest + fake-indexeddb. Router propio por hash (src/lib/router.ts). Sin librerías de animación (solo CSS).

## Reglas técnicas (no romper)
- Montos SIEMPRE en centavos enteros (src/lib/money.ts). Nunca aritmética con decimales.
- Fechas como texto 'AAAA-MM-DD' y meses 'AAAA-MM', en hora America/Mexico_City (src/lib/dates.ts). La semana empieza en lunes.
- Recurrentes: semanal, quincenal (= días 15 y último del mes) y mensual (mismo día; si no existe, el último). Se generan al abrir la app y al volver a ella, y se ponen al corriente sin duplicar (id fijo `rec:<id>:<fecha>`, src/db/recurring.ts).
- "Ahorro del mes" = abonos a metas + transferencias netas hacia cuentas de ahorro.
- Tarjetas de crédito: pago para no generar intereses = deuda al último corte − pagos posteriores. Aviso en ámbar a 5 días de la fecha límite y en coral si ya venció.
- Importar CSV: huella por fila (importHash) para no duplicar; los posibles duplicados de registros manuales quedan desmarcados.
- El registro rápido usa un teclado propio (no el del iPhone) y guarda borrador en cada tecla. Los demás inputs de monto usan inputmode="decimal" y ≥16px de letra.
- Periodo de presupuesto (PayCycle en src/lib/budget.ts, ajuste 'payCycle', por perfil): va de un pago a un día antes del siguiente. Frecuencia mensual (día `payDay`), quincenal (15 y último, como Recurrentes) o semanal (`weekday`, 0 = lunes). Clave del periodo: 'AAAA-MM' en mensual y la fecha de pago normal 'AAAA-MM-DD' en las otras; se ordenan como fechas, así que `Budget.fromMonth` guarda cualquiera de las dos. `starts` mueve el inicio de un periodo concreto. Los límites son por periodo. Presupuesto e Inicio usan periodos; Movimientos y Análisis usan meses de calendario. Sin configurar = mes de calendario. Navegar periodos con `shiftPeriod`, nunca con `addMonths`.
- Perfiles (src/lib/profiles.ts): cada perfil tiene su propia base de datos ('finanzas' para el principal, 'finanzas-<id>' para los demás); la lista y el perfil activo viven en localStorage. Cambiar de perfil recarga la app. Lo que en localStorage dependa de los datos de un perfil usa `profileKey()`.

## Diseño (respetarlo)
- Tema "Medianoche aurora" (desde el rediseño de nov 2026; la versión clara anterior está en la etiqueta git `antes-rediseno`). Oscuro fijo, sin modo claro. Solo la paleta de src/index.css: fondo #080C1D con resplandores violeta/cian/rosa fijos en `body`, superficies #121833, hojas #161D3B, bordes #262F55, texto #F3F5FF / #9BA5C9, acento violeta #6D52FF (rellenos con texto blanco), `accent-press` #B9AFFF (texto de acento, el nombre es histórico), `accent-light` #8C7BFF (íconos), suave #231F52, info #13223F/#A9C7FF, menta #34D399, ámbar #FBBF24, rosa #FB7185.
- Para texto de estado usar pos-ink #6EE7B7, warn-ink #FCD34D, neg-ink #FDA4AF; los colores puros van en barras, íconos y fondos. Medir contraste (≥4.5:1 texto, ≥3:1 íconos) antes de agregar una combinación nueva; las medidas están en el comentario de src/index.css.
- Nunca usar `bg-ink` ni `bg-white` como fondo con texto: en este tema ink es casi blanco. Lo que flota (barra inferior, toasts, tooltips) usa la clase `.glass`; las tarjetas `.card` (vidrio sin desenfoque, por rendimiento); el botón principal `.btn-primary` (degradado violeta con brillo).
- Gráficas por categoría con #3B5BFF, #10B981, #8B5CF6, #F5A524, #06B6D4, #F2545B, #6C8CFF y #94A3B8 (gris = "Otros", siempre al final). El color sigue a la categoría, no a su lugar en el mes. Los círculos de ícono usan `softBg`/`iconInk` de src/lib/palette.ts.
- Tipografía: Plus Jakarta Sans para texto y listas (cifras tabulares); Outfit para títulos h1/h2 y montos grandes y solos (`Amount proportional` → `.num-prop`). Los pesos de h1/h2 y `.num-prop` se fijan en CSS fuera de capas (Outfit en 800 se empasta). Centavos más chicos con el componente Amount.
- Tarjetas redondeadas de 22–28px. Botones tipo píldora. La tarjeta de balance es una aurora (degradado violeta-azul con manchas rosa y cian animadas); el texto blanco mide ≥4.6:1 en la zona más clara. Barras y anillos de progreso con degradado violeta→cian y brillo.
- Barra inferior: cápsula de vidrio flotante; el contenido pasa por debajo (`pb-nav` en App.tsx).
- Áreas táctiles de al menos 44×44px. iPhone: viewport-fit=cover, safe-area con env(), status-bar-style "black-translucent", sin rebote en el contenedor principal.
- El modo privacidad (el ojo en Inicio) oculta todos los montos: usar Amount/useMoney, nunca formatMXN directo en pantalla.
- Animaciones sutiles y rápidas, desactivadas con "Reducir movimiento".

## Estructura
src/db (Dexie, defaults, sample, recurring, goals, actions, queries), src/lib (lógica pura con pruebas: money, dates, balances, budget, recurrence, analysis, csv, backup, filters, profiles), src/components (ui/ y piezas compartidas), src/features (quick-add, backup), src/screens (Inicio, Movimientos, Presupuesto, Análisis y ajustes/*). Reutilizar lo que ya existe antes de crear algo nuevo.

## Comandos
`npm run dev` (http://localhost:5173), `npm test`, `npx tsc -b`, `npm run build`, `npm run preview`, `npm run icons`. Revisar cada cambio visual en un viewport de iPhone de 390×844.

**Ojo en Windows:** las pruebas fallan todas con `Cannot read properties of undefined (reading 'config')` si la terminal está en `d:\Finanzas` (unidad en minúscula, como la abre VS Code): vitest se carga dos veces. Correrlas desde `D:\Finanzas` (en PowerShell: `Set-Location 'D:\Finanzas'; npx vitest run`). En GitHub Actions no pasa.

## Estado
- Fases 1–7 hechas y subidas (último commit subido: "Fase 7: respaldo, CSV y publicación").
- Después: periodos de presupuesto según día de pago y perfiles en el mismo celular (ver Reglas técnicas). Revisar `git log` para saber si ya tienen commit.
