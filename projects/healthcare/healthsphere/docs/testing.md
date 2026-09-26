# Testing

All commands run from the capsule root.

- Lint: `node scripts/pnpm.mjs --dir website run lint` (ESLint with React Hooks rules).
- Type check: `node scripts/pnpm.mjs --dir website run typecheck` (`tsc -b`).
- Unit tests: `node scripts/pnpm.mjs --dir website run test --run` (Vitest with jsdom;
  `website/src/config/site.test.ts`).
- Build: `node scripts/pnpm.mjs --dir website run build`.
- Deploy dry-run: `node scripts/deploy-dry-run.mjs` checks `website/dist/index.html` and that no
  server-only variable name appears in the bundle.
- The datasets in `database/` have no automated tests; keep them valid JSON.
