<div align="center">

<img src="public/intelligenceboard.png" alt="MedBoard" width="160"/>

# MedBoard

**Clinical intelligence dashboard for Indonesian primary healthcare**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-dual-blue)](./LICENSE)

</div>

MedBoard is the working surface for doctors, nurses, midwives and administrators at Puskesmas
and other primary care facilities (FKTP, PONED). It brings the electronic medical record,
clinical decision support, ICD-10 coding, telemedicine, internal communication and reporting
into one web application, calibrated for the diseases and workflows of Indonesian primary care.

> **Technology enables, but humans decide.** MedBoard supports clinical judgement; it does not
> replace it. Every diagnosis, prescription and referral stays the responsibility of the treating
> clinician. See [`DISCLAIMER.md`](./DISCLAIMER.md).

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security and privacy](#security-and-privacy)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Features

| Module | Route | What it does |
| --- | --- | --- |
| Intelligence EMR | `/emr` | Clinical encounter workspace: anamnesis, vital signs with instant red alerts and NEWS2, clinical trajectory, assessment, prescription, and transfer to ePuskesmas |
| MedLink | `/telemedicine` | Video consultation (LiveKit), triage requests and consultation timeline |
| Consult Audrey | `/voice` | Voice consultation with Audrey, the clinical AI companion (push-to-talk) |
| ICD Coding | `/icdx` | ICD-10 search, code conversion between versions and LB1 report generation |
| Algorithma Calculator | `/calculator` | Validated clinical calculators (BMI, MAP, eGFR, qSOFA, GCS and more) |
| Sentrapedia | `/sentrapedia` | Clinical reference for 144 Puskesmas conditions, with staff contributions reviewed by AI and approved by an administrator |
| Sentra Hub | `/hub` | Crew directory and profiles |
| Sentra Network | `/acars` | Internal clinical coordination and messaging (ACARS) |
| Sentra Social | `/chat` | Team chat channels |
| Intelligence Monitor | `/dashboard/intelligence` | Live operational and clinical safety feed |
| Audit Log | `/audit/logbook` | Screening audit logbook with a tamper-evident hash chain |
| Admin | `/admin` | Users and access, institutions, notices, integrations and review queues |

Every page follows one design system: a white theme with Oxford Blue and red-orange, IBM Plex
Sans, sentence-case text, black neumorphic buttons and Lucide icons. A full description of each
feature is in [`docs/architecture/features.md`](./docs/architecture/features.md).

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Server | Custom Node.js 24 server (`server.ts`) with Socket.IO for real-time features |
| Data | PostgreSQL through Prisma 6; JSONL files under `runtime/` for local queues and histories |
| Styling | Tailwind CSS 4, CSS modules, shared UI kit (`src/app/ui.css`) |
| AI | DeepSeek for clinical reasoning and review; Groq Whisper for speech-to-text |
| Video | LiveKit |
| Automation | Playwright (EMR transfer to ePuskesmas) |
| Tests | `node:test` through `tsx` |

## Getting started

### Prerequisites

- Node.js 24 (see [`.nvmrc`](./.nvmrc))
- pnpm 11 (`corepack enable` picks the version pinned in `package.json`)
- PostgreSQL 16

### Install and run

```bash
git clone https://github.com/drferdi/Medboard.git
cd Medboard
corepack enable
pnpm install
cp .env.example .env.local      # fill in the values you need
pnpm run db:migrate             # create the database schema
pnpm run dev                    # http://localhost:3000
```

`pnpm install` also generates the Prisma client and installs the repository's git hooks.

## Configuration

All settings are environment variables; [`.env.example`](./.env.example) lists every one with a
comment. Never commit real values.

| Area | Variables |
| --- | --- |
| Server | `PORT`, `NODE_ENV`, `NEXT_PUBLIC_BASE_URL`, `TRUST_PROXY_HEADERS`, `CORS_ALLOWED_ORIGINS` |
| Database | `DATABASE_URL` |
| Sign-in | `CREW_ACCESS_SECRET`, `CREW_ACCESS_USERS_JSON`, `CREW_ACCESS_AUTOMATION_TOKEN` |
| AI | `DEEPSEEK_API_KEY`, `OLLAMA_BASE_URL` |
| Telemedicine | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |
| EMR transfer | `EMR_BASE_URL`, `EMR_LOGIN_URL`, `EMR_USERNAME`, `EMR_PASSWORD`, `EMR_HEADLESS` |
| LB1 reporting | `LB1_CONFIG_PATH`, `LB1_DATA_SOURCE_DIR`, `LB1_OUTPUT_DIR`, `LB1_TEMPLATE_PATH`, `LB1_MAPPING_PATH` |
| Monitoring | `SENTRY_DSN` |

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm run dev` | Start the development server with Socket.IO (reads `.env.local`) |
| `pnpm run build` | Generate the Prisma client and build for production |
| `pnpm run start` | Start the production server |
| `pnpm run lint` | Type-check the project (`tsc --noEmit`) |
| `pnpm test` | Run the test suites |
| `pnpm run test:capsule` | Run every suite, including the CDSS, NEWS2 and safety-gate checks |
| `pnpm run check` | Tests, type check and build in one go |
| `pnpm run db:migrate` / `db:seed` / `db:studio` | Database migrations, seed data and Prisma Studio |
| `pnpm run security:audit` | Audit production dependencies |

## Project structure

```text
.
├── src/
│   ├── app/            # Routes, pages, API handlers and global styles
│   ├── components/     # Shared React components (shell, clinical, telemedicine, UI)
│   ├── hooks/          # React hooks
│   ├── lib/            # Domain logic: CDSS, vitals, EMR, ICD, LB1, server utilities
│   └── types/          # Shared types
├── prisma/             # Schema, migrations and seed
├── database/           # Reference data read at runtime (ICD-10, Audrey knowledge)
├── public/             # Static assets and public reference data
├── scripts/            # Test runners and maintenance scripts
├── docs/               # Technical documentation
└── server.ts           # Custom HTTP and Socket.IO server
```

## Testing

```bash
pnpm test               # all suites
pnpm test -- --filter design   # one suite by name or alias
pnpm run lint           # type check
```

Tests sit next to the code they cover (`*.test.ts`). Suites that need PostgreSQL skip when
`DATABASE_URL` is not set. Details are in [`docs/development/testing.md`](./docs/development/testing.md).

## Deployment

See [`docs/deployment/overview.md`](./docs/deployment/overview.md) and [`docs/deployment/vps.md`](./docs/deployment/vps.md).
Run `pnpm run deploy:dry-run` before a release to check the build and the required settings.

## Security and privacy

MedBoard handles clinical data under Indonesian law (UU Kesehatan No. 17/2023 and UU PDP
No. 27/2022). Patient data never belongs in the repository, in test fixtures or in logs.

- Report vulnerabilities privately as described in [`SECURITY.md`](./SECURITY.md).
- Data handling is described in [`DATA_PRIVACY.md`](./DATA_PRIVACY.md) and
  [`docs/governance/privacy.md`](./docs/governance/privacy.md).
- AI use, providers and human oversight are described in
  [`docs/governance/ai-governance.md`](./docs/governance/ai-governance.md).

## Documentation

The technical documentation index is [`docs/README.md`](./docs/README.md): setup, architecture,
API, data model, clinical logic, testing, deployment and troubleshooting. The system design is in
[`ARCHITECTURE.md`](./ARCHITECTURE.md) and the release history in [`CHANGELOG.md`](./CHANGELOG.md).

## Contributing

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening a pull request, and follow the
[code of conduct](./CODE_OF_CONDUCT.md). Clinical content for Sentrapedia can also be proposed
inside the application at `/sentrapedia/kontribusi`.

## License

MedBoard is dual-licensed: a community license for individual, non-commercial use and an
enterprise license for facilities and organisations. See [`LICENSE`](./LICENSE).

Copyright © 2024–2026 dr. Ferdi Iskandar (Drferdi).
