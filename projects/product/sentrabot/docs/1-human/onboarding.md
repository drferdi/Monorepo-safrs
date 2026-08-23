# Developer Onboarding Guide (Sentra Bot)

Welcome to the **Sentra Bot** development team! This guide is designed to accelerate the ramp-up time for new developers from days to minutes.

---

## 1. Monorepo Topology

Sentra Bot is engineered within a Monorepo governed by the **`@safrs` v1.1** standard (*Human-Governed · Agent-Executed · Machine-Enforced*). All packages and applications share a unified root toolchain (pnpm workspaces, Turborepo, Biome, and TypeScript).

```
D:/DEV/Monorepo/
├── apps/                               # (Root demonstrator / reference apps)
├── packages/                           # Domain Packages & Shared Boundaries
│   ├── api/                            # @safrs/api (Hono API route factories, RPC router)
│   ├── auth/                           # @safrs/auth (Better Auth integration)
│   ├── config/                         # @safrs/config (Shared build configs & tsconfig)
│   ├── database/                       # @safrs/database (Prisma schema & repositories)
│   ├── env/                            # @safrs/env (Type-safe env validation via Zod)
│   ├── schemas/                        # @safrs/schemas (Zod schemas & contracts)
│   ├── telemetry/                      # @safrs/telemetry (OpenTelemetry integration)
│   ├── token/                          # @sentra/token (Sentra Design Tokens & CSS)
│   └── ui/                             # @safrs/ui (Shared UI components)
└── projects/
    └── product/
        └── sentrabot/                  # Sentra Bot Product Capsule
            ├── apps/
            │   ├── web/                # @sentra/sentrabot-web (Next.js App Router UI)
            │   ├── desktop/            # @sentra/sentrabot-desktop (Electron app)
            │   ├── worker/             # @sentra/sentrabot-worker (Private agent runtime)
            │   ├── sandbox-supervisor/ # @sentra/sentrabot-sandbox-supervisor (Docker controller)
            │   └── site/               # apps/site (Vite marketing shell)
            ├── docs/                   # Technical & governance documentation
            ├── infra/                  # Docker Compose & deployment manifests
            ├── src/                    # Personas catalog & email templates
            └── tests/                  # Integration & release parity tests
```

### Boundary Rules:
1. **`packages/*`**: Reusable foundation layers. Server and database code must never be imported into browser components. Modifying shared packages is an **R2 Risk**.
2. **`projects/product/sentrabot/apps/*`**: Product runtime applications. UI runs in `apps/web`, background agent execution in `apps/worker`, and container isolation in `apps/sandbox-supervisor`.

---

## 2. Local Development Loop

### Prerequisites:
- **Node.js**: Active LTS (v22.x or v23.x)
- **pnpm**: v10.x (`corepack enable pnpm`)
- **Docker / Podman**: For local PostgreSQL database and isolated sandbox execution
- **Terminal**: PowerShell (Windows) or Bash (Linux/macOS)

### Getting Started (Zero to Dev):

#### 1. Install Root Dependencies
```bash
# Run from Monorepo root
pnpm install
```

#### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the repository root:
```bash
cp .env.example .env
```
Key minimal variables:
- `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sentrabot?schema=public"`
- `BETTER_AUTH_SECRET="your-32-char-random-secret-for-local-dev"`
- `BETTER_AUTH_URL="http://localhost:3000"`
- `WORKER_CONTROL_TOKEN="local-worker-token-secret"`
- `SUPERVISOR_TOKEN="local-supervisor-token-secret"`
- `CREDENTIAL_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"` (64 hex characters = 32 bytes)

#### 3. Start Local PostgreSQL Database
```bash
# Launch PostgreSQL via Docker Compose
docker compose up postgres -d
```

#### 4. Run Prisma Database Migrations
```bash
# Generate Prisma Client & Migrate Schema
pnpm --filter @safrs/database prisma generate
pnpm --filter @safrs/database prisma migrate dev
```

#### 5. Start Development Servers (Concurrent Services)
Run the entire stack or individual services using Turborepo filters:
```bash
# Start all Sentra Bot services (Web + Worker + Supervisor)
pnpm dev

# Or start the Web Dashboard only (Port 3000 / Harness Port 8799)
pnpm --filter @sentra/sentrabot-web dev

# Or start the Worker Runtime (Port 8787)
pnpm --filter @sentra/sentrabot-worker dev

# Or start the Sandbox Supervisor (Port 8788)
pnpm --filter @sentra/sentrabot-sandbox-supervisor dev
```

Open your browser at `http://localhost:3000` to access the Sentra Bot Web Dashboard.

---

## 3. Git, PR, & Verification Standards

This repository enforces strict, automated machine governance. All developers must adhere to the following standards:

### Conventional Commits
Use structured commit messages:
```
<type>(<scope>): <imperative summary>

[optional body explaining rationale and design trade-offs]
[optional footer referencing issue tracker or BREAKING CHANGE]
```
Examples:
- `feat(sentrabot-web): add interactive permission request modal`
- `fix(worker): timing-safe token validation for supervisor requests`
- `docs(sentrabot): update cognitive architecture memory model`

### Local Pre-Push Verification Gates
Before opening a Pull Request or requesting review, ensure all local verification checks pass:

```bash
# 1. Linting & Formatting Check (Biome)
pnpm lint

# 2. TypeScript Static Typecheck
pnpm typecheck

# 3. Unit & Integration Tests (Vitest)
pnpm test

# 4. Monorepo SAFRS Governance Verification
bash scripts/safrs-verify.sh
```

### Risk Classification:
- **R0 (Read-Only)**: Documentation, code comments, read-only static analysis.
- **R1 (Local Reversible)**: Local feature code inside `projects/product/sentrabot/apps/*`.
- **R2 (Shared Boundary)**: Prisma schema changes, shared `@safrs/*` packages, auth flows, CI/CD pipelines. Requires designated reviewer approval.
- **R3 (Critical/Production)**: Production credentials, destructive database migrations, signed desktop binary releases. Requires explicit authorization from Human Owner (Chief).
