# Tablero Mundial 2026

Sitio estático que muestra el tablero de resultados del Mundial 2026. Se actualiza automáticamente cada 2 horas mediante una GitHub Action que consulta la API de football-data.org y actualiza `data.json`.

## Stack

- HTML + CSS + JS vanilla (sin frameworks)
- PWA con Service Worker
- Netlify (deploy estático)
- GitHub Actions (actualización automática de datos)

## Archivos principales

- `index.html` — interfaz del tablero
- `data.json` — datos actualizados automáticamente
- `scripts/actualizar-datos.mjs` — script Node 20 que consulta la API
- `.github/workflows/actualizar.yml` — workflow de actualización cada 2 h
- `netlify.toml` — configuración de Netlify (publish = ".")

## Variables de entorno / Secrets

| Secret | Descripción |
|---|---|
| `FOOTBALL_DATA_TOKEN` | API key de football-data.org (GitHub Actions Secret) |

> **Nunca** subas la API key al repositorio. Guárdala exclusivamente en Settings → Secrets and variables → Actions.
