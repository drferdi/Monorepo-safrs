# Testing

All commands run from the capsule root.

- Lint: `node scripts/pnpm.mjs run lint` (ESLint 9, TypeScript and React rules).
- Type check: `node scripts/pnpm.mjs run typecheck` (`tsc --noEmit`).
- Tests: `node scripts/pnpm.mjs run test` runs the full Vitest suite from `vitest.config.ts`
  (jsdom, `tests/setup.ts`): 135 files on 2026-09-26, including the clinical suites in
  `components/clinical/`, `lib/iskandar-diagnosis-engine/`, `lib/emergency-detector/`,
  `lib/clinical/`, and the side panel.
- Contract test only: `node scripts/pnpm.mjs run test:contract`.
- Build: `node scripts/pnpm.mjs run build`; load check: `node scripts/pnpm.mjs run run:check`.
- Deploy dry-run: `node scripts/pnpm.mjs run deploy:dry-run` (`wxt zip`).
- End-to-end: `node scripts/pnpm.mjs run test:e2e` (Playwright; needs installed browsers).
- `vitest.config.ts` is the only Vitest configuration. The broken, unused
  `vitest.clinical.config.ts` and `vitest.unit.config.ts` were removed on 2026-10-03; the full
  suite covers their files.
