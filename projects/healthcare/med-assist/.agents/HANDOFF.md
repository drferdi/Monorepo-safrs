# HANDOFF

Last updated: 2026-09-27

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/diagnosis-engine-interface` (from `migrate/healthcare`, not pushed, no PR). The task
"Isolate the legacy diagnosis engine behind an interface and add a MIRA engine slot" is done,
Steps A–E, in commits `72a08801`..`c8f3ae0a` plus this handoff:

- `lib/diagnosis-engine/`: engine contract, legacy adapter, registry, `run-diagnosis.ts` (shadow
  mode), MIRA client (`mira-engine.ts`, off by default), JSON Schema contract with examples,
  benchmark export (`scripts/benchmark/run-legacy-engine.mjs`).
- Flag `diagnosisEngine` (`SENTRA_DIAGNOSIS_ENGINE`) in `feature-flags.ts`, default `legacy`. This
  is the only R3 file changed (approved by Chief at the Step A stop).
- `entrypoints/background.ts` `getSuggestions` now calls `runDiagnosisSuggestions`.
- ADR-005 (Proposed), `docs/ARCHITECTURE.md` §5.6, inventory in
  `docs/plans/diagnosis-engine-inventory.md`.

Verification on 2026-09-27, all exit 0: install `--frozen-lockfile`, lint (1 pre-existing warning
in `lib/api/platform-api-client.test.ts:19`), typecheck, test (145 files; 1098 passing, 17
skipped; baseline 961/16, the new skip is the env-gated `benchmark-run`), build, `run:check`.
Golden: 12 synthetic cases identical before and after the switch, through the flow and through
`background.ts`'s path.

## Blockers

- ADR-005 waits for Chief. Gate 1 needs Chief to set the case set (Indonesian, de-identified,
  confirmed diagnoses, how many) and pass thresholds before the run, plus data-governance sign-off
  before any real case reaches the MIRA service.
- Dead-code deletion (inventory §6) waits for approval.

## Next action

- Chief: decide Gate 1 cases and thresholds; review ADR-005.
- Build the Python reasoning service in `D:\DEV\gafferverse\mira-system` against
  `lib/diagnosis-engine/contract/*.schema.json`; decide how it authenticates the extension and
  whether `host_permissions` needs an entry.
- Load `.output/chrome-mv3-dev` once in Chrome and click through the side panel.
- Repair or delete `vitest.clinical.config.ts` and `vitest.unit.config.ts` (broken since legacy).
