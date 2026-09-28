# HANDOFF

Last updated: 2026-09-28

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Capsule branch `feat/sidepanel-ui-batch`, **local only, not pushed, no PR.** This session
implemented plan `docs/plans/2026-09-28-mira-autostart-recurrent-dx-step-flow-plan.md` (16 tasks,
all reviews approved) on top of `873d5b7d`, in three parts:

- **Part 1 — MIRA auto-start**: a native messaging host in the MIRA repository
  (`D:\DEV\gafferverse\mira-system`, branch `feat/reasoning-service`, commits `a842f4a`,
  `986b0bf`, `ee6fcb7`, `15f87b4` under `assist/host/`) that the extension asks to start the
  reasoning service, plus a header status dot and a Trajectory-stage prefetch. `mira` is now the
  production-build default engine. Details: `DECISIONS.md` "MIRA starts with Assist…" and "'MIRA
  tidak tersedia' on 2026-09-28…".
- **Part 2 — Recurrent diagnosis**: `lib/clinical/recurrent-diagnosis.ts` surfaces a patient's own
  repeated diagnoses (≥2 in 12 months) first, labelled Kronis/Berulang. Details: `DECISIONS.md`
  "Recurrent diagnoses from the record are offered first…".
- **Part 3 — Step-flow diagnosis page**: `DiagnosisStepFlow.tsx` replaces `DiagnosisWorkspace.tsx`
  (safety strip, receipts, one active step, ghosts). Details: `DECISIONS.md` "Diagnosis page is a
  step flow (form B)".

Capsule commit range `40f3b80c..7ed5ed2c` (22 commits, verified with
`git rev-list --count 40f3b80c..HEAD`). MIRA repository commit range `a3e7fef..15f87b4`.

## What Chief must run once

1. In the MIRA repository, with Developer mode on at `chrome://extensions` to read the extension
   id: `assist\host\install_host.ps1 -ExtensionId <id>`.
2. Reload the extension.
3. The diagnosis-engine flag in `.env.production.local` is Chief's own decision; no agent read it.

No push, no PR — capsule stays local until Chief asks.

## Live checks for Chief

- Open the side panel: the MIRA status dot in the header turns green with no manual start.
- Open a case, go Trajectory → Diagnosis: the MIRA-tagged suggestion list appears at once (served
  from the Trajectory-stage prefetch).
- Open a synthetic patient with three prior `I10` visits: the Diagnosis step shows the "Kronis"
  history card first, above the engine candidates.
- The diagnosis page shows one step at a time (Temuan receipt → active Diagnosis/Terapi/RME, ghost
  lines below); tapping "ubah" on a receipt reopens that step in full.

## Verification (capsule root, `node scripts/pnpm.mjs run <script>`, in order)

| Gate | Exit | Result |
|---|---|---|
| `lint` | 0 | 1 pre-existing warning (`lib/api/platform-api-client.test.ts:19`, unused eslint-disable) |
| `typecheck` | 0 | clean |
| `test` | 0 | 171 files passed, 1 skipped; 1312 tests passed, 17 skipped |
| `build` | 0 | clean |
| `run:check` | 0 | "Extension loads: Asisten Medis 2.1.0 (MV3), all referenced files present." |

MIRA repository: `src\.venv\Scripts\python.exe -m pytest assist/host/tests -q` → exit 0, 8 passed.

## Deferred minors (from the plan ledger, grouped by task; none blocking)

- **Part 1** — T1: `read_message` doesn't guard a truncated body; `spawn_service` Popen args
  untested. T3: a doc comment edited past its named hunk; one test hardcodes a notice string
  instead of calling `miraNoticeFor`. T4: `askHost` onDisconnect-reject path untested;
  `publishMiraStatus` restart-hydration path untested; `ensureMira` briefly publishes "starting"
  even when the host says "running". T5: StrictMode double-fires `miraEnsure` on mount in dev only
  (host-side idempotent); mount test doesn't cover unmount/remount. T6: `prefetchDiagnosis` doesn't
  sync a cleared `keluhan_tambahan` (cache miss only, never a wrong result); the ready-key listener
  matches on hash only, not case key (at most one redundant call for two identical concurrent
  patients).
- **Part 2** — T8: a literal `-` ICD would form its own group (nothing in the capsule writes `-`
  as `icd_x`). T9: the hook interface is `{ candidates, loaded }`, not the array the brief
  described — carry this if anything else is built against it. T10: `knownConditions` dedupe is
  exact-string only (a chronic "Hipertensi" and a recurrent "Hipertensi (I10)" both go through); no
  guard for an empty name/ICD.
- **Part 3** — T12: list keys are item text; expand buttons lack `aria-controls`. T13:
  `formatShortDate` tests live in `DiagnosisStep.test.tsx`; the "already shown" filter compares
  against all candidates, not just the visible three; no explicit Space-key test for a blocked
  card. T14: a bare `lanjut` first-word match can false-positive (brief's own rule); no separator
  between multiple "hapus" links; `therapySummary` skips the insufficient-label group filter. T15:
  an orphaned `.dx-flow-card[aria-pressed]` CSS rule and a `cursor:pointer` on the card wrapper
  (append-only file, left); one pre-existing `as HTMLElement` cast in
  `RMETransferPanel.test.tsx:159`.

## Carried from the previous HANDOFF (2026-09-26 batch), still open

1. Trajectory "Review details" wording: now one Indonesian paragraph ("Penjelasan") — Chief checks
   the wording live.
2. Trajectory top card Indonesian copy (headline, chips, six chart tabs, empty states) — Chief
   checks the wording live.
3. Carried a–g from the side panel batch (R3 test-file ack, profession→field mapping, ≤4-letter
   suffix rule, medboard contacts R2 review, landing order, parked "Diagnosis utama" item, sub-AA
   `--text-muted` summaries) and parked a11y minors (focus ring clipping, stepper landmark/colour-
   only state, `<div>` in `<summary>`, "Pilih" `aria-pressed`, primary card selected border).
   **The "MIRA tidak tersedia" investigation carried in this slot is now resolved**: Part 1 (this
   session) found the cause was the reasoning service simply not running, and fixed it with the
   native messaging auto-start — see `DECISIONS.md`.
4. Defence in depth (not done): `main.tsx`'s `storage.onChanged` listener re-renders on every key;
   filtering it to only the keys it reads would need a protected-file approval.

## Next action

Chief runs the one-time host install, reloads the extension, and walks the live checks above.
