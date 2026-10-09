# Sentrapedia testing

All commands run from the capsule root and need only the capsule's own `node_modules`.

```powershell
npm run typecheck   # tsc --noEmit
npm run lint        # eslint src tests
npm test            # vitest run, every file in tests/
npm run build       # next build (standalone output)
npm run deploy:dry-run
```

`capsule.json` (`lifecycle.test`) names the test files that make up the capsule contract. They are workspace, studio, workflow, oracle-mira, mira-free, mira-paid, mira-composer and mira-client. The other files in `tests/` cover presentation, navigation and motion helpers, and `npm test` runs them too.

Tests import application code from `../src/`. `tests/oracle-mira.test.ts` reads the MIRA schemas from `src/lib/mira/` and checks their SHA-256 hashes, so a schema change also needs a hash update. The tests use synthetic cases and do not call a live MIRA service.
