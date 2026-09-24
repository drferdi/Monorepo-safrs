# HANDOFF — Sentra Bot standalone contract

Last updated: 2026-09-25 (Cursor, branch `feat/sentrabot-standalone`, worktree
`D:\DEV\Monorepo.worktrees\feat\sentrabot-standalone`, task `TASK-20260925-SENTRABOT-STANDALONE`, state BLOCKED)

The previous handoff (WhatsApp Business Bridge public beta, worktree `codex-whatsapp-bridge`) is unchanged in
git history; its open items still apply.

## Done in this branch (uncommitted)

- `project.contract.json`: argv through `scripts/pnpm.mjs`; `run` serves the built web client with
  `vite preview` on 127.0.0.1:4390 (the same serving path as `docker-compose.prod.yml`), smoke `GET /` -> 200.
- `scripts/deploy-dry-run.mjs`: offline check of the inputs `publish-server-image.yml` hands to `docker build`.
- Package `test` scripts now name their folder as `../../packages/<name>/src` (same 32 files selected for core);
  the structural checker read `packages/<name>/src` as a root reference.
- Biome: import order and format fixed in `packages/adapters`; the misplaced `biome-ignore` in
  `infra/updater/src/compose-service.test.ts` removed (template literal instead). `pnpm run lint` passes.
- Root `.safrs/known-nonconformance.json`: sentrabot entry removed; `check_project_independence.py` OK.

- Chief decisions 2026-09-25: the two `bash` tests skip on win32 (existing capsule pattern; they still run on
  Linux CI); 17 Expo packages raised to the patch versions `expo install --check` expects (lockfile updated).
- Local gates pass from the capsule root: lint, `check`, test (2095 passed, 115 skipped), build, deploy dry run.

## Blocker (root control plane, Chief chose a root fix)

`project-standalone verify` fails at install:
1. The verifier environment drops `LOCALAPPDATA`/`APPDATA`; `koffi` (runtime dependency of
   `packages/adapters`) fails its Windows install script without them.
2. Cold install in the extraction takes about 127 s; the verifier allows 120 s per stage.

## Next action

After the verifier fix lands on `main`, rebase this branch, delete every `node_modules` folder in the capsule,
and run `node tools/project-standalone/src/cli.mjs verify product/sentrabot`.
