# Finanzas

App personal para llevar el control de gastos, ingresos, presupuestos, recurrentes y metas de ahorro.
Funciona en el iPhone como app instalada desde Safari, **sin internet y sin servidor**.

> **Tus datos viven solo en tu celular** (IndexedDB del navegador). Este repositorio contiene únicamente
> el código de la app; no tiene ni debe tener ningún dato tuyo. Los respaldos (`finanzas-*.json`) y los
> CSV están excluidos en `.gitignore` para que nunca se suban por accidente.

Hecha con React, Vite, TypeScript, Tailwind CSS, Dexie (IndexedDB), vite-plugin-pwa, Recharts y lucide-react.

---

## 1. Probarla en tu computadora

Necesitas [Node.js](https://nodejs.org) 22 o más nuevo (ya lo tienes instalado).

1. Abre una terminal en la carpeta del proyecto (`C:\Raul Herrera\Finanzas`).
2. La primera vez instala las dependencias:
   ```bash
   npm install
   ```
3. Arranca la app:
   ```bash
   npm run dev
   ```
4. Abre en el navegador la dirección que aparece, normalmente **http://localhost:5173**.
   Para verla como en el iPhone: abre las herramientas de desarrollador (F12) y activa la vista de celular.
5. Para cargar datos de prueba: **Ajustes (engrane en Inicio) → Respaldo y datos → Cargar datos de ejemplo**.
   Se borran con el mismo botón sin tocar lo que registres tú.

**Verla en tu iPhone sin publicarla (opcional):** con la computadora y el iPhone en la misma red Wi‑Fi,
`npm run dev` también muestra una dirección tipo `http://192.168.x.x:5173`. Ábrela en Safari del iPhone
(si Windows pregunta, permite el acceso a Node en redes privadas). Sirve para ver cómo se ve, pero para
instalarla y usarla sin internet hay que publicarla (paso 2), porque eso requiere HTTPS.

Otros comandos útiles:

| Comando | Para qué sirve |
|---|---|
| `npm test` | Corre las pruebas (dinero en centavos, fechas, recurrentes, CSV, respaldos…) |
| `npm run build` | Genera la versión final en la carpeta `dist` |
| `npm run preview` | Sirve esa versión final en http://localhost:4173 para probarla |
| `npm run icons` | Regenera los íconos a partir de `scripts/icon.svg` |

## 2. Subirla a GitHub

1. Crea una cuenta en [github.com](https://github.com) si no tienes.
2. Crea un repositorio nuevo: botón **New**, nombre `finanzas`, **sin** README ni .gitignore (ya existen aquí).
   - En una cuenta gratuita, GitHub Pages solo funciona con repositorios **públicos**: el código será visible,
     pero tus datos no, porque nunca salen de tu celular. Con GitHub Pro puedes usar un repositorio privado.
3. **Antes de subir nada**, en el repositorio ve a **Settings → Pages** y en **Build and deployment → Source**
   elige **GitHub Actions**.
4. En la terminal, dentro de la carpeta del proyecto, conecta tu repositorio y súbelo
   (cambia `TU-USUARIO` por tu usuario de GitHub):
   ```bash
   git remote add origin https://github.com/TU-USUARIO/finanzas.git
   ```
   ```bash
   git push -u origin main
   ```
   La primera vez se abrirá el navegador para que inicies sesión en GitHub.

## 3. Publicarla

Al subir los cambios, GitHub Actions compila y publica la app sola (archivo `.github/workflows/deploy.yml`).

1. En tu repositorio abre la pestaña **Actions** y espera a que "Publicar en GitHub Pages" termine con ✓ verde (1–2 minutos).
   - Si falló porque Pages no estaba activado, haz el paso 2.3 y luego en Actions toca **Re-run all jobs**.
2. Tu app queda en: **https://TU-USUARIO.github.io/finanzas/**

Cada vez que hagas `git push` con cambios, se vuelve a publicar. La app instalada te mostrará
"Hay una versión nueva de la app" con un botón **Actualizar**.

## 4. Instalarla en tu iPhone

1. Abre **Safari** (tiene que ser Safari) y entra a `https://TU-USUARIO.github.io/finanzas/`.
2. Toca el botón **Compartir** (el cuadro con la flecha hacia arriba).
3. Baja y toca **Agregar a pantalla de inicio** → **Agregar**.
4. Abre la app desde el nuevo ícono azul. La primera vez hazlo con internet para que se guarde completa;
   después funciona sin conexión.
5. Si quieres empezar con tus datos reales y ya cargaste los de ejemplo:
   **Ajustes → Respaldo y datos → Borrar datos de ejemplo**.

## 5. Respaldos (importante)

iOS puede borrar los datos de apps web que no se abren en varias semanas. Para no perder nada:

- **Guardar respaldo:** Ajustes → Respaldo y datos → **Guardar respaldo** → en la hoja de compartir elige
  **Guardar en Archivos** (de preferencia en iCloud Drive). La app te lo recuerda si pasan más de 30 días.
- **Restaurar:** Ajustes → Respaldo y datos → **Restaurar respaldo** y elige el archivo `finanzas-respaldo-AAAA-MM-DD.json`.
  Reemplaza todo lo que hay en la app.
- **Exportar a CSV:** para abrir tus movimientos en Excel o Numbers.
- **Importar CSV del banco:** eliges el archivo, indicas qué columna es la fecha, la descripción y el monto
  (o cargo y abono), revisas la vista previa y confirmas. Lo que ya importaste antes se salta solo y lo que
  parece duplicado de un registro manual queda desmarcado para que tú decidas.

No subas tus respaldos a este repositorio.

## 6. Perfiles (varias personas en el mismo celular)

**Ajustes → Perfiles** permite que otra persona use la app en tu celular con sus propios datos.

- **Agregar perfil:** escribe el nombre y toca **Crear y cambiar a este perfil**. Empieza vacío, con las categorías y la cuenta de efectivo de siempre.
- **Cambiar de perfil:** toca su nombre en la lista. La app se recarga y abre los datos de esa persona.
- Cada perfil tiene sus propias cuentas, movimientos, presupuestos, recurrentes, metas y respaldos.
  El respaldo de otro perfil lleva su nombre en el archivo (`finanzas-respaldo-Ana-AAAA-MM-DD.json`), y al restaurar
  solo se reemplaza el perfil en el que estás.
- **Borrar un perfil** borra todos sus datos. El perfil principal (el primero) no se puede borrar.
- Los perfiles no tienen contraseña: cualquiera con el celular puede entrar a cualquiera.

## 7. Periodo del presupuesto (día de pago)

En **Presupuesto** toca **Cambiar** debajo del periodo. El periodo va de un pago hasta un día antes del siguiente:

- **Me pagan:** Mensual (eliges el día, por ejemplo el 10), Quincenal (días 15 y último de cada mes) o Semanal (eliges el día de la semana).
- **Este periodo empieza el:** si un pago cae otro día (por ejemplo, el 13 en vez del 10), cambia la fecha solo para ese periodo.
- Los límites del presupuesto son **por periodo**: si cobras cada semana, pones cuánto gastar por semana.
  Si cambias de mensual a semanal o quincenal, revisa tus montos.

Inicio y Presupuesto usan ese periodo; Movimientos y Análisis siguen usando meses de calendario.
Cada perfil tiene su propia forma de pago.

## Cómo está hecha

- **Montos en centavos enteros** (`$1,234.50` se guarda como `123450`) para evitar errores de redondeo.
- **Fechas en hora de Ciudad de México** (`America/Mexico_City`), guardadas como `AAAA-MM-DD`.
- **Recurrentes:** semanal (cada 7 días), quincenal (días 15 y último del mes) y mensual (mismo día; si no existe, el último).
  Se generan al abrir la app y se ponen al corriente aunque haya pasado tiempo, sin duplicar.
- **Ahorro del mes** = abonos a metas + transferencias a cuentas de ahorro.

```
src/
  db/         base de datos (Dexie), categorías por defecto, datos de ejemplo, recurrentes, metas
  lib/        dinero, fechas, saldos, presupuestos, recurrencia, análisis, CSV, respaldo (con pruebas)
  components/ piezas de interfaz (hoja modal, montos, barras, anillos, navegación)
  features/   registro rápido y respaldo
  screens/    Inicio, Movimientos, Presupuesto, Análisis y Ajustes
```
