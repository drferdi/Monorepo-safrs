# Database and Monorepo 100% Ready — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current `main` checkout 100% ready to use as the SAFRS golden-path monorepo: every feature that exists on `main` must work end-to-end, every claimed status must match live evidence, and no half-implemented database/API/UI surface may remain.

**Architecture:** Close the gaps found in the 2026-08-16 database audit. Keep the golden-path stack (Next.js + Hono + Prisma 7 + local PostgreSQL 17 on `127.0.0.1:54329`). Do not invent Smartboard, auth, tenant/RLS, or a production deploy. Do not merge `feat/corpus-engine-poc` in this plan. Make corpus honesty explicit so the repo no longer pretends a second database product is live.

**Tech Stack:** PostgreSQL 17, Prisma 7 (`@prisma/adapter-pg`), Hono, Next.js App Router, Vitest, Playwright, Git LFS, GitHub Actions, pnpm 11.21.0, Node 24.18.

## Global Constraints

- Address the user as Chief in chat diagnostics. Repository files, identifiers, and commit messages stay in English.
- Risk: schema/migration/CI/shared-package work is **R2** and needs designated review. Do not execute R3. Do not use production credentials.
- Isolated worktree only: `git worktree add ../Monorepo.worktrees/fix-db-100-ready -b feat/database-100-ready`. Never create a worktree inside the repo root.
- Smallest viable change. No drive-by refactors. No new dependencies.
- Never print, commit, or copy `.env` values. Never run `pnpm db:reset` unless Chief types the exact local reset authorization for that command.
- Never `git add -A`. Stage explicit paths only.
- Line endings: CRLF on Windows-edited files. PowerShell for local commands.
- Evidence before assertions. Do not claim 100% ready without the final gate in Task 8.
- `pnpm db:migrate` is `prisma migrate deploy`, not `migrate dev`. Creating a migration requires the Prisma CLI with a disposable local `DATABASE_URL` already resolved.
- Docker Desktop must be running. The local database is `postgresql://127.0.0.1:54329/safrs_local` and must remain disposable (`_local` / `_test`, port `54329`, localhost only).

## Definition of 100% ready

This plan is done only when **all** of the following are true on the implementation worktree:

1. `pnpm doctor` reports every check SIAP, including Docker engine and PostgreSQL.
2. `pnpm db:migrate` reports no pending migrations.
3. Live `safrs_local` schema matches `packages/database/prisma/schema.prisma`.
4. Every Prisma model on `main` has a runtime consumer, or it has been removed by migration.
5. Golden-path page can create a demo **and** show the stored list from the same database.
6. `pnpm --filter @safrs/database test`, `pnpm --filter @safrs/api test`, `pnpm --filter @safrs/web test`, and `pnpm test` pass.
7. `pnpm test:e2e` passes **both** the functional spec and the visual spec.
8. The committed visual PNG is a real PNG, not a Git LFS pointer.
9. `.github/workflows/ci.yml` runs on `push` to `main` as well as pull requests.
10. Control Center, feature inventory, wiki, HANDOFF, and PROGRESS no longer claim a red CI browser-smoke on `main`, and no longer describe corpus/pgvector as a live `main` database.
11. `corpus_local` is not presented as a working corpus store. This plan does **not** merge Corpus Engine.

If any item is skipped, the repository is not 100% ready. Stop and report the blocker.

## Out of scope

Do **not** do these in this plan:

- Merge `feat/corpus-engine-poc`, add `pgvector`, or start `corpus-postgres` on `:54330`.
- Build Smartboard, tenant isolation, RLS, or authentication.
- Deploy to production or change R3 publisher workflows.
- Persist Stripe events to a new billing table. The webhook is acknowledgment-only.
- Copy secrets from `.env` into `.env.example`. Empty placeholders only.
- Drop the leftover empty `corpus_local` database unless Chief explicitly authorizes that one SQL action.

Corpus Engine has its own plan: `docs/superpowers/plans/2026-08-11-corpus-engine-poc.md`. This plan only makes `main` honest and usable.

## File map

