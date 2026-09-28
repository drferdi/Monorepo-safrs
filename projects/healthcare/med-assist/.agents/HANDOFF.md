# HANDOFF

Last updated: 2026-09-28 (evening, differentials-first order)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Capsule branch `feat/sidepanel-ui-batch`, **local only, not pushed, no PR.** HEAD `9f76dd66`.
Morning: plan `docs/plans/2026-09-28-mira-autostart-recurrent-dx-step-flow-plan.md` landed as
`40f3b80c..9b355bfe` (MIRA auto-start via native host in `D:\DEV\gafferverse\mira-system`,
branch `feat/reasoning-service`, never pushed; recurrent diagnoses from the record; step-flow
diagnosis page). Afternoon (`1631880f`, `1cdbd1f8`): page rewritten on the Trajectory panel
surface after two rejections; see `DECISIONS.md` and the commit bodies.

Evening (`9f76dd66`): Chief wrote the page order "temuan / Diagnosis banding 1 / Diagnosis
banding 2 / Diagnosis". The confirmation slot in his brief was left unfilled, so the literal
order was built: the Diagnosis step renders the differential cards first, each under a
`ttv-label` "Diagnosis banding N" (numbered by position; cannot-miss cards and the ones behind
"Lainnya" continue the numbering), then the primary slot last as the doctor's decision ("Usulan
diagnosis utama" — the patient's recurrent diagnosis first, else the engine's top card — until a
card is tapped, then "Diagnosis utama"). Tapping a banding card moves it into the slot and the
former proposal back into the banding list (shared `layoutId`, so the swap animates). Split
logic, three-card cap, cannot-miss exemption, Temuan (3 findings), receipts, motion and the
absence of triage text are unchanged. Only `DiagnosisStep.tsx` and three test files changed; no
CSS, no R3 path, no protected file.

MIRA host and service: unchanged since `1cdbd1f8` (host `com.sentra.mira` registered under HKCU,
service on 127.0.0.1:8787). `.output/chrome-mv3-dev` rebuilt at `9f76dd66`.

**SAFRS**: this change set is R2 UI (`components/clinical/diagnosis/steps/DiagnosisStep.tsx` and
tests). The branch as a whole remains R3 through `lib/clinical/recurrent-diagnosis.ts` (Chief's
prior approval).

## What Chief tests now

1. `chrome://extensions` → reload "Asisten Medis" (bundle `.output\chrome-mv3-dev`).
2. Trajectory → Diagnosis: Temuan receipt (3 findings), then the DIAGNOSIS panel reads top to
   bottom: "Diagnosis banding 1", "Diagnosis banding 2" (a third only for a MIRA cannot-miss
   card), "Lainnya (n)" if more, then "Usulan diagnosis utama" with the patient's Kronis/Berulang
   card when the record has one ("N× dalam 12 bulan · terakhir <date>").
3. Tap a banding card → the panel folds into the Diagnosis receipt and Terapi opens; "ubah"
   reopens it with the tapped card under "Diagnosis utama" (green border) and the former
   proposal as banding 1.
4. If Chief wanted the primary slot labelled plain "Diagnosis" instead of "Diagnosis utama", that
   is a one-string change in `DiagnosisStep.tsx` plus the label assertions in its test.

## Verification (capsule root, `node scripts/pnpm.mjs run <script>`, at `9f76dd66`)

| Gate | Exit | Result |
|---|---|---|
| `lint` | 0 | 1 pre-existing warning (`lib/api/platform-api-client.test.ts:19`) |
| `typecheck` | 0 | clean |
| `test` | 0 | 171 files passed, 1 skipped; 1321 tests passed, 17 skipped |
| `exec wxt build --mode development` | 0 | clean |
| `run:check` | 0 | "Extension loads: Asisten Medis 2.1.0 (MV3), all referenced files present." |

Rendering verified in a Vite harness of the real stylesheet in the browser pane (proposal state,
tap, receipt, "ubah" reopened state). Token-guard subagent: no violations (three class values in the diff, all pre-existing; this capsule has no `check:tokens` script, a pre-existing gap). The harness
(`scratchpad/harness`, `.claude/launch.json`) was session-only and removed.

## Deferred minors (none blocking)

- Carried from the afternoon: `read_message` no truncated-body guard; `askHost` disconnect path
  and `publishMiraStatus` restart hydration untested; StrictMode double-fires `miraEnsure` in
  dev; `knownConditions` dedupe is exact-string; orphaned `dx-flow-*` CSS block (append-only
  file); unused `triage` prop on `DiagnosisPageProps`; expand buttons lack `aria-controls`.
- Carried from the final branch review: scanned visits persist in IndexedDB with no purge;
  `main.tsx` keeps 5 scan rows (protected); header status dot never re-checked mid-session;
  `getLastMiraStatus()` null after a service-worker restart; host reply cast without validation;
  href-only scanned rows share an empty `encounter_id`.

## Carried from the 2026-09-26 batch, still open

Trajectory "Review details" and top-card Indonesian copy (Chief checks live); side-panel items
a–g and parked a11y minors; `main.tsx` `storage.onChanged` filter needs a protected-file approval.

## Open for Chief (SAFRS items from the afternoon audit; code must not change for these)

5. Durable R3 sign-off for `lib/clinical/recurrent-diagnosis.*` and `CHRONIC_ICD_ROOTS`.
6. ADR-005 "Decision Maker … pending" header line, if still present.
7. `VITE_MIRA_SERVICE_URL` has no default in `.env.example` (production build without
   `.env.local` reports MIRA `down`).
8. Host starts the service with `MIRA_SERVICE_ENV=development`; environment name is Chief's.
9. Capsule `AGENTS.md` still says "penyakit.json wins; the LLM is a reranker only" (R2
   verification control, separate change set).
10. Minor: a host `failed.reason` is `str(OSError)` and may surface a local path.

## Next action

Chief reloads the extension and walks the live checks above; then weighs in on items 5–10.
