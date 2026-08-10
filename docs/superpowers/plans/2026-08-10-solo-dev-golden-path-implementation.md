# SAFRS Solo-Developer Golden Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a production-capable, single-command SAFRS monorepo foundation for a non-coding solo developer using Next.js, Hono RPC, Zod, PostgreSQL, and Prisma.

**Architecture:** One Next.js application is the default deployment unit and mounts a package-owned Hono API under `/api`. Shared packages own schemas, environment validation, database access, UI, and configuration; repository tooling owns setup, diagnosis, project creation, and optional capability selection.

**Tech Stack:** Node.js 24 LTS, pnpm 11, Turborepo 2, TypeScript strict, Next.js 16.2 Active LTS, React 19, Hono 4, Zod 4, T3 Env, PostgreSQL, Prisma 7, Tailwind CSS 4, Biome 2, Husky 9, Vitest 4, Playwright, Docker Compose, Renovate, GitHub Actions, SAFRS v1.1.

## Global Constraints

- Preserve every existing SAFRS v1.1 capability and canonical document.
- Treat dependency, shared package, CI, migration, and governance changes as R2.
- Do not configure production deployment, production credentials, real email, or real payments.
- Default to Node.js runtime; Edge requires a separate written decision.
- Keep Python, Electron, WXT, Stripe, email, and AI absent from runtime dependencies until selected.
- Use Active LTS or stable releases only; no canary, preview, beta, or RC packages.
- Resolve exact versions, commit the lockfile, and let Renovate propose later changes through PRs.
- Give human-facing commands concise Indonesian explanations and exact recovery actions.
- All code-changing tasks follow red-green-refactor and end with focused verification.
- Do not overwrite user-owned files or discard unrelated working-tree changes.

## Locked File Map

### Root orchestration

- `package.json`: human-facing commands and workspace metadata.
- `pnpm-workspace.yaml`: workspace packages and dependency catalog.
- `pnpm-lock.yaml`: exact dependency resolution.
- `turbo.json`: task graph, cache inputs, outputs, and persistent processes.
- `tsconfig.json`: root project references.
- `biome.jsonc`: repository formatting and lint policy.
- `compose.yaml`: local PostgreSQL only.
- `.env.example`: safe local configuration names.
- `.node-version` and `.npmrc`: runtime/package-manager behavior.

### Runtime units

- `projects/golden-path/apps/web`: Next.js deployment, API adapter, pages, error boundaries, Playwright.
- `packages/api`: Hono application, typed RPC client, error envelope.
- `packages/schemas`: canonical Zod boundary schemas.
- `packages/env`: T3 Env server/client validation.
- `packages/database`: Prisma schema/client, migrations, seed, reset guard.
- `packages/ui`: shared presentation primitives.
- `packages/config`: TypeScript configuration presets.

### Operator tooling

- `tools/doctor`: read-only prerequisite and health checks.
- `tools/project-wizard`: SAFRS capsule generator.
- `tools/capabilities`: optional capability manifests and selector.
- `scripts/setup.mjs`: first-run orchestration.
- `scripts/dev.mjs`: safe single-command startup.
- `scripts/safrs-verify.mjs`: cross-platform SAFRS verification launcher.

### Automation and evidence

- `.husky/pre-commit`: staged Biome repair.
- `.github/renovate.json`: PR-only updates.
- `.github/workflows/ci.yml`: complete non-deploying CI.
- `tests/contracts`, `tests/integration`, `tests/repository`: cross-package proofs.
- `docs/evidence/SAFRS_GOLDEN_PATH_VERIFICATION.md`: final evidence.
- `CODEX_IMPLEMENT_GOLDEN_PATH.md`: reusable execution prompt.

---

### Task 1: Establish the workspace and version contract

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.json`
- Create: `.node-version`
- Create: `.npmrc`
- Create: `biome.jsonc`
- Create: `.env.example`
- Create: `compose.yaml`
- Create: `scripts/safrs-verify.mjs`
- Create: `tests/repository/workspace-config.test.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: SAFRS root topology and Node.js 24.18.0/pnpm 11.21.0 machine baseline.
- Produces: root scripts `setup`, `doctor`, `dev`, `build`, `lint`, `format`, `fix`, `typecheck`, `test`, `test:e2e`, `check`, `db:*`, `project:new`, and `capability:add`.

- [x] **Step 1: Write the workspace configuration test**

~~~js
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("root exposes the solo-developer command contract", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  for (const command of [
    "setup", "doctor", "dev", "build", "lint", "format", "fix",
    "typecheck", "test", "test:e2e", "check", "db:start", "db:stop",
    "db:studio", "db:generate", "db:migrate", "db:seed", "db:reset",
    "project:new", "capability:add",
  ]) {
    assert.equal(typeof pkg.scripts[command], "string", command);
  }
  assert.match(pkg.packageManager, /^pnpm@11\./);
});
~~~