| File | Responsibility |
| --- | --- |
| `packages/database/prisma/schema.prisma` | Product schema. After this plan: `Demo` only. |
| `packages/database/prisma/migrations/<timestamp>_align_demo_schema/migration.sql` | Drop unused `transaction_samples`, add UUID default + unique name. |
| `packages/database/src/seed.ts` | Seed one demo only. Remove transaction upsert and sequence SQL. |
| `packages/database/src/seed.integration.test.ts` | Assert seed no longer depends on `transaction_samples`. |
| `tests/integration/database.test.ts` | Same. |
| `packages/schemas/src/demo.ts` | Keep create/list contracts. |
| `packages/api/src/app.ts` | Keep `GET/POST /api/demos`. Order list by `createdAt` desc. |
| `projects/golden-path/apps/web/src/lib/server-data.ts` | Load demos for the page. |
| `projects/golden-path/apps/web/src/app/page.tsx` | Render the stored demo list. |
| `projects/golden-path/apps/web/src/components/demo-form.tsx` | Refresh the list after a successful save. |
| `projects/golden-path/apps/web/e2e/golden-path.spec.ts` | Assert the created row appears in the list. |
| `projects/golden-path/apps/web/e2e/screenshots/visual.spec.ts-snapshots/readiness-desk.png` | Real PNG baseline. |
| `tests/repository/lfs-snapshots.test.mjs` | Fail closed if the baseline is still an LFS pointer. |
| `.github/workflows/ci.yml` | Also run verify on `push` to `main`. |
| `projects/control-center/apps/web/src/lib/repo/catalog.ts` | Honest CI + corpus caveats. |
| `docs/feature-inventory.md`, `sentrawiki/packages/database.md`, `sentrawiki/packages/telemetry.md`, `sentrawiki/reference/dependencies.md` | Match the code. |
| `.env.example` | Complete non-secret template. |
| `.gitignore` | Ignore Next-generated `AGENTS.md` / `CLAUDE.md` under app dirs. |
| `.agents/HANDOFF.md`, `.agents/PROGRESS.md` | Current state after the work. |

---

### Task 1: Worktree and live baseline

**Files:**
- None yet. This task only prepares the isolated tree and records the starting evidence.

**Interfaces:**
- Consumes: current `origin/main`
- Produces: worktree `../Monorepo.worktrees/fix-db-100-ready` on branch `feat/database-100-ready`

- [ ] **Step 1: Confirm the main checkout is not the mutation tree**

Run from `D:\DEV\Monorepo`:

```powershell
git rev-parse --abbrev-ref HEAD
git status --short
```

Expected: note the current branch. Do not mutate this checkout if Chief asked Claude to implement. Create the sibling worktree.

- [ ] **Step 2: Create the isolated worktree**

```powershell
git fetch origin
git worktree add D:\DEV\Monorepo.worktrees\fix-db-100-ready -b feat/database-100-ready origin/main
```

Expected: new worktree, clean, on `feat/database-100-ready`.

- [ ] **Step 3: Prove Docker and Postgres are up in that worktree**

```powershell
Set-Location D:\DEV\Monorepo.worktrees\fix-db-100-ready
pnpm db:start
node tools/doctor/src/cli.mjs
pnpm db:migrate
```

Expected: doctor all SIAP; migrate says no pending migrations **before** Task 4. If Docker is down, stop. Do not continue.

- [ ] **Step 4: Record the starting live census without printing secrets**

```powershell
docker compose exec -T postgres psql -U safrs -d safrs_local -c "SELECT COUNT(*) FROM demos;"
docker compose exec -T postgres psql -U safrs -d safrs_local -c "SELECT COUNT(*) FROM transaction_samples;"
docker compose exec -T postgres psql -U safrs -d corpus_local -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema');"
```

Expected starting evidence from the 2026-08-16 audit: 1 demo, 1 transaction sample, `corpus_local` has no user tables. Do not drop data here.

---

### Task 2: Make the visual e2e baseline a real PNG

