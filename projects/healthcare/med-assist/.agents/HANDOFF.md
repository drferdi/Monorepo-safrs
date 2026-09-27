# HANDOFF

Last updated: 2026-09-27

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/diagnosis-engine-interface` (from `migrate/healthcare`, not pushed, no PR).

- Done earlier (`72a08801`..`d17ffa33`): legacy engine behind `lib/diagnosis-engine/`, MIRA
  client off by default (flag `SENTRA_DIAGNOSIS_ENGINE`, shadow mode), JSON Schema contract,
  benchmark export, ADR-005 (Proposed), `docs/ARCHITECTURE.md` §5.6.
- New (`e07983ce`, R2): developer/admin-only MIRA planning-model picker in the side panel footer
  (`components/sidepanel/MiraPlanModelPicker.tsx`, options `VITE_MIRA_PLAN_MODELS`, choice in
  `browser.storage.local`), sent as `X-MIRA-Plan-Model` by `mira-engine.ts`. No protected
  side-panel file and no R3 file changed (`style.css` only gains classes).
- Service side (`D:\DEV\gafferverse\mira-system`, local commits, never pushed): allowlist
  `MIRA_PLAN_MODEL_CHOICES` and the header (`bb3fe85`); default planning model for now
  `google/gemini-3.1-flash-lite:nitro` via OpenRouter (one synthetic live step: 9.6 s, US$0.019).

Verification on 2026-09-27, all exit 0: typecheck; lint (1 pre-existing warning); test (147
files, 1109 passing, 17 skipped; baseline 1098); build; `run:check`. Token gate PASS; SAFRS R2.

## Blockers

- PII false positives in `anonymizer.ts` (R3): a proposal waits for Chief's approval in the
  archived session "Fix false positives in the med-assist PII patterns"; its worktree was removed
  on Chief's order (no edits were lost), so the work would continue on this branch.
- The client still cannot reach the service: no `Authorization` header, and real cases are not
  synthetic, so the service (`MIRA_DATA_POLICY=synthetic-only`) refuses them by design.
  Authentication and the data policy are Chief's decisions.
- CORS: the client already sends `Content-Type: application/json`, so a preflight is needed
  unless `host_permissions` covers the service; the new header does not change that. Undecided.
- ADR-005 and Gate 1 cases and thresholds wait for Chief. Dead-code deletion waits for approval.

## Next action

- Chief: decide service authentication, `host_permissions` or CORS, and Gate 1; review ADR-005.
- Load `.output/chrome-mv3-dev` in Chrome with `SENTRA_DIAGNOSIS_ENGINE=mira` and
  `VITE_MIRA_PLAN_MODELS` set; check the footer picker as admin.
- Repair or delete `vitest.clinical.config.ts` and `vitest.unit.config.ts` (broken since legacy).