- [x] **Step 2: Run the test and confirm the missing root contract**

Run: `node --test tests/repository/workspace-config.test.mjs`
Expected: FAIL because `package.json` does not exist.

- [x] **Step 3: Add root workspace configuration**

Use private workspace metadata, `packageManager: pnpm@11.21.0`, `engines.node: >=24.18.0 <25`, workspaces under `projects/*/apps/*`, `packages/*`, and `tools/*`, and a pnpm catalog containing the compatibility-tested stable versions.

Biome must explicitly exclude `.safrs/**` and generated `.turbo/**` caches so `lint`, `format`, and `fix` cannot inspect or rewrite canonical machine-readable governance or generated task artifacts. The focused workspace test must assert both exclusions. The sequence `pnpm typecheck` followed by `pnpm lint` must pass without cache cleanup and without changing any `.safrs` file.

Root command wiring:

~~~json
{
  "scripts": {
    "setup": "node scripts/setup.mjs",
    "doctor": "node tools/doctor/src/cli.mjs",
    "dev": "node scripts/dev.mjs",
    "build": "turbo run build",
    "lint": "biome check .",
    "format": "biome format --write .",
    "fix": "biome check --write .",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e",
    "check": "pnpm governance && pnpm lint && pnpm typecheck && pnpm test && pnpm build",
    "governance": "node scripts/safrs-verify.mjs",
    "db:start": "docker compose up -d --wait postgres",
    "db:stop": "docker compose stop postgres",
    "db:studio": "pnpm --filter @safrs/database studio",
    "db:generate": "pnpm --filter @safrs/database generate",
    "db:migrate": "pnpm --filter @safrs/database migrate",
    "db:seed": "pnpm --filter @safrs/database seed",
    "db:reset": "pnpm --filter @safrs/database reset",
    "project:new": "node tools/project-wizard/src/cli.mjs",
    "capability:add": "node tools/capabilities/src/cli.mjs",
    "prepare": "husky"
  }
}
~~~

The Compose service is named `postgres`, binds only to `127.0.0.1:54329`, uses database `safrs_local`, and has a health check.

- [x] **Step 4: Resolve and install the stable dependency set**

Run: `pnpm install`
Expected: `pnpm-lock.yaml` is created without prerelease packages.

Run: `pnpm list --depth 0`
Expected: selected versions resolve and no peer-dependency error remains.

- [x] **Step 5: Verify the root contract**

Run: `node --test tests/repository/workspace-config.test.mjs`
Expected: PASS.

- [x] **Step 6: Commit the workspace**

~~~bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.json biome.jsonc .node-version .npmrc .env.example compose.yaml .gitignore scripts/safrs-verify.mjs tests/repository/workspace-config.test.mjs
git commit -m "chore: establish golden-path workspace"
~~~

---

### Task 2: Add shared configuration, schemas, and validated environment

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig/base.json`
- Create: `packages/config/tsconfig/nextjs.json`
- Create: `packages/schemas/package.json`
- Create: `packages/schemas/tsconfig.json`
- Create: `packages/schemas/src/index.ts`
- Create: `packages/schemas/src/demo.ts`
- Create: `packages/schemas/src/demo.test.ts`
- Create: `packages/env/package.json`
- Create: `packages/env/tsconfig.json`
- Create: `packages/env/src/server.ts`
- Create: `packages/env/src/client.ts`
- Create: `packages/env/src/server.test.ts`

**Interfaces:**
- Produces: `createDemoInputSchema`, `demoSchema`, `apiErrorSchema`, `serverEnv`, and `clientEnv`.
- Consumes: root TypeScript and Vitest tasks.

- [x] **Step 1: Write schema and environment failure tests**

~~~ts
import { describe, expect, it } from "vitest";
import { createDemoInputSchema } from "./demo";

describe("createDemoInputSchema", () => {
  it("rejects an empty name", () => {
    expect(createDemoInputSchema.safeParse({ name: "" }).success).toBe(false);
  });
  it("normalizes a valid name", () => {
    expect(createDemoInputSchema.parse({ name: "  Atlas  " })).toEqual({ name: "Atlas" });
  });
});
~~~

The environment test imports a factory with an explicit environment object and asserts that a missing `DATABASE_URL` returns a Zod issue naming only the variable, never a value.

- [x] **Step 2: Run focused tests**

Run: `pnpm --filter @safrs/schemas test`
Expected: FAIL because schema modules are missing.

- [x] **Step 3: Implement canonical Zod schemas**

~~~ts
import { z } from "zod";

export const createDemoInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const demoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string().datetime(),
});

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  correlationId: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});
~~~

- [x] **Step 4: Implement T3 Env boundaries**

`serverEnv` uses `@t3-oss/env-core` for `DATABASE_URL`, `NODE_ENV`, and `APP_URL`. `clientEnv` uses `@t3-oss/env-nextjs` and permits only explicitly declared `NEXT_PUBLIC_*` variables. Export factories for tests and validated singletons for runtime use.

- [x] **Step 5: Run tests and type checking**

Run: `pnpm --filter @safrs/schemas test && pnpm --filter @safrs/env test && pnpm typecheck`
Expected: PASS.

- [x] **Step 6: Commit shared contracts**

~~~bash
git add packages/config packages/schemas packages/env
git commit -m "feat: add shared schemas and validated environment"
~~~

---

### Task 3: Build the safe PostgreSQL and Prisma package

**Files:**
- Create: `packages/database/package.json`
- Create: `packages/database/tsconfig.json`
- Create: `packages/database/prisma.config.ts`
- Create: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/0001_init/migration.sql`
- Create: `packages/database/src/client.ts`
- Create: `packages/database/src/index.ts`
- Create: `packages/database/src/seed.ts`
- Create: `packages/database/src/reset.ts`
- Create: `packages/database/src/reset-guard.ts`
- Create: `packages/database/src/reset-guard.test.ts`

