# Tests

- Unit tests (node:test) live next to their code in `components/neural/*.test.mjs`; run them
  with `node scripts/pnpm.mjs run test`.
- Browser tests live in `e2e/` (`neural.spec.ts`, `smoke.spec.ts`) and run with
  `node scripts/pnpm.mjs run test:e2e` against a running build (`PLAYWRIGHT_BASE_URL`).
