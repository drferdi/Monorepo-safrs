# Sentrapedia testing

All commands run from the capsule root and need the capsule-owned Node/Python runtimes installed by `npm ci --workspaces=false`.

```powershell
npm run typecheck   # tsc --noEmit
npm run lint        # eslint src tests
npm run test:all    # current app, supervisor checks and bundled MIRA mocked tests
npm run build       # Next standalone output plus bundled engine/launcher
npm run deploy:dry-run
```

`project.contract.json` is the canonical lifecycle contract. `npm test` covers current TypeScript tests and excludes runtime backups. `npm run test:system` runs Node lifecycle/profile checks; `npm run test:mira` runs the bundled Python service tests with mock provider clients, including source/snapshot hash and pinned dependency checks. The inherited optional Med Assist source-copy check remains skipped unless its source path is explicitly supplied; it is not required for capsule independence.

Tests import application code from `../src/`. `tests/oracle-mira.test.ts` reads the MIRA schemas from `src/lib/mira/` and checks their SHA-256 hashes, so a schema change also needs a hash update. The tests use synthetic cases and do not call a live MIRA service.
