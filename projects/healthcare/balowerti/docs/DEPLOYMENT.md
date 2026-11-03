# File: docs/DEPLOYMENT.md | Repo: puskesmas-website | Updated: 2026-03-16
# Architected and built by Drferdi.

# Deployment — Puskesmas Balowerti Website

## Railway Configuration

File: `railway.toml`

```toml
[build]
builder = "RAILPACK"
buildCommand = "npm run build"   # tsc -b && vite build → dist/

[deploy]
startCommand = "npx serve -s dist -l $PORT"   # static file server
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

## Environments

| Environment | URL | Trigger |
|-------------|-----|---------|
| Local dev | http://localhost:5173 | `npm run dev` |
| Preview local | http://localhost:4173 | `npm run preview` |
| Production | https://puskesmas-website-production.up.railway.app | Push ke master |

## Deploy Manual

```bash
# Railway CLI
railway login
railway link
railway up
railway logs
```

## Environment Variables di Railway

Set via Railway dashboard:
```
VITE_DASHBOARD_URL=https://primary-healthcare-production.up.railway.app
VITE_CREW_PORTAL_URL=https://crew.puskesmasbalowerti.com
```

> `GOOGLE_MAPS_API_KEY` tidak perlu di Railway — hanya untuk sync script lokal/CI.

## Rollback

```bash
railway rollback
```

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
