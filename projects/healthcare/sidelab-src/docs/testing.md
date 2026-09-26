# Testing

- `node scripts/pnpm.mjs run test` — contract `test`: the full engine pytest suite, excluding
  tests marked `live` or `performance` (they need real model credentials), with the coverage
  gate from `sidelab-engine/pyproject.toml`.
- `node scripts/pnpm.mjs run typecheck` — TypeScript project references and every package
  `typecheck`.
- `run_safety_tests.py` in `sidelab-engine/` — fast clinical safety regression set
  (pharmacology guardrails, no fabrication, red flags, emergency referral, drug interactions).
- `sidelab-engine/tests/clinical/` — clinical tests (317 passing on 2026-09-27).

## Test isolation (2026-09-27)

`sidelab-engine/tests/conftest.py` keeps every test away from real services and machine
configuration: a fake `ollama` module that behaves like "no server", a no-op for the
`.env` loader in `sidelab/notify/config.py` (it searches upward and would otherwise read a
`.env` above the capsule), and a fake `DEEPSEEK_API_KEY` per test (tests of a missing key set
their own value). The suite passes (1058 tests) with coverage about 97% against the 80% gate.

The clinical tests and `run_safety_tests.py` pass.