**Interfaces:**
- Produces: `database` Prisma client, `assertDisposableDatabase(url: string): URL`, deterministic seed command.
- Consumes: `serverEnv.DATABASE_URL` and Zod schemas.

- [x] **Step 1: Write destructive-operation guard tests**

~~~ts
import { describe, expect, it } from "vitest";
import { assertDisposableDatabase } from "./reset-guard";

describe("assertDisposableDatabase", () => {
  it("accepts the declared local database", () => {
    expect(assertDisposableDatabase("postgresql://safrs:safrs@127.0.0.1:54329/safrs_local").hostname)
      .toBe("127.0.0.1");
  });
  it.each([
    "postgresql://user:pass@db.example.com/production",
    "postgresql://user:pass@127.0.0.1:54329/customer_data",
    "postgresql://user:pass@localhost:5432/postgres",
  ])("rejects unsafe target %s", (url) => {
    expect(() => assertDisposableDatabase(url)).toThrow(/DITOLAK/);
  });
});
~~~

- [x] **Step 2: Verify the guard test fails**

Run: `pnpm --filter @safrs/database test -- reset-guard`
Expected: FAIL because `assertDisposableDatabase` is missing.

- [x] **Step 3: Implement the fail-closed guard**

Allow only hosts `127.0.0.1` or `localhost`, port `54329`, and database names ending in `_local` or `_test`. Reject missing passwords, unknown protocols, and query parameter `sslmode=require`. Error messages begin with `[DATABASE] RESET DITOLAK`.

- [x] **Step 4: Add Prisma 7 configuration**

Use PostgreSQL, the `prisma-client` generator with explicit output `../src/generated/prisma`, ESM, `@prisma/adapter-pg`, and models `Demo` and `TransactionSample`. Seed data uses fixed identifiers and values so tests are repeatable.

- [x] **Step 5: Start PostgreSQL and apply the migration**

Run: `pnpm db:start`
Expected: PostgreSQL health check becomes healthy.

Run: `pnpm db:generate && pnpm db:migrate && pnpm db:seed`
Expected: client generation, migration, and seed complete.

- [x] **Step 6: Verify Studio and reset safety**

Run: `pnpm --filter @safrs/database test`
Expected: PASS.

Run with an intentionally unsafe URL: `DATABASE_URL=postgresql://x:x@db.example.com/prod pnpm db:reset`
Expected: non-zero exit with `RESET DITOLAK` and no database operation.

- [x] **Step 7: Commit the database package**

~~~bash
git add packages/database compose.yaml pnpm-lock.yaml
git commit -m "feat: add safe local database workflow"
~~~

---

### Task 4: Implement the typed Hono API

**Files:**
- Create: `packages/api/package.json`
- Create: `packages/api/tsconfig.json`
- Create: `packages/api/src/error.ts`
- Create: `packages/api/src/app.ts`
- Create: `packages/api/src/client.ts`
- Create: `packages/api/src/index.ts`
- Create: `packages/api/src/app.test.ts`