**Files:**
- Modify: `projects/golden-path/apps/web/e2e/screenshots/visual.spec.ts-snapshots/readiness-desk.png`
- Create: `tests/repository/lfs-snapshots.test.mjs`
- Test: `tests/repository/lfs-snapshots.test.mjs`, `pnpm test:e2e`

**Interfaces:**
- Consumes: Git LFS object `sha256:a9da5bdf81a4dc744af672b69ea2abba24cbb1249b68bbd6e6dad45fcd7394c2`
- Produces: working-tree file that starts with PNG magic bytes `89 50 4E 47`

- [ ] **Step 1: Write the failing pointer-guard test**

Create `tests/repository/lfs-snapshots.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("Playwright visual baselines are real PNG files, not Git LFS pointers", () => {
  const snapshot = join(
    "projects",
    "golden-path",
    "apps",
    "web",
    "e2e",
    "screenshots",
    "visual.spec.ts-snapshots",
    "readiness-desk.png",
  );
  const bytes = readFileSync(snapshot);
  const head = bytes.subarray(0, 8).toString("hex");
  const asText = bytes.subarray(0, 40).toString("utf8");

  assert.notEqual(
    asText.startsWith("version https://git-lfs.github.com/spec/v1"),
    true,
    "readiness-desk.png is still a Git LFS pointer. Run git lfs pull and git lfs checkout.",
  );
  assert.equal(head, "89504e470d0a1a0a");
  assert.ok(bytes.length > 1024);
});
```

- [ ] **Step 2: Run the test and confirm it fails on a pointer**

```powershell
node --test tests/repository/lfs-snapshots.test.mjs
```

Expected: FAIL with the LFS pointer message if the working tree still has the 130-byte pointer.

- [ ] **Step 3: Materialize the LFS object**

```powershell
git lfs install
git lfs pull
git lfs checkout -- projects/golden-path/apps/web/e2e/screenshots/visual.spec.ts-snapshots/readiness-desk.png
```

Expected: file length about 86303 bytes, not 130. First bytes are PNG, not `version https://git-lfs`.

If `git lfs pull` fails on auth, stop and report **Blocked**. Do not regenerate a new baseline unless LFS cannot fetch the committed object and Chief authorizes `--update-snapshots`.

- [ ] **Step 4: Re-run the pointer-guard test**

```powershell
node --test tests/repository/lfs-snapshots.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Re-run only the visual e2e after a disposable DB is available**

Do this after Task 3 if the page markup will change. If Task 3 has not started, skip visual e2e until the list UI lands, then refresh the baseline **only if** the committed PNG no longer matches the new ready-state markup.

- [ ] **Step 6: Commit**

```powershell
git add tests/repository/lfs-snapshots.test.mjs
git commit -m "test: reject Git LFS pointers as Playwright PNG baselines"
```

Do not commit the smudged PNG unless `git status` shows it as a real content change. If it is already the same LFS object, the working tree fix is local and the test is the durable guard.

---

### Task 3: Close the demo loop on the golden-path page

**Files:**
- Modify: `projects/golden-path/apps/web/src/lib/server-data.ts`
- Modify: `projects/golden-path/apps/web/src/app/page.tsx`
- Modify: `projects/golden-path/apps/web/src/app/page.test.tsx`
- Modify: `projects/golden-path/apps/web/src/components/demo-form.tsx`
- Modify: `packages/api/src/app.ts`
- Modify: `packages/api/src/app.test.ts`
- Modify: `projects/golden-path/apps/web/e2e/golden-path.spec.ts`
- Test: `pnpm --filter @safrs/api test`, `pnpm --filter @safrs/web test`

**Interfaces:**
- Consumes: `database.demo.findMany`, `GET /api/demos`, `POST /api/demos`
- Produces: `readDemos(): Promise<DemoView[]>` where `DemoView = { id: string; name: string; createdAt: string }`

- [ ] **Step 1: Write the failing page test**

In `projects/golden-path/apps/web/src/app/page.test.tsx`, extend `ReadinessDesk` so it accepts `demos` and assert the names render:

```tsx
createElement(ReadinessDesk, {
  readiness: {
    api: { detail: "Endpoint Hono merespons.", state: "ready" },
    database: { detail: "PostgreSQL dapat dijangkau.", state: "ready" },
  },
  demos: [
    {
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000001",
      name: "Sentra Demo",
    },
  ],
})
```

Assert `markup` contains `Sentra Demo` and a list labelled for stored examples, for example `aria-label="Contoh tersimpan"`.

- [ ] **Step 2: Run the page test and confirm it fails**

```powershell
pnpm --filter @safrs/web test -- src/app/page.test.tsx
```

Expected: FAIL because `ReadinessDesk` does not take `demos` and the markup has no stored-example list.

- [ ] **Step 3: Load demos on the server**

Add to `projects/golden-path/apps/web/src/lib/server-data.ts`:

```ts
export type DemoView = {
  createdAt: string;
  id: string;
  name: string;
};

