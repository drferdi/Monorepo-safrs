# Development Setup — MedBoard

Technical setup guide for local development and environment configuration.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 24 | See [`.nvmrc`](../../.nvmrc) |
| pnpm | 11 | Pinned via `packageManager` in `package.json` (`corepack enable`) |
| PostgreSQL | ≥ 14 | Local or Docker instance |

---

## Installation & Running

```bash
# 1. Install dependencies and generate Prisma client
pnpm install

# 2. Configure environment variables
cp .env.example .env.local
# Edit .env.local and fill in the required values

# 3. Database migrations and initial seed
pnpm run db:migrate
pnpm run db:seed

# 4. Start development server (custom Node server with Socket.IO)
pnpm run dev
# → http://localhost:3000
```

> [!NOTE]
> MedBoard uses a custom runtime server (`server.ts`) with Socket.IO integration rather than vanilla `next dev`.
> The development server runs on port 3000 by default (configurable via `PORT`). If port 3000 is occupied, it automatically attempts fallback ports.

---

## Environment Variables

Key variables required for local development:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/puskesmas_db

# AI APIs
DEEPSEEK_API_KEY=        # Primary CDSS reasoning engine (DeepSeek Reasoner)

# Authentication (Crew Access — custom HMAC/cookie session)
CREW_ACCESS_SECRET=      # HMAC secret key for signing session cookies

# Telemedicine (LiveKit)
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=             # wss://your-livekit-server

# Email Notifications (Resend)
RESEND_API_KEY=          # Registration and alert dispatch

# Observability
SENTRY_DSN=              # Error monitoring
LANGFUSE_PUBLIC_KEY=     # LLM observability
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=           # https://cloud.langfuse.com or self-hosted endpoint

# EMR Automation (ePuskesmas Bridge)
EMR_BASE_URL=            # Base URL of external ePuskesmas instance
EMR_USERNAME=
EMR_PASSWORD=

# App Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
```

---

## Git Guardrails

During `pnpm install`, `scripts/install-git-guardrails.mjs` executes automatically to set up pre-push hooks and verification pipelines.

To install or refresh hooks manually:
```bash
pnpm run setup:git-guardrails
```

---

## Common Development Commands

```bash
pnpm run dev                  # Start local development server
pnpm run dev:clean            # Clean .next dev locks and start server
pnpm run build                # Compile production bundle and generate Prisma client
pnpm run start                # Run production server locally
pnpm run lint                 # TypeScript type check (tsc --noEmit)
pnpm test                     # Run all test suites
pnpm run test:cdss            # Run CDSS engine test suite
pnpm run test:auth-hardening  # Run authentication security tests
pnpm run db:migrate           # Apply Prisma migrations
pnpm run db:studio            # Launch Prisma Studio web GUI
pnpm run db:seed              # Seed local database
```

---

## Deployment Reference

Production runs on an Ubuntu 24.04 VPS at `https://medboard.sentrahai.com`.
For operational architecture and deployment instructions, refer to [`deployment/overview.md`](../deployment/overview.md) and the VPS runbook in [`deployment/vps.md`](../deployment/vps.md).

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
