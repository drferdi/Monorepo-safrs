# HANDOFF

Last updated: 2026-09-27 (night)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch`, from `e2de54d0` (on top of `feat/diagnosis-engine-interface`),
local only: not pushed, no PR. Spec: `docs/specs/2026-09-27-sidepanel-ui-batch-design.md`. Plan:
`docs/plans/2026-09-27-sidepanel-ui-batch-plan.md`. Ledger:
`.superpowers/sdd/2026-09-27-sidepanel-ui-batch-plan/progress.md`.

Work packages (one commit set each):
- WP1 Clinical Trajectory "Hasil" panel as `<details>`: `48b76c4e`.
- WP2 Diagnosis page reorder + English "Clinical Finding" heading + folded triage dropdowns:
  `d30f6fac`.
- WP3 Pregnancy header wrap fix: `ed639140`.
- WP4 Emergency verdict card restructure (seven sections, Indonesian headings): `91181d9b`,
  `16e3a20b`.
- WP5 Send to Doctors (WhatsApp): medboard `GET /api/doctors/contacts` `392b04df` + `92d5adb5`
  (route test); Assist button `f6a5f637`, `5171abc8`.
- WP6 RME practitioner autofill (signed-in-user names + exact-match autocomplete): `22b816a1`,
  `c5252691`, `961b1963`.
- Final fixes (contrast, specificity, docs, medboard 401 test): `c7efc51f`, `92d5adb5`.

Protected files (`main.tsx`, `TTVInferenceUI.tsx`, `style.css`) changed only in the
Chief-approved areas (emergency verdict card, pregnancy header, new append-only classes);
`style.css` stayed append-only throughout.

## Verification (on `92d5adb5`, controller run, all exit 0)

- med-assist: lint (1 pre-existing warning), typecheck, test (154 files, 1175 passed, 17 skipped;
  baseline 1138), build, `run:check`.
- medboard: `tsc`, `doctor-contacts` 2/2, contacts route 4/4.
- Token-guard: all findings fixed — three contrast fixes to `var(--text-main)` (verdict-card
  heading, Send to Doctors note, the four new triage summaries) and one specificity fix
  (`.form-group--inline .form-group-header--wrap` row-gap).
- SAFRS: range R3; the only R3 files touched are `lib/clinical/tenaga-medis.ts` (approved) and
  its new test; no verification-control file in range.

## Open for Chief (decisions)

a. Acknowledge the new R3 test file `lib/clinical/tenaga-medis.test.ts`.
b. Profession list: Dokter, Dokter Gigi → doctor field; Perawat, Bidan, Apoteker, Triage Officer
   → nurse field; other/unknown professions and local accounts keep the constants — confirm.
c. The exact-match rule for autofilled practitioner names accepts a trailing suffix of ≤4 letters
   as a degree abbreviation, so "Budi Santoso" could uniquely select "BUDI SANTOSO ADI" — accept
   or tighten.
d. R2 review of medboard `GET /api/doctors/contacts` (returns staff WhatsApp numbers to
   crew-authorised callers).
e. Landing order: update `origin/main`, land `migrate/healthcare` with its integrity review, then
   this batch.
f. Chief's "Logic: Diagnosis utama" request item had no content — parked, out of scope.
g. Older diagnosis-page summaries ("Alasan", "Rincian edukasi") keep sub-AA `--text-muted`; not in
   this batch's scope.

## Live checks Chief must do on a real ePuskesmas page

- Whether hidden `dokter_id`/`perawat_id` fields clear when an exact practitioner match fails.
- How real practitioner autocomplete menu items are formatted (degree suffixes, casing).
- That the constant names (`DOKTER_NAMA`, `PERAWAT_NAMA`) still find exactly one autocomplete
  match.
- Send to Doctors once medboard is deployed and crew profiles carry WhatsApp numbers.

## Known limits

- Only the transfer/Uplink RME path applies the signed-in user's name; direct `fillAnamnesa` /
  `fillResep` messages and native messaging keep the constants.
- No test pins the background wiring (`applyAssistStaffPayload`).
- A failed anamnesa exact match still lists the direct-text-fill step as success next to the
  match failure (cosmetic).
- `getSession` does not check session expiry: on a shared workstation, whoever is signed in is
  the name written to the RME.

## Carried over from before (unchanged, kept short)

MIRA service timeout cost gap; `lib/diagnosis-engine/**` still missing from
`.safrs/sensitive-paths.json` as R3; MIRA UI limits (no tag on selected cards, English label in
RME, confirmed chronic diagnoses can push a cannot-miss entry out); `getPatientInfo` not
re-injected after an extension reload (fix touches protected `main.tsx`); PII trade-offs of
`b5b875a1`; ADR-005 / Gate 1 still open; the `cannotMiss` fill rule; broken
`vitest.clinical.config.ts` / `vitest.unit.config.ts`.

## Next action

Chief reviews the open decisions above (a–g), does the live ePuskesmas checks, then picks the
landing order (item e) before this branch merges anywhere.
