# Kediri — A Living Civilization · Capsule Router

## Inheritance

Read the repository root [`AGENTS.md`](../../../AGENTS.md), [`SAFRS_SPEC.md`](../../../SAFRS_SPEC.md),
and [`SECURITY.md`](../../../SECURITY.md) first; they remain canonical while this capsule is
developed inside the Monorepo. This file narrows capsule-local context and never weakens root
SAFRS or security controls.

This capsule is a **sovereign product capsule**: operationally independent, governed by the same
Sentra standards. Root governance, authoring standards, and contribution verifiers apply during
development; none of them is a runtime, build, test, or deploy dependency.

## Objective and ownership

- Project: `Kediri — A Living Civilization` (domain: `product`)
- Objective: official-grade cinematic historical web experience for Pemerintah Kota Kediri,
  built as a historically governed public digital institution — every public claim traceable to
  an approved `EvidenceClaim`.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: `R2` (domain `product`); public release and licence changes are `R3`.

## Authority order

1. Explicit current instruction from Chief.
2. Root SAFRS mandatory controls and repository governance.
3. [`docs/ARCHITECTURE_LOCK.md`](docs/ARCHITECTURE_LOCK.md) and the approved Bibles.
4. [`docs/implementation/MASTER_IMPLEMENTATION_PLAN.md`](docs/implementation/MASTER_IMPLEMENTATION_PLAN.md)
   for execution order and Definition of Done.
5. This router, then task-specific documentation.

Start every substantial task at [`00_READ_FIRST.md`](00_READ_FIRST.md), which defines the canonical
read order and the hierarchy used when two documents appear to conflict.

## Required context

1. [`.agents/HANDOFF.md`](.agents/HANDOFF.md) — keadaan sesi berjalan; baca lebih dulu
2. [`00_READ_FIRST.md`](00_READ_FIRST.md)
3. [`README.md`](README.md)
4. [`docs/architecture.md`](docs/architecture.md)
5. [`docs/data.md`](docs/data.md)
6. [`docs/testing.md`](docs/testing.md)

## Capsule memory

[`.agents/`](.agents/README.md) menyimpan memori proyek: keadaan sesi
([`HANDOFF.md`](.agents/HANDOFF.md)), pagar yang mengikat termasuk keputusan Chief G01–G05
([`BOUNDARIES.md`](.agents/BOUNDARIES.md)), papan fase kanonik
([`PROGRESS.md`](.agents/PROGRESS.md)), keputusan durable
([`DECISIONS.md`](.agents/DECISIONS.md)), dan pengetahuan yang tidak hidup di `docs/`
([`knowledge/`](.agents/knowledge/)) — invarian integritas historis, kontrak motion, lingkungan
lokal, dan jebakan yang sudah benar-benar menggigit.

Ia mengikuti bentuk `.agents/` di root Monorepo tetapi cakupannya hanya Kediri. Ia **tidak**
memuat skill: standar authoring tetap milik root dan bukan dependensi capsule (G04).

## Owned scope

- `projects/product/kediri-history/**` and all descendants.
- Declared external dependencies only. No parent package, no root workspace package, no other capsule.

## Standalone contract

Lifecycle commands run from this capsule root, never from the Monorepo root. The full executable
contract lives in [`project.contract.json`](project.contract.json).

| Stage | Command (from capsule root) |
| --- | --- |
| Install | `pnpm install` |
| Lint | `pnpm run lint` |
| Typecheck | `pnpm run typecheck` |
| Test | `pnpm run test` |
| Build | `pnpm run build` |
| Run | `node scripts/serve.mjs` (127.0.0.1:4320) |
| Deploy dry-run | `node scripts/deploy-dry-run.mjs` |

Basis data dan konten:

| Perintah | Fungsi |
| --- | --- |
| `docker compose -f infra/docker-compose.yml up -d` | PostgreSQL 18 dan MinIO milik capsule |

Nilai lokal yang cocok dengan compose di atas — salin ke `apps/web/.env.local`. Ini kredensial
pengembangan, bukan rahasia produksi:

```
DATABASE_URL=postgresql://kediri:kediri@127.0.0.1:54330/kediri_history_dev
S3_ENDPOINT=http://127.0.0.1:9010
S3_ACCESS_KEY_ID=kediri
S3_SECRET_ACCESS_KEY=kediri-local-dev
S3_PUBLIC_BUCKET=kediri-public
S3_PRIVATE_BUCKET=kediri-private
```

Turunkan dengan `docker compose -f infra/docker-compose.yml down`; tambahkan `-v` hanya bila
memang ingin membuang data semai.

| `pnpm run db:migrate` | Menjalankan migrasi Payload. Skema dikelola migrasi, bukan push otomatis. |
| `pnpm run db:seed` | Menanam irisan vertikal yang sudah ditinjau. Tidak pernah mengimpor korpus riset. |
| `pnpm run cms:types` | Regenerasi `payload-types.ts` |
| `pnpm run verify:production` | Gerbang integritas historis terhadap data nyata. Kegagalan kritis memblokir rilis. |
| `pnpm run test:e2e` | Bukti browser, desktop dan mobile |
| `pnpm run verify` | Rantai lengkap: lint, typecheck, test, build, verify:production |

