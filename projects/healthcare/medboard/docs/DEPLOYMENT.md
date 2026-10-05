# File: docs/DEPLOYMENT.md | App: intelligenceBoard | Repo: abyss-monorepo | Updated: 2026-04-08

# Architected and built by Drferdi.

# Deployment — IntelligenceBoard

---

## Environments

| Environment   | Provider       | URL                                                  | Trigger         |
| ------------- | -------------- | ---------------------------------------------------- | --------------- |
| Local dev     | localhost:7000 | http://localhost:7000                                | `pnpm dev`      |
| Production    | Railway        | https://intelligenceboard-production.up.railway.app | Manual / Gate 5 |
| Domain custom | Railway        | https://puskesmasbalowerti.com                       | DNS → Railway   |

Pindah ke VPS (Chief, 2026-10-05: Railway terlalu mahal): lihat [`deploy-vps.md`](./deploy-vps.md).

---

## Railway Configuration

File: `railway.toml`

```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build:railway"

[build.nixpacksPlan.phases.setup]
nixPkgs = ["nodejs_22"]          # Node 22 di production

[deploy]
startCommand = "npm run start"    # npm run start = tsx server.ts (production mode)
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[environments.production]
NODE_ENV = "production"
```

**Catatan penting:**

- Build command: `npm run build:railway` (`prisma generate` lalu `next build`)
- Start command: `tsx --conditions react-server server.ts` (custom server)
- Port: otomatis dari Railway env var `PORT`. Default fallback ke 7000

---

## Build & Deploy Manual

```bash
# 1. Build production
pnpm --filter @drferdi/intelligenceboard build:railway

# 2. Test production build lokal
NODE_ENV=production pnpm --filter @drferdi/intelligenceboard start

# 3. Deploy ke Railway (staging)
railway up

# 4. Cek logs
railway logs --environment production
```

---

## Gate 5 — Production Deploy (Wajib)

Production deployment **tidak bisa** tanpa:

1. Gate 1–4 semua passing di GitHub Actions
2. Security review completed
3. File `genesis/05-trust-bridge/preview/chief-approval.md` ditandatangani Chief
4. Pipeline `infra/ci/pipelines/05-deploy-gate.yaml` passing

---

## Environment Variables Production (Railway)

Set via Railway dashboard atau `railway variables set KEY=VALUE`.

### Wajib untuk boot production

```
NODE_ENV=production
DATABASE_URL=                        # PostgreSQL production URL
CREW_ACCESS_SECRET=                  # HMAC session signing secret
CREW_ACCESS_USERS_JSON=              # JSON credentials crew production
CREW_ACCESS_AUTOMATION_TOKEN=        # Harus sama dengan token di Sentra Assist
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=  # Harus stabil lintas deploy/instance
TRUST_PROXY_HEADERS=true             # Wajib di Railway
```

### Auto-set Railway

```
PORT=                                # Auto-set oleh Railway
RAILWAY_ENVIRONMENT_ID=              # Auto-set oleh Railway
RAILWAY_DEPLOYMENT_ID=               # Auto-set oleh Railway
RAILWAY_GIT_COMMIT_SHA=              # Auto-set bila tersedia
```

### Sangat dianjurkan untuk operasi utama

```
NEXT_PUBLIC_BASE_URL=https://crew.puskesmasbalowerti.com
SENTRY_DSN=
```

### Opsional, tetapi fitur akan degraded bila kosong

```
DEEPSEEK_API_KEY=                    # CDSS autocomplete / primary reasoner
LIVEKIT_URL=                         # Telemedicine
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
RESEND_API_KEY=                      # Email notifikasi
EMAIL_FROM=
```

### Opsional lanjutan

```
SENTRY_AUTH_TOKEN=                   # Source map upload
SENTRY_ORG=
SENTRY_PROJECT=
LANGFUSE_PUBLIC_KEY=                 # LLM observability
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=
EPUSKESMAS_URL=                      # EMR auto-fill target jika dipakai env ini
EPUSKESMAS_USERNAME=
EPUSKESMAS_PASSWORD=
WHATSAPP_CLOUD_API_URL=
WHATSAPP_CLOUD_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
GOOGLE_TTS_API_KEY=
GROQ_API_KEY=
PERPLEXITY_API_KEY=
```

### Checklist exact sebelum redeploy

1. `DATABASE_URL` valid dan bisa diakses dari Railway.
2. `CREW_ACCESS_SECRET` terisi.
3. `CREW_ACCESS_USERS_JSON` terisi JSON valid untuk akun crew production.
4. `CREW_ACCESS_AUTOMATION_TOKEN` terisi dan nilainya sama dengan token di
   Sentra Assist.
5. `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` terisi dan dipertahankan sama untuk
   semua deploy berikutnya.
6. `TRUST_PROXY_HEADERS=true`.
7. `NEXT_PUBLIC_BASE_URL` mengarah ke domain dashboard production.
8. Redeploy lalu cek `GET /api/health`.

---

## Rollback

```bash
# Railway rollback ke deployment sebelumnya
railway rollback
```

---

## Health Check

```
GET /api/health
```

Interpretasi respons:

- `status: "ok"`: blocker boot tidak ada.
- `status: "degraded"`: app hidup, tetapi ada env opsional yang belum siap.
- `status: "error"`: masih ada blocker production yang wajib dibereskan.

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial
Intelligence</sub>
