# Testing

- `node scripts/pnpm.mjs run test` — contract `test`: the full engine pytest suite, excluding
  tests marked `live` or `performance` (they need real model credentials), with the coverage
  gate from `sidelab-engine/pyproject.toml`.
- `node scripts/pnpm.mjs run typecheck` — TypeScript project references and every package
  `typecheck`.
- `run_safety_tests.py` in `sidelab-engine/` — fast clinical safety regression set
  (pharmacology guardrails, no fabrication, red flags, emergency referral, drug interactions).
- `sidelab-engine/tests/clinical/` — clinical tests (317 passing on 2026-09-27).

## Known gaps (left as in legacy, Chief 2026-09-27)

- The suite is red, and how red depends on the machine. On 2026-09-27: 5 failures when run in
  this folder, 24 in the verifier's fresh extraction. Several tests reach real services (the
  local Ollama server, model provider readiness) and fail with network or SSL errors when those
  are unavailable; they need to be isolated with fakes.
- Three `startup_disclosure` tests expect the model name `deepseek-v4-flash`; the code shows
  `deepseek-chat`.
- Coverage is about 65% against the gate of 80%.

The clinical tests and `run_safety_tests.py` pass.
