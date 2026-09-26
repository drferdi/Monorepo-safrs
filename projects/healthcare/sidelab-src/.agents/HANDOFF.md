# HANDOFF

Last updated: 2026-09-27

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Migrated from abyss-monorepo on 2026-09-27 (see `DECISIONS.md`). Install, typecheck, build,
`start:local`, and the deploy dry run work from the capsule root. The 317 clinical tests and
`run_safety_tests.py` pass. The full `test` fails, exactly as in legacy (below).

## Work in flight

None.

## Blockers

`test` is red with inherited failures, left as they were on Chief's instruction (2026-09-27).

## Next action

Fix these in the new Monorepo, with Chief's approval where clinical code is touched:

1. Isolate tests that reach real services (local Ollama, provider readiness): on 2026-09-27
   the suite had 5 failures in this folder and 24 in the verifier's fresh extraction, many with
   network or SSL errors.
2. Three `startup_disclosure` tests expect the model name `deepseek-v4-flash`; the code shows
   `deepseek-chat`. Decide which is correct, then align code or tests.
3. The pytest coverage gate (`--cov-fail-under=80` in `sidelab-engine/pyproject.toml`) reports
   about 65%. Add tests; do not lower the gate without Chief's decision.
