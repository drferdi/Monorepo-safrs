# Testing

- Type check: `node scripts/pnpm.mjs run lint` (`tsc --noEmit`; the contract runs it as
  `typecheck`).
- Unit and handler tests: `node scripts/pnpm.mjs run test`. `scripts/run-tests.mjs` finds every
  `*.test.ts(x)` under `api/`, `components/`, `services/`, and `vite-pages/` and runs them with
  node:test through tsx (87 tests on 2026-09-26). Tests use synthetic secrets only.
- Build: `node scripts/pnpm.mjs run build`.
- Deploy dry-run: `node scripts/pnpm.mjs run deploy:dry-run` checks `dist/index.html` and that
  no server-only variable name appears in the client bundle.
- Browser acceptance: `node scripts/pnpm.mjs run test:browser` (Playwright with route
  interception; needs locally installed browsers, not part of the contract).