**Interfaces:**
- Produces: `app`, `AppType`, `createApiClient(baseUrl: string)`, typed `GET /api/health`, `GET /api/demos`, and `POST /api/demos`.
- Consumes: `database`, `createDemoInputSchema`, `demoSchema`, `apiErrorSchema`.

- [x] **Step 1: Write API behavior tests**

~~~ts
import { describe, expect, it } from "vitest";
import { app } from "./app";

describe("Hono API", () => {
  it("returns typed health state", async () => {
    const response = await app.request("/api/health");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });
  it("returns a standard validation error", async () => {
    const response = await app.request("/api/demos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
~~~

- [x] **Step 2: Verify tests fail**

Run: `pnpm --filter @safrs/api test`
Expected: FAIL because `app` is missing.

- [x] **Step 3: Implement Hono routes and error envelope**

Create `new Hono().basePath("/api")`, attach a correlation ID middleware, validate JSON with `@hono/zod-validator`, return explicit status codes, and ensure unexpected errors return `INTERNAL_ERROR` without stack traces.

- [x] **Step 4: Export a precomputed client type**

~~~ts
import { hc } from "hono/client";
import type { AppType } from "./app";

export type ApiClient = ReturnType<typeof hc<AppType>>;
export const createApiClient = (...args: Parameters<typeof hc>): ApiClient =>
  hc<AppType>(...args);
~~~

- [x] **Step 5: Run focused verification**

Run: `pnpm --filter @safrs/api test && pnpm --filter @safrs/api typecheck`
Expected: PASS.

- [x] **Step 6: Commit the API**

~~~bash
git add packages/api
git commit -m "feat: add typed Hono RPC API"
~~~

---

### Task 5: Create the Next.js application

**Files:**
- Create: `projects/golden-path/AGENTS.md`
- Create: `projects/golden-path/README.md`
- Create: `projects/golden-path/docs/architecture.md`
- Create: `projects/golden-path/docs/data.md`
- Create: `projects/golden-path/docs/testing.md`
- Create: `projects/golden-path/tests/README.md`
- Create: `projects/golden-path/apps/web/package.json`
- Create: `projects/golden-path/apps/web/tsconfig.json`
- Create: `projects/golden-path/apps/web/next.config.ts`
- Create: `projects/golden-path/apps/web/postcss.config.mjs`
- Create: `projects/golden-path/apps/web/src/app/globals.css`
- Create: `projects/golden-path/apps/web/src/app/layout.tsx`
- Create: `projects/golden-path/apps/web/src/app/page.tsx`
- Create: `projects/golden-path/apps/web/src/app/loading.tsx`
- Create: `projects/golden-path/apps/web/src/app/error.tsx`
- Create: `projects/golden-path/apps/web/src/app/global-error.tsx`
- Create: `projects/golden-path/apps/web/src/app/not-found.tsx`
- Create: `projects/golden-path/apps/web/src/app/api/[[...route]]/route.ts`
- Create: `projects/golden-path/apps/web/src/components/demo-form.tsx`
- Create: `projects/golden-path/apps/web/src/lib/api-client.ts`
- Create: `projects/golden-path/apps/web/src/lib/server-data.ts`
- Create: `projects/golden-path/apps/web/src/app/page.test.tsx`
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.ts`
- Create: `packages/ui/src/status-card.tsx`

**Interfaces:**
- Produces: one deployable Next.js application, Hono adapter, server-rendered status page, interactive typed demo form.
- Consumes: `app`, `createApiClient`, `database`, `clientEnv`, and shared UI.

- [x] **Step 1: Write the page behavior test**

Test that the heading explains the monorepo is ready, the page displays database/API status, and the interactive form contains an accessible name input and submit button.

- [x] **Step 2: Confirm the page test fails**

Run: `pnpm --filter @safrs/web test`
Expected: FAIL because the app does not exist.

- [x] **Step 3: Configure stable Next.js features**

Set `cacheComponents: true`, `typedRoutes: true`, and `reactCompiler: true` only when the resolved Active LTS build accepts the configuration. Keep the default Node.js runtime. Use Tailwind CSS 4 and no inline styles.

- [x] **Step 4: Mount Hono**

~~~ts
import { app } from "@safrs/api";
import { handle } from "hono/vercel";

export const runtime = "nodejs";
const handler = handle(app);
export { handler as DELETE, handler as GET, handler as PATCH, handler as POST, handler as PUT };
~~~

- [x] **Step 5: Implement server-first rendering**

The project begins as a complete SAFRS capsule with objective, owner, boundaries, non-goals, exact commands, runtime/data dependencies, sensitive surfaces, and links to canonical root policy. The page is a Server Component. It performs independent reads in parallel, uses Suspense for dynamic status, marks reusable public status reads with explicit cache policy, and passes only serializable values into `DemoForm`. The form is the smallest possible Client Component and uses the typed Hono client.

- [x] **Step 6: Add recovery UI and framework optimizations**

Use `next/font`, metadata, semantic HTML, visible focus styles, `loading.tsx` skeleton, Indonesian error recovery copy, and `not-found.tsx`. Do not add product-specific branding.

- [x] **Step 7: Verify the web application**

Run: `pnpm --filter @safrs/web test && pnpm --filter @safrs/web typecheck && pnpm --filter @safrs/web build`
Expected: PASS with no environment secret printed.

- [x] **Step 8: Commit the application**

~~~bash
git add projects/golden-path packages/ui pnpm-lock.yaml
git commit -m "feat: add Next.js golden-path application"
~~~

---

### Task 6: Build human-readable doctor, setup, and development startup

**Files:**
- Create: `tools/doctor/package.json`
- Create: `tools/doctor/src/checks.mjs`
- Create: `tools/doctor/src/messages.mjs`
- Create: `tools/doctor/src/cli.mjs`
- Create: `tools/doctor/test/checks.test.mjs`
- Create: `scripts/setup.mjs`
- Create: `scripts/dev.mjs`
- Create: `scripts/lib/process.mjs`
- Create: `scripts/lib/process.test.mjs`

**Interfaces:**
- Produces: `runDoctor(): Promise<DoctorReport>` and exit codes 0 healthy, 1 recoverable setup issue, 2 unsafe configuration.
- Consumes: Node, pnpm, Git, Docker, environment, database, and generated-client checks.

- [x] **Step 1: Write diagnostic tests**

~~~js
test("Docker installed but engine stopped has a human recovery message", async () => {
  const report = await runDoctor({
    command: fakeCommand({ dockerVersion: { exitCode: 1, stderr: "daemon is not running" } }),
  });
  assert.equal(report.ok, false);
  assert.match(report.human, /Buka Docker Desktop/);
  assert.match(report.human, /pnpm dev/);
});
~~~

Also test missing Node, missing environment file, unsafe production-like URL, healthy prerequisites, and secret redaction.

- [x] **Step 2: Confirm tests fail**

Run: `node --test tools/doctor/test/*.test.mjs scripts/lib/*.test.mjs`
Expected: FAIL because diagnostics are missing.

- [x] **Step 3: Implement read-only checks and redaction**

Every check returns `{ id, ok, severity, summary, recovery, technical }`. Redact URL passwords, tokens, keys, and environment values before rendering. The first output line uses `[AREA] SIAP`, `[AREA] BELUM SIAP`, or `[AREA] DITOLAK`.

- [x] **Step 4: Implement setup**

`setup.mjs` checks Node/Git/pnpm, creates `.env` from `.env.example` only if absent, runs `pnpm install --frozen-lockfile=false`, starts local PostgreSQL when Docker is available, generates Prisma Client, applies committed migrations, seeds deterministic data, and ends with `pnpm doctor`. It never overwrites an existing `.env`.

- [x] **Step 5: Implement single-command development**

`dev.mjs` runs doctor preflight, starts PostgreSQL, generates Prisma Client, then replaces itself with `pnpm turbo run dev --parallel`. A stopped Docker engine produces the exact recovery message without a raw stack trace.

- [x] **Step 6: Verify current-machine behavior**

With Docker stopped, run `pnpm doctor` and `pnpm dev`.
Expected: both identify the stopped engine correctly; `doctor` remains read-only.

Start Docker Desktop, then run `pnpm setup`.
Expected: database becomes healthy, generation/migration/seed succeed, and doctor reports healthy.

- [x] **Step 7: Commit operator tooling**

~~~bash
git add tools/doctor scripts/setup.mjs scripts/dev.mjs scripts/lib
git commit -m "feat: add human-readable setup and diagnostics"
~~~

---

### Task 7: Add the SAFRS project wizard

**Files:**
- Create: `tools/project-wizard/package.json`
- Create: `tools/project-wizard/src/model.mjs`
- Create: `tools/project-wizard/src/render.mjs`
- Create: `tools/project-wizard/src/cli.mjs`
- Create: `tools/project-wizard/test/model.test.mjs`
- Create: `tools/project-wizard/test/render.test.mjs`

**Interfaces:**
- Produces: `normalizeProjectAnswers(input)`, `renderProjectCapsule(model)`, preview/apply CLI.
- Consumes: `projects/_template` and SAFRS risk classification.

- [x] **Step 1: Write input and rendering tests**

Test slug normalization, rejection of path traversal, sensitive-domain risk elevation, complete capsule files, no unresolved template markers, and preview mode performing no writes.

- [x] **Step 2: Verify tests fail**

Run: `node --test tools/project-wizard/test/*.test.mjs`
Expected: FAIL because wizard functions do not exist.

- [x] **Step 3: Implement the product-language model**

The model contains `name`, `slug`, `problem`, `kind`, `capabilities`, `sensitiveDomains`, `risk`, and `appBinding`. Allowed kinds are `web`, `desktop`, and `extension`. Default risk is R1; healthcare, financial, government, auth, payments, migrations, or shared-package impact raises it to at least R2.

- [x] **Step 4: Implement preview-before-write**

The CLI asks one question at a time, prints exact destination files and risk, then requires the literal confirmation `CREATE <slug>`. Non-interactive tests use a JSON input file and `--preview` or `--apply`.

- [x] **Step 5: Verify a temporary capsule**

Run the wizard against a temporary repository directory with a web project named `Atlas Demo`.
Expected: a complete capsule passes `tools/safrs/check_topology.py` and does not modify the real `projects/` directory during preview.

- [x] **Step 6: Commit the wizard**

~~~bash
git add tools/project-wizard
git commit -m "feat: add SAFRS project creation wizard"
~~~

---

### Task 8: Add optional capability manifests and selector

**Files:**
- Create: `tools/capabilities/package.json`
- Create: `tools/capabilities/src/schema.mjs`
- Create: `tools/capabilities/src/catalog.mjs`
- Create: `tools/capabilities/src/cli.mjs`
- Create: `tools/capabilities/test/catalog.test.mjs`
- Create: `tools/capabilities/manifests/email.json`
- Create: `tools/capabilities/manifests/stripe.json`
- Create: `tools/capabilities/manifests/ai.json`
- Create: `tools/capabilities/manifests/electron.json`
- Create: `tools/capabilities/manifests/wxt.json`
- Create: `tools/capabilities/manifests/python.json`

**Interfaces:**
- Produces: `CapabilityManifest` validation and `pnpm capability:add` preview/selection.
- Consumes: project capsule `capabilities.json` and SAFRS risk rules.

- [x] **Step 1: Write catalog completeness tests**

For every manifest, require `id`, `label`, `description`, `risk`, `dependencies`, `environment`, `commands`, `tests`, `sensitivePaths`, `sideEffects`, and `removal`. Assert no optional runtime package is present in the root dependency graph.

- [x] **Step 2: Verify tests fail**

Run: `node --test tools/capabilities/test/*.test.mjs`
Expected: FAIL because the catalog is absent.

- [x] **Step 3: Implement manifests**

Email declares React Email/Resend and local recipient restrictions. Stripe declares CLI forwarding, signature verification, idempotency, and sandbox-only defaults. AI declares provider-neutral SDK boundary, Zod structured output, resource bounds, and test doubles. Electron, WXT, and Python declare their runtime boundaries and tests. Python requires a recorded technical justification.

- [x] **Step 4: Implement selector safety**

The selector previews dependencies, files, environment names, commands, and risk. It requires `ENABLE <capability> FOR <project>` before writing only the project's `capabilities.json`. Runtime integration remains a later project-scoped R2 task.

- [x] **Step 5: Verify absence and selection**

Run: `node --test tools/capabilities/test/*.test.mjs`
Expected: PASS and prove unselected packages are not installed.

- [x] **Step 6: Commit capability framework**

~~~bash
git add tools/capabilities
git commit -m "feat: add optional capability catalog"
~~~

---

### Task 9: Add fast local hygiene

**Files:**
- Create: `.husky/pre-commit`
- Modify: `package.json`
- Modify: `biome.jsonc`
- Create: `tests/repository/precommit.test.mjs`

**Interfaces:**
- Produces: staged-file-only Biome repair before commit and full CI check separately.
- Consumes: Biome VCS integration and Git index.

- [x] **Step 1: Write the hook contract test**

Assert that the hook rejects partially staged files with a human recovery message, invokes `pnpm exec biome check --write --staged --no-errors-on-unmatched` for fully staged files, re-stages only the previously staged path list, and does not run the full build.

- [x] **Step 2: Verify the test fails**

Run: `node --test tests/repository/precommit.test.mjs`
Expected: FAIL because the hook is absent.

- [x] **Step 3: Implement the hook**

Use Biome's native staged-file support. Before repair, compare working-tree and index path lists. If a path is both staged and unstaged, stop with an Indonesian message asking Chief to stage the complete file or commit its staged portion first. For fully staged files, capture the path list, repair, and re-stage only that list. Fail closed when Biome cannot safely complete.

- [x] **Step 4: Exercise the hook in a temporary Git repository**

Create a malformed staged TypeScript fixture, invoke the hook with the repository's Biome binary, and assert formatting is corrected and an unstaged unrelated file remains unstaged.

- [x] **Step 5: Commit hygiene**

~~~bash
git add .husky/pre-commit biome.jsonc package.json tests/repository/precommit.test.mjs
git commit -m "chore: add fast staged-file hygiene"
~~~

---

### Task 10: Add contract, integration, and browser verification

**Files:**
- Create: `tests/contracts/hono-rpc-contract.test.ts`
- Create: `tests/contracts/environment-boundary.test.ts`
- Create: `tests/integration/database.test.ts`
- Create: `projects/golden-path/apps/web/playwright.config.ts`
- Create: `projects/golden-path/apps/web/e2e/golden-path.spec.ts`
- Create: `vitest.workspace.ts`
- Modify: package test configurations where needed.

**Interfaces:**
- Produces: proof of inferred API types, environment failure, database behavior, and the human-visible golden journey.
- Consumes: all runtime packages and local PostgreSQL.

- [x] **Step 1: Write the RPC type proof**

Use `expectTypeOf` to prove the POST input is inferred from Zod through Hono and that the successful response contains `id`, `name`, and ISO `createdAt`. Add a `@ts-expect-error` call with an invalid field and require TypeScript to consume that expected error.

- [x] **Step 2: Write environment negative proof**

Spawn a clean Node process without `DATABASE_URL`, import the server environment entry, and assert a non-zero exit naming `DATABASE_URL` while excluding every supplied sentinel secret value.

- [x] **Step 3: Write database integration proof**

Seed, list, create, and remove a transaction inside the isolated `safrs_test` database. Never point the test at `safrs_local` or an external host.

- [x] **Step 4: Write Playwright golden path**

~~~ts
test("Chief can see health and create a demo record", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Monorepo siap/i })).toBeVisible();
  await page.getByLabel("Nama contoh").fill("Atlas");
  await page.getByRole("button", { name: "Simpan contoh" }).click();
  await expect(page.getByText("Atlas")).toBeVisible();
});
~~~

- [x] **Step 5: Run all test layers**

Run: `pnpm test`
Expected: unit, contract, and integration tests PASS.

Run: `pnpm test:e2e`
Expected: Playwright golden path PASS.

- [x] **Step 6: Demonstrate contract drift**

In a temporary worktree copy, rename `name` to `title` in the POST schema and run web type checking. Record the expected compile failure, then discard only the temporary copy. This evidence proves backend contract changes reach the frontend.

- [x] **Step 7: Commit tests**

~~~bash
git add tests projects/golden-path/apps/web/playwright.config.ts projects/golden-path/apps/web/e2e vitest.workspace.ts
git commit -m "test: prove golden-path behavior"
~~~

---

### Task 11: Add PR-only dependency automation and complete CI

**Files:**
- Create: `.github/renovate.json`
- Create: `.github/workflows/ci.yml`
- Create: `tests/repository/automation-policy.test.mjs`
- Modify: `.safrs/tool-inventory.json`
- Modify: `.safrs/sensitive-paths.json` only if new sensitive paths are not already covered.

**Interfaces:**
- Produces: non-deploying CI and Renovate pull requests without auto-merge.
- Consumes: every verification command and SAFRS immutable-action pinning.

- [x] **Step 1: Write automation policy tests**

Assert `automerge` is false, Dependency Dashboard is enabled, no workflow has `deploy` or write permissions, every action uses a 40-character SHA, and CI runs governance, install, lint, typecheck, tests, build, and browser smoke.

- [x] **Step 2: Verify tests fail**

Run: `node --test tests/repository/automation-policy.test.mjs`
Expected: FAIL because CI and Renovate files are absent.

- [x] **Step 3: Add Renovate PR-only configuration**

Use `$schema`, `extends: ["config:recommended"]`, `dependencyDashboard: true`, `automerge: false`, a controlled schedule, lockfile maintenance, stable-version rules, and separate major-update grouping.

- [x] **Step 4: Add immutable CI**

Use:

- `actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8`
- `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020`
- `pnpm/action-setup@7088e561eb65bb68695d245aa206f005ef30921d`
- `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02`

Run PostgreSQL as a service, use non-secret test environment values, install with `--frozen-lockfile`, and never deploy.

- [x] **Step 5: Update SAFRS inventories**

Register Docker Hub or package registries only where the existing tool inventory requires them. Do not broaden network scope beyond installation, local services, GitHub Actions, and documented optional tools.

- [x] **Step 6: Verify automation**

Run: `node --test tests/repository/automation-policy.test.mjs`
Run: `python tools/safrs/check_actions_pinning.py`
Run: `powershell -ExecutionPolicy Bypass -File scripts/safrs-verify.ps1`
Expected: PASS.

- [x] **Step 7: Commit automation**

~~~bash
git add .github/renovate.json .github/workflows/ci.yml tests/repository/automation-policy.test.mjs .safrs
git commit -m "ci: add PR-only updates and full verification"
~~~

---

### Task 12: Integrate agent context, lifecycle, prompt, and final evidence

**Files:**
- Modify: `AGENTS.md`
- Modify: `projects/golden-path/AGENTS.md`
- Create: `projects/golden-path/apps/web/AGENTS.md`
- Create: `packages/api/AGENTS.md`
- Create: `packages/database/AGENTS.md`
- Create: `tools/AGENTS.md`
- Modify: `README.md`
- Modify: `03_ARCHITECTURE.md`
- Modify: `08_DECISIONS.md` or create an accepted ADR under `docs/adrs/`
- Modify: `.safrs/document-registry.json`
- Modify: `.safrs/tool-inventory.json`
- Modify: `MANIFEST.txt`
- Regenerate: `SHA256SUMS.txt` according to its documented scope.
- Modify: `CODEX_IMPLEMENT_GOLDEN_PATH.md`
- Create: `docs/evidence/SAFRS_GOLDEN_PATH_VERIFICATION.md`
- Move after acceptance: `docs/plans/active/SAFRS_BOOTSTRAP_IMPLEMENTATION.md` to `docs/plans/completed/SAFRS_BOOTSTRAP_IMPLEMENTATION.md`

**Interfaces:**
- Produces: minimal AI routing, canonical architecture decision, reusable Codex prompt, final requirement-to-evidence matrix.
- Consumes: the complete implemented tree and actual command output.

- [x] **Step 1: Write routing tests before changing instructions**

Extend routing/topology tests to require nearest-agent files, exact project commands, no deprecated `.cursorrules`, and canonical links rather than duplicated SAFRS policy.

- [x] **Step 2: Verify routing tests fail**

Run: `python tools/safrs/check_routing.py && python tools/safrs/check_topology.py`
Expected: FAIL on newly required runtime routing until files are added.

- [x] **Step 3: Add focused agent instructions and canonical architecture**

Record the single-deployment Next.js/Hono decision, package boundaries, human-facing commands, optional capability rule, Active LTS policy, and R2/R3 boundaries. Keep root numeric documents in the root; project applications remain inside `projects/<project>/apps/*`, reusable capabilities in `packages/*`, and repository tooling in `tools/*`.

- [x] **Step 4: Create the reusable Codex prompt**

The prompt orders Codex to create/use a goal, read SAFRS in canonical order, read the approved spec and this plan, preserve uncommitted user work, classify each phase, use Sol Advisor only after its exact preflight passes, execute every task, rerun primary verification, request a fresh read-only final review, avoid commit/push/deploy without authorization beyond the plan, and produce exact evidence.

- [x] **Step 5: Run complete local verification**

Normalize the known Markdown hard-break trailing spaces inherited from the uncommitted bootstrap before regenerating checksums, so the complete first baseline passes Git whitespace validation.

Run:

~~~text
pnpm doctor
pnpm governance
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm check
git diff --check
~~~

Expected: every command PASS. `pnpm doctor` may report Docker stopped only before the documented recovery; final evidence requires a healthy rerun.

- [x] **Step 6: Perform requirement-by-requirement audit**

For every acceptance criterion in `docs/superpowers/specs/2026-08-10-solo-dev-golden-path-design.md`, record the proving file, command, exit status, and observation. Missing or indirect evidence remains incomplete.

- [x] **Step 7: Obtain independent review**

Use the exact Sol Advisor reviewer lane only after its preflight passes. The reviewer must inspect the actual diff and evidence without editing and return exactly `ship`, `fix-first`, or `rethink`. A `fix-first` or `rethink` verdict prevents completion.

- [x] **Step 8: Commit final integration**

~~~bash
git add AGENTS.md projects packages tools README.md 03_ARCHITECTURE.md 08_DECISIONS.md docs .safrs MANIFEST.txt SHA256SUMS.txt CODEX_IMPLEMENT_GOLDEN_PATH.md
git commit -m "docs: complete SAFRS golden-path integration"
~~~

- [x] **Step 9: Report without pushing**

Report goal, assumptions, exact commits and files, all verification results, achieved conformance, gaps, and next actions. Do not add a GitHub remote, push, create a PR, merge, or deploy unless Chief separately authorizes it.
