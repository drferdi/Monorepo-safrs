# Playwright visual regression baselines

These PNG files are the committed visual baselines for the golden-path web app.
They are stored in Git LFS (see `.gitattributes`).

## How to review a change

1. Run `pnpm --filter @safrs/web test:e2e` — a mismatch fails with a diff image
   in `test-results/`.
2. Confirm the change is intentional (a deliberate layout/style/token change),
   then regenerate the baseline.
3. Regenerate with: `pnpm --filter @safrs/web exec playwright test --update-snapshots`
   (or `pnpm test:e2e:update` if wired).
4. Review the new PNG in the pr/commit before merging — never regenerate blindly.

## Policy

- Baselines are as much a contract as code: a changed screenshot must be
  reviewed by the Chief like any other R2/R3 style change.
- Do not widen the pixel tolerance to mask a real change.
- The visual spec captures the readiness desk in its deterministic
  "ready" state (API + PostgreSQL reachable in the disposable e2e env).