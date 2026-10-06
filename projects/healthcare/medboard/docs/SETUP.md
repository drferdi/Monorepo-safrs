# Setup — MedBoard

---

## Prerequisites

| Tool | Versi |
|------|-------|
| Node.js | 24 (lihat `.nvmrc`) |
| pnpm | 11 (via `corepack enable`) |
| PostgreSQL | ≥ 14 |

---

## Install & Run

```bash
pnpm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local — isi semua nilai yang diperlukan

# Database setup
pnpm run db:migrate
pnpm run db:seed

# Dev server (custom server dengan Socket.IO)
pnpm run dev
# → http://localhost:3000
```

**Catatan:** App ini menggunakan custom server (`server.ts`), bukan `next dev`.
Dev server berjalan di port 3000 (default, bisa diganti dengan `PORT`). Jika 3000 dipakai, otomatis fallback ke 3001.

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
pnpm run setup:git-guardrails
```

---

## Commands

```bash
pnpm run dev              # Dev server (port 7000)
pnpm run dev:clean        # Dev server + clear .next lock
pnpm run build            # Production build
pnpm run start            # Production server
pnpm run lint             # TypeScript check (tsc --noEmit)
pnpm run test             # Full test suite
pnpm run test:cdss        # CDSS engine tests saja
pnpm run test:auth-hardening  # Auth security tests
pnpm run db:migrate       # Prisma migrate
pnpm run db:studio        # Prisma Studio
pnpm run db:seed          # Seed database
```

---

## Deployment

Production berjalan di VPS Biznet Gio: `https://medboard.sentrahai.com`.
Lihat [`DEPLOYMENT.md`](./DEPLOYMENT.md) dan runbook [`deploy-vps.md`](./deploy-vps.md).

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
