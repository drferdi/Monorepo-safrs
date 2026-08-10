# Task 5 — Next.js Golden Path Application

## Scope and decision record

Implemented the SAFRS readiness desk in `projects/golden-path/apps/web` and the reusable `@safrs/ui` StatusCard. The page is server-first, presents the operational rail **Database → API bertipe → Web → Siap**, and leaves only the demo form interactive on the client.

The form uses the typed Hono client through the new `@safrs/api/client` subpath. This is intentional: importing the root API package in a Client Component also exported the Hono app and pulled Prisma/`pg` into the browser graph. The client subpath keeps API/database runtime code server-only; a web test fails if the browser entry loads `@safrs/database`.

The App Router route mounts the package-owned Hono app at `/api`. It has no explicit `runtime` export because Next 16.2 rejects that route config with `cacheComponents`; Next's default runtime remains Node.js, which the accepted Hono/Prisma build proves.

## Framework enablement proof

- Upgraded within the approved Active LTS patch line: Next `16.2.11` → `16.2.12`.
- `cacheComponents: true` and `typedRoutes: true` are accepted. Build reports **Cache Components enabled**, emits `/` as partial prerendered, and generates the typed route declaration.
- Turbopack is the default build path; no flag or webpack configuration was added. Build reports `Next.js 16.2.12 (Turbopack)`.
- TypeScript remains `7.0.2`. Next 16.2.11 expected the removed legacy `typescript/lib/typescript.js` path. The verified patch release accepts the official bounded bridge `experimental.useTypeScriptCli: true`; build reports the experiment and completes `Running TypeScript`.
- `reactCompiler` is deliberately omitted. The exact baseline build rejected it because `babel-plugin-react-compiler` was not installed. Adding that compiler dependency was not required for this readiness desk.

## Red / green evidence

1. The page behavior test was written before page, UI, route, client, or server-data implementation.
2. `pnpm --filter @safrs/web test` initially returned no matching project with exit 0; this pnpm behavior did not prove the intended red state. Running the test through the available Vitest runner then failed before implementation because the web app dependencies and page module did not exist.
3. After the minimal web package and implementation were added, focused web tests pass: 4 files, 8 tests.

## Files added or changed

