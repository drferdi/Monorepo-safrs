# HANDOFF

Last updated: 2026-09-25 (Claude Code, branch `fix/smartboard-lint`, claim `SMARTBOARD-LINT`)

Overwrite this file at the end of every capsule-scoped session; never append. Durable decisions go
to `DECISIONS.md`.

## Current state

- `node tools/project-standalone/src/cli.mjs verify academic/academic-smartboard` (run from the
  Monorepo root on 2026-09-25) passes install and fails lint. Later stages did not run.
- The capsule's own Biome 2.5.7 (`pnpm run lint`, `biome check src` in `apps/web`) reports 136
  errors in `apps/web/src`. `biome check --write` (safe fixes only) fixes formatting and import
  order in 67 files and leaves 45 errors, 10 warnings, and 3 infos:
  - 14 `a11y/noStaticElementInteractions` and 12 `a11y/useKeyWithClickEvents`: click handlers
    on `div`/`span` without keyboard support;
  - 5 `a11y/useAriaPropsSupportedByRole` (for example `aria-label` on a plain `div` in
    `akademik/cakupan/page.tsx` and `akademik/keselarasan/page.tsx`), 2
    `a11y/useSemanticElements`, 2 `a11y/noNoninteractiveTabindex`, 2
    `a11y/noLabelWithoutControl`, 1 `a11y/noAutofocus`;
  - 7 `style/noNonNullAssertion`, 4 `suspicious/noArrayIndexKey`, 3 `style/useTemplate`,
    3 `correctness/useExhaustiveDependencies`, and single findings for `noImgElement`,
    `noUnusedImports`, and `useOptionalChain`.
- `apps/web` and `apps/site` typecheck and tests pass.

## Work in flight

None. The lint repair was not started: it changes interaction markup across many pages.

## Blockers

None.

## Next action

- Repair lint in two commits: first the mechanical `biome check --write` (format and imports),
  then the a11y and correctness findings by fixing markup (buttons for clickable elements,
  roles for labelled regions), never by suppression.
- The `useExhaustiveDependencies` finding in `akademik/cakupan/page.tsx:76` is an intentional
  reset of the selected outcome when grade or subject changes. Do not apply Biome's unsafe fix,
  which removes the dependencies; move the reset into the grade and subject change handlers.
- Then rerun `verify academic/academic-smartboard` until every stage passes.
