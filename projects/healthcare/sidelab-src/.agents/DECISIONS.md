# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-09-27 — Referral sender from the environment; engine reads only its own .env

- Decision (Chief, R3 approved): `format_referral` takes the sender from
  `SIDELAB_REFERRAL_SENDER_NAME`, `SIDELAB_REFERRAL_SENDER_FACILITY`, and
  `SIDELAB_REFERRAL_SENDER_CITY` (each `-` when unset) instead of a named clinician and
  puskesmas in code.
- `sidelab/notify/config.py` loads only `sidelab-engine/.env` (`ENGINE_ENV_PATH`); it no longer
  searches upward into the Monorepo. Keys such as `DEEPSEEK_API_KEY` must live in that file.
- Evidence: `tests/notify/test_referral_sender_and_env.py` failed 4/4 before the change and
  passes after it; the engine suite passes (1062 tests, coverage 96.87%).

## 2026-09-27 — Tests isolated from real services; coverage gate met

- Decision: `deepseek-v4-flash` is the correct default model (Chief's default for decision B).
  The code and tests already agreed; `deepseek-chat` came from the Monorepo root `.env`, which
  `load_dotenv()` in `sidelab/notify/config.py` finds by searching upward from the capsule.
- `tests/conftest.py` now fakes `ollama` ("no server"), disables that upward `.env` search
  during tests, and sets a fake `DEEPSEEK_API_KEY` per test. Before this, the machine's real key
  made 22 `main()` flow tests pass only on this computer, and `import ollama` failed with an
  SSL error when a test had emptied `os.environ`.
- 14 new characterization test files (298 tests) raise coverage from 65% to about 97%; the 80%
  gate is unchanged. Production code (`sidelab/**`, R3) was not changed. Behaviour that looked
  wrong was left out of the tests and listed in `HANDOFF.md` for Chief.
- Evidence: `node scripts/pnpm.mjs run test`: 1058 passed, coverage 96.87%.

## 2026-09-27 — Migrated from abyss-monorepo into SAFRS

- Decision: The legacy folder `abyss-monorepo/apps/healthcare/sidelab-src` was copied as it is
  to `projects/healthcare/sidelab-src`. Source: legacy commit
  `762e48cb4bb1967e2132e7b530e8f2a7f4231c59`.
- Not copied: `.agent/`, `.claude/`, `.env*` files other than `*.example`, `node_modules/`,
  `dist/`, the engine's virtual environment and caches.
- Toolchain: fresh pnpm 11.21.0 lockfile, Node 24. In `pnpm-workspace.yaml`: `nodeLinker:
  hoisted`; the win32-x64 platform exclusions removed so the capsule installs on Windows;
  `onlyBuiltDependencies` became `allowBuilds`; the `catalog:` block was inlined into the 59
  specifiers that used it (the repository rejects catalogs); the `esbuild` override raised to
  `^0.28.1` and `@scalar/json-magic>undici` pinned to `^7.29.0` for `pnpm audit`.
- `preinstall` became `node scripts/only-pnpm.mjs` (portable, no `sh`).
- `install` also creates the engine venv and installs `requirements.txt`; `test` runs the full
  engine pytest suite (`not live and not performance`) with the project's own coverage gate.
- `replit.md` (an unfilled template) is kept; `README.md` is the capsule entry point.
- Known test failures are left as they were in legacy on Chief's instruction (2026-09-27:
  "biarkan dulu, buat catatan"); see `docs/testing.md` "Known gaps" and `HANDOFF.md`.