export async function readDemos(): Promise<DemoView[]> {
  try {
    const { database } = await import("@safrs/database");
    const rows = await database.demo.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return rows.map((demo) => ({
      createdAt: demo.createdAt.toISOString(),
      id: demo.id,
      name: demo.name,
    }));
  } catch {
    return [];
  }
}
```

Keep `getReadiness()` unchanged.

- [ ] **Step 4: Render the list and refresh after save**

Update `ReadinessDesk` to take `demos: DemoView[]` and render an `<ul aria-label="Contoh tersimpan">` under the form.

Update `DynamicReadinessDesk`:

```ts
const [readiness, demos] = await Promise.all([getReadiness(), readDemos()]);
return <ReadinessDesk demos={demos} readiness={readiness} />;
```

In `demo-form.tsx`, after a successful `submitDemo`, call `router.refresh()` from `next/navigation` so the server list updates.

- [ ] **Step 5: Make API list order deterministic**

In `packages/api/src/app.ts`, change the list handler to:

```ts
const demos = await store.demo.findMany({
  orderBy: { createdAt: "desc" },
});
```

Update `DemoStore` so `findMany` accepts the same optional Prisma args the default client already supports, or keep the injected test store compatible:

```ts
findMany: (args?: { orderBy?: { createdAt: "desc" } }) => Promise<DemoRecord[]>;
```

Update `packages/api/src/app.test.ts` fakes to ignore unused args.

- [ ] **Step 6: Extend the functional e2e**

In `golden-path.spec.ts`, after the success toast, also assert:

```ts
await expect(page.getByRole("list", { name: "Contoh tersimpan" })).toContainText(name);
```

- [ ] **Step 7: Run the targeted tests**

```powershell
pnpm --filter @safrs/api test
pnpm --filter @safrs/web test
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add packages/api/src/app.ts packages/api/src/app.test.ts projects/golden-path/apps/web/src/lib/server-data.ts projects/golden-path/apps/web/src/app/page.tsx projects/golden-path/apps/web/src/app/page.test.tsx projects/golden-path/apps/web/src/components/demo-form.tsx projects/golden-path/apps/web/e2e/golden-path.spec.ts
git commit -m "feat(web): show stored demos from PostgreSQL on the readiness desk"
```

---

### Task 4: Remove the unused TransactionSample surface

**Files:**
- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/<timestamp>_align_demo_schema/migration.sql`
- Modify: `packages/database/src/seed.ts`
- Modify: `packages/database/src/seed.integration.test.ts`
- Modify: `tests/integration/database.test.ts`
- Modify: `sentrawiki/packages/database.md`
- Test: `pnpm --filter @safrs/database test`, `DATABASE_INTEGRATION_TESTS=1 pnpm exec vitest run tests/integration/database.test.ts`

**Interfaces:**
- Consumes: current `Demo` / `TransactionSample` schema
- Produces: `Demo` only, with DB-level UUID default and unique `name`

This task is **R2**. State that in the PR.

- [ ] **Step 1: Write the failing integration expectation**

In `tests/integration/database.test.ts`, replace the transaction insert/delete block with:

