# Mundial 2026 · Tablero

Tablero interactivo de la Copa Mundial de la FIFA 2026: resultados, posiciones de los 12 grupos, calendario de próximos partidos, cuadro de eliminatorias y selector de horario por país (🇨🇱 Chile · 🇪🇸 España · 🇧🇷 Brasil). Funciona como web y como app instalable (PWA), y se **actualiza solo cada 2 horas** desde una API deportiva.

---

## 1. Qué incluye

```
índice del repo
├── index.html                 ← la app (lee data.json; PWA; selector de país)
├── data.json                  ← los datos (se reescriben solos cada día)
├── manifest.webmanifest        ← metadatos PWA (para instalar en el celular)
├── sw.js                       ← service worker (uso sin conexión)
├── icon-192.png / icon-512.png ← íconos de la app
├── netlify.toml                ← config de publicación
├── .github/workflows/actualizar.yml  ← cron: corre todos los días a las 5 AM (Chile)
└── scripts/actualizar-datos.mjs      ← baja los datos de football-data.org → data.json
```

La idea clave: **los datos viven aparte del código** (`data.json`). El sitio es fijo; lo único que cambia cada día es ese archivo.

---

## 2. Publicar con actualización automática (recomendado)

### Paso A — Subir a GitHub
1. Crea un repositorio nuevo (vacío) en GitHub.
2. Sube **todos** estos archivos a la raíz del repo (incluidas las carpetas `.github/` y `scripts/`).
   Por línea de comandos:
   ```bash
   git init
   git add .
   git commit -m "Tablero Mundial 2026"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
   git push -u origin main
   ```

### Paso B — Conectar a Netlify
1. En Netlify: **Add new site → Import an existing project → GitHub** y elige tu repo.
2. Configuración de build:
   - **Build command:** *(vacío)*
   - **Publish directory:** `.`
   (El `netlify.toml` ya lo deja así; puedes dejar los campos en blanco.)
3. **Deploy.** En segundos tienes una URL pública (puedes renombrarla en *Site settings → Change site name*).

Desde aquí, **cada vez que cambie el repo, Netlify republica solo.**

### Paso C — Token de la API deportiva
1. Regístrate gratis en **https://www.football-data.org/client/register** y copia tu token.
2. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - **Name:** `FOOTBALL_DATA_TOKEN`
   - **Secret:** *(tu token)*

### Paso D — Probar el actualizador
1. En GitHub, pestaña **Actions → "Actualizar resultados Mundial 2026" → Run workflow**.
2. Si todo está bien, hace *commit* de un `data.json` fresco y Netlify republica.
3. A partir de ahí corre **solo cada 2 horas, todos los días**.

¡Listo! El sitio queda publicado y se actualiza solo.

---

## 3. Cómo funciona la actualización

🗞️ *Como un diario:* el diseño (la app) es fijo; cada mañana un "repartidor" (la GitHub Action) le pide los datos frescos al "reportero" (la API football-data.org) cada 2 horas, revisa que tengan sentido y reescribe la página de resultados (`data.json`). Netlify reimprime el sitio solo.

- **Cuándo:** cada 2 horas, todos los días (en hora UTC; el cron de GitHub puede atrasarse algunos minutos).
- **Qué hace `scripts/actualizar-datos.mjs`:**
  1. Pide `standings` y `matches` del Mundial (`WC`) a football-data.org.
  2. Traduce los nombres al español + bandera y arma la tabla de cada grupo (PJ/G/E/P/DG/Pts).
  3. Convierte los horarios a **hora de Chile** (la app los reconvierte a España/Brasil).
  4. Calcula clasificados / eliminados / líder y valida que vengan los 12 grupos.
  5. Toma el **top-3 de goleadores** del torneo (`/scorers`).
  6. Arma el **cuadro de eliminatorias** estilo bracket (dieciseisavos → final), con la copa al centro; rellena equipos, horarios y resultados a medida que se definen.
  7. Si todo cuadra, reescribe `data.json`. Si algo falla, **no toca nada** (conserva el dato anterior).

---

## 4. Probar en tu computador (opcional)

El `fetch` de `data.json` y el service worker necesitan un servidor (no basta abrir el archivo):
```bash
npx serve .
# abre la URL que muestra (p. ej. http://localhost:3000)
```
Para correr el actualizador a mano:
```bash
export FOOTBALL_DATA_TOKEN=tu_token
node scripts/actualizar-datos.mjs
```

---

## 5. Instalar como app en el celular/tablet

Con el sitio ya publicado:
- **iPad/iPhone (Safari):** Compartir → *Agregar a pantalla de inicio*.
- **Android (Chrome):** botón *📲 Instalar como app* (o menú ⋮ → *Instalar aplicación*).

---

## 6. Cosas que conviene saber

- **Plan gratis de football-data.org:** marcadores con leve retraso y solo temporada actual. Para una corrida diaria, suficiente. Límite: 10 llamadas/minuto (el script usa solo 2).
- **"Ya eliminado"** aparece recién al cerrar la fase de grupos: marcarlo antes es arriesgado por la regla de los *8 mejores terceros*. Los **clasificados** se marcan apenas un equipo asegura el top‑2.
- **Nombres de selecciones:** si la API trae alguno que no está en el diccionario del script, se muestra con ⚽ y queda avisado en el log de la Action para agregarlo.
- **Cambio de fuente:** si algún día quieres otra API, solo se reescribe `scripts/actualizar-datos.mjs`; la app no cambia mientras el `data.json` mantenga el mismo formato.

---

## 7. Publicar sin actualización (alternativa rápida)

Si solo quieres la versión con datos fijos sin cron: usa el archivo único `mundial-2026-web.html` (o la carpeta `netlify-drop/`) y arrástralo a **app.netlify.com/drop**. No se actualiza solo, pero queda online en segundos.