- `projects/golden-path/**`: complete capsule, documentation, web application, tests, Tailwind/PostCSS config, recovery views, and generated-artifact ignores.
- `packages/ui/**`: StatusCard, public export, type/test configuration, and component test.
- `packages/api/**`, `packages/database/**`, `packages/schemas/**`: approved source-export compatibility changes from internal `.js` specifiers to explicit `.ts` specifiers, plus `@safrs/api/client` public browser entry. No route, schema, database, or guard behavior changed.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`: web/UI dependency graph, Tailwind PostCSS, React type packages, Next 16.2.12, and audited `sharp` build approval. pnpm inserted a duplicate placeholder approval while resolving `sharp`; it was normalized to the existing audited `sharp: true` entry only.

## Commands and results

All commands were run from `D:\DEV\Monorepo`. Build commands consumed declared local-safe environment values without printing them.

| Command | Result |
| --- | --- |
| `pnpm --filter @safrs/web test` | PASS — 8 tests |
| `pnpm --filter @safrs/web lint` | PASS |
| `pnpm --filter @safrs/web typecheck` | PASS |
| `pnpm --filter @safrs/web build` | PASS — Turbopack, cache components, TS CLI |
| `pnpm --filter @safrs/ui test && lint && typecheck && build` | PASS — 1 test |
| `pnpm --filter @safrs/api test && typecheck && lint` | PASS — 8 tests |
| `pnpm --filter @safrs/schemas test && typecheck && lint` | PASS — 2 tests |
| `pnpm --filter @safrs/database test && typecheck && lint` | PASS — 20 unit tests; opt-in integration also PASS — 22 tests |
| `pnpm db:start && pnpm db:generate && pnpm db:migrate && pnpm db:seed` | PASS |
| unsafe local reset proof | PASS — rejected before database operation with `RESET DITOLAK` |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS via canonical `pnpm` Turbo script invocation |
| `pnpm test` | PASS — 7 workspace tasks |
| `pnpm build` | PASS — 2 workspace build tasks |
| `scripts/safrs-verify.ps1` | PASS, R2 integrity review required |
| `git diff --check` | PASS |

## Remaining concerns

- `experimental.useTypeScriptCli` is a temporary compatibility bridge for Next 16.2 and TypeScript 7; revisit when a subsequent supported Next patch removes the requirement.
- No development server was started or left running. Generated `.next` and `next-env.d.ts` files were removed after verification and are ignored.
- This task is R2 because it changes dependencies, shared UI/API exports, and source-package build compatibility. Independent review is required by SAFRS before merge.

## Follow-up usability correction

Browser review found the form input was transparent after Tailwind preflight and could not be seen against the dark panel. The input now has an explicit white background, Ink text and caret, a visible blue border, readable placeholder, and distinct focus and disabled styling. The placeholder `Misalnya Atlas` gives a non-coder an immediate example without changing the form interaction.

The final `Siap` rail step is now an aggregate of API and database readiness. It exposes `Status akhir: Perlu perhatian` to assistive technology and uses the Alert rail when either dependency is unavailable; it is no longer unconditionally green.

Red/green: a page behavior test for the degraded aggregate state failed against the always-ready step, then passed after the aggregate-state change. Web verification is green: 9 tests, lint, typecheck, and production build. Root typecheck, test, build, and SAFRS verification are green. The follow-up root lint run is blocked only by parent-owned `.superpowers/.../task-5-browser-check.mjs` formatting; generated web build artifacts were removed before rerunning it and no parent file was changed.

Correction: the aggregate state is attached specifically to rail step `04`, not the rendered Web step `03`. The strengthened degraded-state test requires the final list item to carry the Alert class, `Status akhir: Perlu perhatian`, and visible `Perlu perhatian` text. Step `03` remains `Web` and ready because the page did render.

## Generated-output isolation and typed demo follow-up

Root Biome now force-ignores generated Next output at every package location: `!!**/.next` and the Next-managed declaration `!!**/next-env.d.ts`. The latter is necessary because `next build` rewrites it; no Next-generated file was formatted, deleted, or edited. The repository contract covers those exclusions and verifies the web lifecycle commands `dev: next dev` and `start: next start`, enabling the canonical root development orchestrator to start this application.

`submitDemo` now accepts the exact inferred return type of `ApiClient["api"]["demos"]["$post"]`, rather than a generic `Promise<Response>`. The status-201 branch preserves the inferred demo body, while typed 400/500 bodies retain their API message; the malformed-body recovery message remains defensive. The browser client still imports only `@safrs/api/client`; the runtime test uses the real Hono app and client with an injected in-memory store, proving successful creation, validation 400, and thrown-store 500 responses without loading the database package into the browser entry.

Red/green: the root workspace contract first failed for the absent `.next` exclusion, then passed after the narrow configuration change. The exact Hono callback type assertion first made web typecheck fail against the generic `Response` signature; it passed after the inferred-client signature was introduced. The previous response doubles were replaced by a real typed Hono client/app runtime test.

Follow-up verification (local-safe build values were supplied without reporting them): web lint/typecheck/test (**9 tests**)/build PASS; UI full gate (**1 test**) PASS; API full gate (**8 tests**) PASS; schemas full gate (**2 tests**) PASS; database unit/type/lint PASS (**20 passed, 2 opt-in skipped**) and opt-in integration PASS (**22 tests**); local generate/migrate/seed PASS; unsafe reset rejected before Prisma invocation. Root `pnpm lint`, canonical `rtk proxy pnpm typecheck`, `pnpm test`, and `pnpm build` PASS. `scripts/safrs-verify.ps1` PASS with the expected R2 independent-review requirement; `git diff --check` PASS.

Build-to-lint preservation proof: after a successful Next build, `.next/build-manifest.json` had SHA-256 `79F3ACCAF8651033FF4E54B31ECA3FAFDD84EEFEDA4BEA0A4FF6A020C93698DD`; root lint passed while `.next` remained in place, and the hash was identical afterward. No development server was started or left running.

## Sol review fix-first follow-up

The browser RPC client base is now the same-origin root, not `/api`. Hono's inferred client already includes the route's `/api` basePath, so the real typed-client regression test intercepts its request through `submitDemo` and proves the final URL is exactly `http://web.test/api/demos`. This prevents the previous `/api/api/demos` request.

The readiness headline is now truthfully conditional: healthy dependencies retain `Monorepo siap untuk alur SAFRS`, while an aggregate attention state renders `Periksa kesiapan alur SAFRS`. The degraded rendering test proves the ready claim is absent. The cached API readiness read now calls `cacheTag("safrs:readiness:api")` alongside `cacheLife("minutes")`; the focused server-data test proves the stable tag invocation.

Red/green evidence: the URL test first failed with origin-plus-`/api` and a fallback submission error; the headline test failed because degraded markup still asserted ready; and the cache-tag test failed with zero tag calls. Each focused test passed after its minimal production change. Final web gate: lint, typecheck, **11 tests**, and Turbopack build PASS. Root lint/typecheck/test/build, `scripts/safrs-verify.ps1`, and `git diff --check` PASS.

Browser smoke attempt: a temporary `next start` server ran successfully on `127.0.0.1:3105` against the safe local database and logged `Ready`. `agent-browser` 0.33.2 then timed out after about 34 seconds for both `open` and `doctor`, without producing a browser snapshot or form action. Therefore no browser-smoke success is claimed. The temporary Next process was terminated, port 3105 was verified free, and the `task5-smoke` browser session was closed. The typed client/app runtime tests and Next build remain green, but a working browser-tool rerun is still needed to complete that requested manual smoke evidence.

Parent-session browser evidence supersedes only the outstanding manual-smoke gap, not the worker `agent-browser` timeout above. The parent ran a Playwright MCP smoke against production Next at `127.0.0.1:3105` with the safe local database: the healthy page heading rendered; `Nama contoh` was filled with `Atlas Browser`; `Simpan contoh` was clicked; and the accessibility snapshot showed `Contoh Atlas Browser tersimpan.` The parent browser tool saved a screenshot. Its only console error was the expected-unrelated `favicon.ico` 404. The exact created record was verified and then removed (`DELETE 1`, remaining `0`); the server was stopped and `PORT_3105_FREE` was confirmed.