```ts
const uniqueName = `Contract Demo ${randomUUID()}`;
await database.query(
  "INSERT INTO demos (name) VALUES ($1) RETURNING id",
  [uniqueName],
);
const created = await database.query<{ id: string; name: string }>(
  "SELECT id, name FROM demos WHERE name = $1",
  [uniqueName],
);
expect(created.rows[0]?.name).toBe(uniqueName);
expect(created.rows[0]?.id).toMatch(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
);
await database.query("DELETE FROM demos WHERE name = $1", [uniqueName]);
```

Remove all `transaction_samples` SQL from this file and from `packages/database/src/seed.integration.test.ts`. Change the seed-sequence test to assert repeated seeds leave a single demo row:

```ts
runDatabaseCommand("seed");
runDatabaseCommand("seed");
const result = await connection.query<{ count: number }>(
  "SELECT COUNT(*)::int AS count FROM demos",
);
expect(result.rows[0]?.count).toBe(1);
```

- [ ] **Step 2: Run the integration file and confirm it fails against the old schema**

```powershell
$env:DATABASE_INTEGRATION_TESTS = "1"
pnpm exec vitest run tests/integration/database.test.ts
```

Expected: FAIL because `INSERT INTO demos (name)` has no default for `id`.

- [ ] **Step 3: Edit the Prisma schema**

Replace `packages/database/prisma/schema.prisma` with:

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "esm"
  engineType   = "client"
}

datasource db {
  provider = "postgresql"
}

model Demo {
  id        String   @id @default(uuid()) @db.Uuid
  name      String   @unique
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(3)

  @@map("demos")
}
```

- [ ] **Step 4: Create the migration against the disposable local database**

From `packages/database`, using the already-validated local URL from the worktree `.env` (do not print it):

```powershell
Set-Location D:\DEV\Monorepo.worktrees\fix-db-100-ready
pnpm db:generate
Set-Location packages/database
# DATABASE_URL must already be the disposable local URL from the worktree environment.
pnpm exec prisma migrate dev --name align_demo_schema --skip-seed
```

If `migrate dev` refuses because the wrapper is deploy-only, keep `DATABASE_URL` in the child environment and call `pnpm exec prisma migrate dev --name align_demo_schema --skip-seed` from `packages/database`. Do not point this at anything except `127.0.0.1:54329` `*_local` or a disposable `*_test`.

Hand-edit the generated SQL if Prisma does not emit all three changes. The SQL must include:

```sql
ALTER TABLE "transaction_samples" DROP CONSTRAINT IF EXISTS "transaction_samples_demo_id_fkey";
DROP TABLE IF EXISTS "transaction_samples";
DROP SEQUENCE IF EXISTS "transaction_samples_id_seq";
ALTER TABLE "demos" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS "demos_name_key" ON "demos"("name");
```

- [ ] **Step 5: Validate the migration SQL**

```powershell
node .agents/skills/prisma-migration/scripts/validate-migration.mjs packages/database/prisma/migrations/<the_new_dir>
```

Expected: conventions OK. No `DROP DATABASE` / `TRUNCATE`.

- [ ] **Step 6: Slim the seed**

`packages/database/src/seed.ts` must only upsert the demo and disconnect. Delete `transaction`, `transactionSequenceSyncQuery`, and `$executeRawUnsafe`.

- [ ] **Step 7: Run database tests**

```powershell
$env:DATABASE_INTEGRATION_TESTS = "1"
pnpm --filter @safrs/database test
pnpm exec vitest run tests/integration/database.test.ts
pnpm --filter @safrs/database typecheck
```

Expected: PASS. Repeated seed leaves one demo. Inserts without an explicit id succeed.

- [ ] **Step 8: Commit**

```powershell
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations packages/database/src/seed.ts packages/database/src/seed.integration.test.ts tests/integration/database.test.ts sentrawiki/packages/database.md
git commit -m "fix(database): drop unused transaction_samples and align Demo defaults"
```

---

### Task 5: Make CI protect `main` and stop lying about a red browser-smoke

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `tests/repository/automation-policy.test.mjs`
- Modify: `projects/control-center/apps/web/src/lib/repo/catalog.ts`
- Modify: `docs/feature-inventory.md`
- Modify: `.agents/PROGRESS.md`
- Test: `node --test tests/repository/automation-policy.test.mjs`, `pnpm --filter @sentra/control-center test`

**Interfaces:**
- Consumes: current `ci.yml` `on: pull_request + workflow_dispatch`
- Produces: `on.push.branches = [main]` and honest catalog copy

- [ ] **Step 1: Write the failing workflow assertion**

In `tests/repository/automation-policy.test.mjs`, inside `CI proves the full safe verification path without deployment`, add:

```javascript
assert.match(workflow, /^on:\s*$/mu);
assert.match(workflow, /push:\s*\n\s*branches:\s*\[main\]/u);
```

- [ ] **Step 2: Run the test and confirm it fails**

```powershell
node --test tests/repository/automation-policy.test.mjs
```

Expected: FAIL on the new `push: branches: [main]` assertion.

- [ ] **Step 3: Update the workflow**

Change the top of `.github/workflows/ci.yml` to:

```yaml
on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:
```

Do not add deploy steps. Do not broaden permissions.

- [ ] **Step 4: Replace stale CI copy**

In `projects/control-center/apps/web/src/lib/repo/catalog.ts`, replace the `ci-workflows` caveat with:

```ts
caveat:
  "Alur `ci.yml` memverifikasi pull request dan push ke `main`. Ia membutuhkan Git LFS untuk snapshot visual dan PostgreSQL disposable di port 54329. Ia tidak men-deploy produksi.",
