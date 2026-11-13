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
- Tema claro fijo, sin modo oscuro. Solo la paleta de src/index.css: fondo #FFFFFF, superficies #F4F7FE con borde #E3EAF8, texto #0F1B3D / #6B7894, acento cobalto #3B5BFF (presionado #2B47D6, suave #E6ECFF), info #E8F0FE/#1F3A8A, esmeralda #10B981, ámbar #F5A524, coral #F2545B.
- Verde, ámbar y coral NO se usan como texto (no pasan contraste). Para texto: pos-ink #047857, warn-ink #9A5B00, neg-ink #C42F37; los colores puros van en barras, íconos y fondos.
- Gráficas por categoría con #3B5BFF, #10B981, #8B5CF6, #F5A524, #06B6D4, #F2545B, #6C8CFF y #94A3B8 (gris = "Otros", siempre al final). El color sigue a la categoría, no a su lugar en el mes.
- Tipografía Plus Jakarta Sans. Montos en negritas con los centavos más chicos (componente Amount). Cifras tabulares en listas y proporcionales en montos grandes y solos.
- Tarjetas redondeadas de 20–24px con sombra azulada suave. Botones tipo píldora. La tarjeta de balance tiene un degradado a 60° con la parte clara arriba a la derecha, para que el texto blanco mida ≥4.7:1.
- Áreas táctiles de al menos 44×44px. iPhone: viewport-fit=cover, safe-area con env(), status-bar-style "default", sin rebote en el contenedor principal.
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
