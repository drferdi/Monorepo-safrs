# Testing

All from this capsule root (see `AGENTS.md` "Commands"):

```text
node scripts/pnpm.mjs run typecheck
node scripts/pnpm.mjs run lint
node scripts/pnpm.mjs run test
node scripts/pnpm.mjs run build
node scripts/pnpm.mjs run deploy:dry-run
```

- Unit: node:test over every `components/**/*.test.mjs` (timeline, film, morph, face,
  morphology, signal, tactile). Tested modules are leaves with no runtime relative imports.
- End-to-end: Playwright on the installed Chrome, `e2e/neural.spec.ts` and `e2e/smoke.spec.ts`,
  against a running build (`PLAYWRIGHT_BASE_URL`, default `http://127.0.0.1:4346`). Local only
  for now (Chief 2026-10-09); CI runs lint, unit tests and build.
- Capsule topology from the enclosing repository: `python tools/safrs/check_topology.py`.

Known limits: frame timings are local evidence, not 60 fps on every GPU; INP is read from field
data after a deploy; Safari/iOS devices are a separate release check.