```

In `docs/feature-inventory.md`, replace the `ci.yml` status cell that says `RED on main` with a status that matches live evidence: shipped, required on PR + push `main`, depends on LFS + Postgres service.

Remove the PROGRESS bullet that says CI verify is red on `main` at browser-smoke if that line is still present.

- [ ] **Step 5: Run the tests**

```powershell
node --test tests/repository/automation-policy.test.mjs
pnpm --filter @sentra/control-center test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add .github/workflows/ci.yml tests/repository/automation-policy.test.mjs projects/control-center/apps/web/src/lib/repo/catalog.ts docs/feature-inventory.md .agents/PROGRESS.md
git commit -m "fix(ci): run verify on push to main and correct stale red-smoke copy"
```

---

### Task 6: Make corpus and telemetry claims honest

**Files:**
- Modify: `projects/control-center/apps/web/src/lib/repo/catalog.ts` if it still implies a live pgvector store on `main`
- Modify: `docs/feature-inventory.md` corpus row
- Modify: `sentrawiki/packages/telemetry.md`
- Modify: `sentrawiki/reference/dependencies.md`
- Modify: `sentrawiki/packages/database.md`
- Test: `pnpm --filter @sentra/control-center test`

**Interfaces:**
- Consumes: live facts from the 2026-08-16 audit
- Produces: docs that match `main`

Required facts to write, verbatim in meaning:

- Corpus Engine code lives on `feat/corpus-engine-poc`, not on `main`.
- `database/` on disk is a gitignored file corpus, not a Prisma schema.
- `corpus_local` on the shared `:54329` instance is an empty leftover database: no `vector` extension, no `corpus_engine` schema, no tables.
- `@safrs/database` does **not** depend on `@safrs/schemas`.
- `PrismaInstrumentation` is started from `@safrs/telemetry` via `projects/golden-path/apps/web/src/instrumentation.ts`, not from `packages/database/src/client.ts`.

- [ ] **Step 1: Patch the wiki and inventory sentences that contradict those facts**

Do not add new architecture. Delete or rewrite the false sentences.

- [ ] **Step 2: Run control-center tests**

```powershell
pnpm --filter @sentra/control-center test
```

Expected: PASS, including the honest `readyToUse = null` cases.

- [ ] **Step 3: Commit**

```powershell
git add docs/feature-inventory.md sentrawiki/packages/telemetry.md sentrawiki/reference/dependencies.md sentrawiki/packages/database.md projects/control-center/apps/web/src/lib/repo/catalog.ts
git commit -m "docs: stop claiming a live corpus database or Prisma schema dependency that does not exist"
```

---

### Task 7: Operator hygiene that blocks false-ready checkouts

**Files:**
- Modify: `.gitignore`
- Modify: `.env.example`
- Modify: `.agents/HANDOFF.md`

**Interfaces:**
- Consumes: current ignored-file gaps
- Produces: Next-generated capsule files ignored; env template complete without secrets

- [ ] **Step 1: Ignore Next-generated agent files**

Append to `.gitignore`:

```
# Next.js dev-server generated local agent files
projects/*/apps/*/AGENTS.md
projects/*/apps/*/CLAUDE.md
```

Do not ignore the checked-in capsule `projects/golden-path/AGENTS.md` or `projects/control-center/AGENTS.md`.

- [ ] **Step 2: Complete `.env.example` with empty placeholders only**

Keep the existing local database values. Add empty capability placeholders that the activated packs already mention, nothing else:

```
DATABASE_URL=postgresql://safrs:safrs@127.0.0.1:54329/safrs_local
APP_URL=http://localhost:3000
NODE_ENV=development