Repository-integration verification, run **from the Monorepo root** and never a capsule
prerequisite:

- `node scripts/safrs-verify.mjs`
- `node tools/project-standalone/src/cli.mjs verify product/kediri-history` — the capsule tree
  must be clean of build artifacts first (`rm -rf apps/web/.next`). The verifier rescans the whole
  tree for symlinks after every lifecycle stage, and a Turbopack **dev** server leaves symlinks
  under `.next/node_modules/`.

The production build runs `next build --webpack`, not the Next 16 default Turbopack build. This is
a correctness requirement, not a preference: the Turbopack build externalises transitive server
packages by writing symlinks into `.next/node_modules/`, and the standalone verifier rejects every
symlink in the capsule tree. The webpack build produces an identical route set with zero symlinks.
`pnpm run dev` keeps the faster default.

Local verification needs the environment contract satisfied. Copy `.env.example` to
`apps/web/.env.local` (untracked) and fill in local values; production-critical variables fail fast
when missing, by design.

This capsule MUST NOT consume the root workspace, catalog, lockfile, configuration, paths,
scripts, tools, source packages, or monorepo-owned runtime infrastructure. If this directory is
extracted into its own repository, all seven lifecycle stages above must still run.

`nodeLinker: hoisted` in [`pnpm-workspace.yaml`](pnpm-workspace.yaml) is a correctness requirement,
not a preference: the standalone verifier rejects every symbolic link in the capsule tree.

## Historical integrity — non-negotiable

Copied from `MASTER_IMPLEMENTATION_PLAN.md` §14 and binding on every agent touching this capsule.

- **History must never live inside animation code.** The layering is
  `Historical Truth → Editorial Narrative → Experience Model → Motion Choreography → Presentation`.
- Do not move historical facts into React, GSAP, CSS, scene constants, or choreography configuration.
- Do not auto-publish imported research. `research/original/` is a preserved corpus, never
  production truth; it enters the system only as draft records requiring historical review.
- Do not invent missing historical information, and do not silently reconcile conflicting evidence.
- Do not present folklore as historical fact, or reconstruction as documentary evidence.
- Do not bypass `EvidenceClaim` → `EvidenceLink` → `Source`.
- Do not expose private media masters or rights documents.
- Do not make animation necessary to understand the historical narrative.
- Do not replace the approved architecture, and do not rewrite a Bible because an alternative
  seems cleaner. When implementation conflicts with the canon, stop the conflicting change and
  surface the conflict for Chief.

## Architecture module boundaries

Chief decision G03 (2026-08-26) replaces the originally planned physical workspace packages with
strictly separated source modules under `apps/web/src/modules/`. Physical packaging adapted;
architectural responsibility did not collapse. The rules are mechanically enforced by
`apps/web/tests/architecture/module-boundaries.test.ts`.

| Module | May depend on | Must never depend on |
| --- | --- | --- |
| `historical-domain/` | Zod, own module | React, Next.js, Payload, GSAP, database/CMS code |
| `content-validation/` | Zod, `historical-domain` | React, Next.js, GSAP, Payload, database code |
| `design-system/` | React, own tokens | Kediri-specific historical entities, `historical-domain`, `content-validation`, Payload, database |
| `motion/` | GSAP, `@gsap/react`, React | Payload, CMS queries, database, research corpus, historical truth, `content-validation` |

Application code (`src/app`, `src/components`, `src/content`) composes these modules; the modules
never reach back into the application.

## Motion standard

`.agents/skills/sentra-gsap/SKILL.md` at the Monorepo root is the canonical GSAP standard
(Chief decision G04). While developing inside the Monorepo, read and obey it. It is **not** a
capsule dependency: not a runtime import, not a symlink, not an npm or file dependency, and not
duplicated as a Kediri-specific skill. The extracted capsule runs without it.
`resources/sentra-gsap-monorepo-standard-v1.0.0/` is a preserved reference snapshot, not an
installation source. Sentra-GSAP verification is a root-level contribution gate run against
this capsule's source.

## Design tokens

Every rendered surface uses the capsule-local token snapshot in
`apps/web/src/modules/design-system/tokens/`, which carries its provenance. Raw colour and radius
values are permitted only inside that directory; `scripts/check-tokens.mjs` enforces this and runs
as part of `pnpm run test`.

## Sensitive surfaces and prohibited actions

- Private media masters, rights documents, and unpublished research media are never publicly
  readable and never committed to this repository.
- `PAYLOAD_SECRET`, `PREVIEW_SECRET`, `DATABASE_URL`, and object-storage credentials live only in
  untracked environment files. `.env.example` carries names, never values.
- Do not create or activate any remote, deployment target, or external integration without
  explicit Chief authorization (Chief decision G02).
- Do not modify other projects or shared packages; record any scope expansion.
- Do not use production credentials or production data.
- Do not weaken tests, token gates, boundary tests, or historical-integrity validation to make a
  task pass.
