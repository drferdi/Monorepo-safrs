# Testing

Required layers come from [`bibles/06-master-technical-architecture-content-data-model-bible.md`](bibles/06-master-technical-architecture-content-data-model-bible.md)
section 42 and the phase Definitions of Done in
[`implementation/MASTER_IMPLEMENTATION_PLAN.md`](implementation/MASTER_IMPLEMENTATION_PLAN.md).

## Layers

| Layer | Proves | Phase |
| --- | --- | --- |
| Architecture-boundary tests | module dependency rules hold mechanically | **1** |
| Environment-contract tests | required variables validated, production-critical values fail fast | **1** |
| Token gate | no raw colour or radius value outside the token snapshot | **1** |
| Historical-integrity validation | folklore is not badged as fact, no draft claim is public, no unknown choreography key, no rights-invalid public media | stub in **1**, rules in 6 |
| Schema tests | domain enums, chronology precision, invalid values rejected | 3 |
| Relationship tests | entity relations resolve, no broken references | 5 |
| Content-contract tests | public DTOs never leak internal notes, private media, or rights data | 6 |
| Semantic render tests | a scene renders complete history without motion | 10 |
| Route and deep-link tests | anchors, Back and Forward restoration, Journey to Archive context | 11 |
| Motion lifecycle tests | timelines and ScrollTriggers build, resize, and clean up with no orphans | 12 |
| Accessibility tests | WCAG 2.2 AA target, zero critical or serious automated violations | 18 |

## Commands

From the capsule root:

```
pnpm run lint        # Biome
pnpm run typecheck   # TypeScript, per unit
pnpm run test        # Vitest, token gate, historical-integrity validation
pnpm run test:e2e    # Playwright
pnpm run build       # production build
```

Local verification needs `apps/web/.env.local` (untracked) filled in from `.env.example`.
Production-critical variables fail fast when missing, by design.

Repository-integration gates, run from the Monorepo root and never a capsule prerequisite:

```
node scripts/safrs-verify.mjs
rm -rf projects/product/kediri-history/apps/web/.next
node tools/project-standalone/src/cli.mjs verify product/kediri-history
```

The artifact must be cleared first because the verifier rescans the whole capsule tree for
symlinks after every lifecycle stage, and the Turbopack dev server leaves symlinks under
`.next/dev/node_modules/`. For the same reason the production build runs `next build --webpack`:
identical routes, zero symlinks.

Clearing the artifact is not optional housekeeping. `next build` writes alongside `.next/dev/`
rather than purging it, so a single earlier `pnpm dev` keeps failing the standalone verify long
after that dev server is gone. Observed 2026-08-26: verify failed on
`apps/web/.next/dev/node_modules/@aws-sdk/client-s3-...` from a dev run in a previous session,
and passed on the next attempt after `rm -rf apps/web/.next` and a fresh build.

## Current coverage

Gerbang mekanis dipasang sejak fondasi, lalu diisi seiring fase:

- `apps/web/tests/architecture/module-boundaries.test.ts` enforces the four module dependency
  rules by parsing real import statements, and fails on an unknown module directory so the rule
  set cannot silently fall out of date.
- `apps/web/tests/env.test.ts` covers the environment contract, including production fail-fast.
- `apps/web/tests/historical-integrity.test.ts` exercises the `validateHistoricalIntegrity` stub,
  so Phase 6 fills rules into a gate that already runs rather than adding a gate later.
- `scripts/check-tokens.mjs` is the token gate, wired into `pnpm run test`.
- `apps/web/e2e/smoke.spec.ts` menjalankan 16 skenario di dua perangkat (desktop dan mobile):
  beranda, tautan dalam scene, bukti berjarak satu interaksi, Journey ke Arsip dan kembali
  dengan konteks utuh, pencarian alias, keadaan kosong yang jujur, 404, dokumen tanpa
  JavaScript, reduced motion, siklus hidup motion, dan pergantian rute tanpa trigger yatim.
- `apps/web/src/scripts/verify-production.ts` menjalankan gerbang integritas terhadap data
  nyata di basis data, bukan fixture.

Catatan port: e2e memakai 4321 dan `scripts/serve.mjs` memakai 4320. Kalau keduanya berbagi
port, `reuseExistingServer` akan diam-diam menguji build lama dan melaporkan hijau untuk kode
yang belum pernah dijalankan.

Catatan anchor: anchor scene dimulai dengan angka (`1135-panjalu-jayati`). Fragment URL
menerimanya, tetapi `#1135-...` BUKAN selector CSS yang sah — kode dan uji memakai
`getElementById` atau selector atribut.

## Rules

A passing command is evidence only for what that command checks. Never weaken a test, gate, or
threshold to obtain a pass; fix the implementation. Historical-integrity failures are blocking,
not advisory.