# Capability: email
EMAIL_FROM=dev@localhost
RESEND_API_KEY=

# Capability: stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Optional telemetry
OTEL_SDK_DISABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=
```

Never copy keys from `.env`.

- [ ] **Step 3: Overwrite `.agents/HANDOFF.md`**

Write current state: this plan, the worktree/branch, what remains (Corpus Engine still unmerged, Stripe acknowledgment-only, no production). Keep it under ~1k tokens.

- [ ] **Step 4: Commit**

```powershell
git add .gitignore .env.example .agents/HANDOFF.md
git commit -m "chore: ignore Next-generated agent files and complete the env template"
```

---

### Task 8: Final 100% ready gate

**Files:**
- Modify: `.agents/HANDOFF.md` with the verification evidence

- [ ] **Step 1: Refresh the visual baseline only if Task 3 changed the ready-state pixels**

```powershell
$env:DATABASE_INTEGRATION_TESTS = "1"
pnpm test:e2e
```

If visual e2e fails with a real PNG mismatch (not a decode error), regenerate **only** `readiness-desk.png`:

```powershell
pnpm --filter @safrs/web exec playwright test e2e/visual.spec.ts --update-snapshots
```

Then commit that PNG through Git LFS.

If it fails with `Could not decode expected image as PNG`, Task 2 is not done. Stop.

- [ ] **Step 2: Run the full local gate**

```powershell
node tools/doctor/src/cli.mjs
pnpm db:migrate
node --test tests/repository/lfs-snapshots.test.mjs
pnpm --filter @safrs/database test
pnpm --filter @safrs/api test
pnpm --filter @safrs/web test
pnpm test
pnpm test:e2e
pnpm lint
pnpm typecheck
pnpm governance
```

Expected: every command exit 0. Doctor all SIAP. E2E: functional + visual pass. `safrs_local` still contains the seed demo and no leftover `audit-live-*` / `Atlas E2E *` rows.

- [ ] **Step 3: Confirm the live schema**

```powershell
docker compose exec -T postgres psql -U safrs -d safrs_local -c "\d+ demos"
docker compose exec -T postgres psql -U safrs -d safrs_local -c "SELECT relname FROM pg_class WHERE relname LIKE 'transaction%';"
```

Expected: `demos.id` has `DEFAULT gen_random_uuid()`; unique index on `name`; no `transaction_samples` table.

- [ ] **Step 4: Report done only with evidence**

The handoff to Chief must include:

- changed files
- test command tails
- commit hashes
- doctor result
- e2e result (2 passed, 0 failed)

If any command failed, the answer is **NOT READY**, not a partial success story.

---

## Reviewer checklist

- [ ] No production URL, no `db:reset` against a non-disposable database
- [ ] No Corpus Engine merge hidden inside this PR
- [ ] No unused Prisma model left on `main`
- [ ] Visual snapshot is a PNG, not an LFS pointer
- [ ] CI runs on `push` to `main`
- [ ] Catalog/inventory/wiki match the code
- [ ] HANDOFF overwritten
- [ ] Explicit paths staged, never `git add -A`

