# File: docs/SETUP.md | App: intelligenceBoard | Repo: abyss-monorepo | Updated: 2026-03-16
# Architected and built by Drferdi.

# Setup — IntelligenceBoard

---

## Prerequisites

| Tool | Versi |
|------|-------|
| Node.js | ≥ 20.9.0 (Railway deploy: Node 22) |
| pnpm | ≥ 9.x |
| PostgreSQL | ≥ 14 |

---

## Install & Run

```bash
# Dari root monorepo
pnpm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local — isi semua nilai yang diperlukan

# Database setup
pnpm --filter @drferdi/intelligenceboard db:migrate
pnpm --filter @drferdi/intelligenceboard db:seed

# Dev server (custom server dengan Socket.IO)
pnpm --filter @drferdi/intelligenceboard dev
# → http://localhost:7000
```

**Catatan:** App ini menggunakan custom server (`server.ts`), bukan `next dev`.
Dev server berjalan di port 7000 (default). Jika 7000 dipakai, otomatis fallback ke 7001.

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/puskesmas_db

# AI APIs
DEEPSEEK_API_KEY=        # Primary CDSS reasoning (DeepSeek Reasoner)

# Auth (Crew Access — custom, bukan NextAuth)
CREW_ACCESS_SECRET=      # JWT signing secret untuk session cookie

# Telemedicine (LiveKit)
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=             # wss://your-livekit-server

# Email (Resend)
RESEND_API_KEY=          # Untuk email notifikasi registrasi

# Observability
SENTRY_DSN=              # Sentry error tracking
LANGFUSE_PUBLIC_KEY=     # LLM observability
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=           # https://cloud.langfuse.com atau self-hosted

# EMR Auto-Fill (ePuskesmas)
EPUSKESMAS_URL=          # Base URL sistem ePuskesmas
EPUSKESMAS_USERNAME=
EPUSKESMAS_PASSWORD=

# Perplexity AI (opsional)
PERPLEXITY_API_KEY=

# App
NODE_ENV=development
PORT=7000
HOST=0.0.0.0
```

---

## Git Guardrails

Saat `pnpm install`, script `scripts/install-git-guardrails.mjs` otomatis dijalankan.
Script ini menginstall pre-push hooks sesuai SYNAPSE pipeline.

Manual install:
```bash
pnpm --filter @drferdi/intelligenceboard setup:git-guardrails
```

---

## Commands

```bash
pnpm --filter @drferdi/intelligenceboard dev              # Dev server (port 7000)
pnpm --filter @drferdi/intelligenceboard dev:clean        # Dev server + clear .next lock
pnpm --filter @drferdi/intelligenceboard build            # Production build
pnpm --filter @drferdi/intelligenceboard start            # Production server
pnpm --filter @drferdi/intelligenceboard lint             # TypeScript check (tsc --noEmit)
pnpm --filter @drferdi/intelligenceboard test             # Full test suite
pnpm --filter @drferdi/intelligenceboard test:cdss        # CDSS engine tests saja
pnpm --filter @drferdi/intelligenceboard test:auth-hardening  # Auth security tests
pnpm --filter @drferdi/intelligenceboard db:migrate       # Prisma migrate
pnpm --filter @drferdi/intelligenceboard db:studio        # Prisma Studio
pnpm --filter @drferdi/intelligenceboard db:seed          # Seed database
```

---

## Deployment (Railway)

Config: `railway.toml`
```toml
[build]
buildCommand = "npm run build"
nixPkgs = ["nodejs_22"]

[deploy]
startCommand = "npm run start"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

Production URL: `https://intelligenceboard-production.up.railway.app`
Domain custom: `https://puskesmasbalowerti.com`

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
