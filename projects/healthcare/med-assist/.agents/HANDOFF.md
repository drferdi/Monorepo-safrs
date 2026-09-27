# HANDOFF

Last updated: 2026-09-28

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch`. This session closes the staged diagnosis page + motion batch,
range `ff193e0e..7a07560d` (spec `bd97f827`, plan `e8830026`), local only, not pushed, no PR.
Spec: `docs/specs/2026-09-27-diagnosis-page-staged-design.md`. Ledger:
`.superpowers/sdd/2026-09-27-diagnosis-page-staged-plan/progress.md`.

Tasks (one commit set each):
- T1 Danger signs single & uncapped: `169c9ab2`.
- T2 Diagnosis Utama above Banding, one tally line, Alasan dropdown: `d1073b5a`.
- T3 Collapse Penunjang/Therapy/Edukasi/RME as closed `<details>`, open on diagnosis chosen:
  `47db122e`.
- T4 RME Transfer one status line + one primary action: `49d7ba6c`.
- T5 RME Transfer step tracker: `2dfbe20e`.
- T6 Progress stepper + loading skeleton: `72b12c5e`.
- T7 Unfold motion, chevrons, stagger, selection style: `dac5b071`; reduced-motion test scoped
  to its own block: `78a45e88`.
- T8 Clinical Trajectory audit trail as activity timeline: `6d9bc247`.
- Final review fix wave (F1, F2, F6, F7, F8): `7a07560d`.

Protected files: `style.css` stayed append-only throughout (+491/-0 across the range, single
hunk after the prior EOF); no other protected file (`main.tsx`, `TTVInferenceUI.tsx`,
`SentraAssistPanel.tsx`, `ApprovedSentraAssistApp.tsx`) touched.

## Verification (this session, capsule root, all exit 0)

- lint: exit 0 (1 pre-existing warning — unused eslint-disable in
  `lib/api/platform-api-client.test.ts` — unchanged from baseline).
- typecheck: exit 0.
- test: exit 0 — 155 files passed + 1 skipped (156), 1215 passed + 17 skipped (1232); prior
  baseline was 154 files / 1175 passed / 17 skipped.
- build (`wxt build`): exit 0.
- `run:check` (`scripts/check-extension.mjs`): exit 0, "Extension loads: Asisten Medis 2.1.0
  (MV3), all referenced files present."
- `deploy:dry-run` (`wxt zip`, no upload): exit 0, produced `.output/*-chrome.zip` (3.77 MB),
  not committed.
- `git status` after every gate: clean, no tracked file rewritten.
- Token-guard (`ff193e0e..6d9bc247`): 3 findings — TG1 stepper non-current label contrast, TG2
  autofill-btn label opacity transition not neutralised under reduced motion, TG3 audit-timeline
  `animation-delay` beating the reduced-motion delay — all fixed as appended `style.css` rules in
  `7a07560d`.
- SAFRS audit (`ff193e0e..6d9bc247`): R2 (capsule default), no R3 path touched, no
  verification-control file in range, protected-file rule held.

## Rulings Chief should know

- Utama above Banding reverses the earlier "Banding then Utama" order; confidence word now
  appears once, in the section header.
- Late sections (Penunjang, Therapy, Edukasi, RME Transfer) render closed and open only once a
  diagnosis is chosen — except Penunjang forces itself open (F1) whenever it is carrying the
  fallback danger-sign list (no triage data), because safety information must not hide behind a
  click.
- Danger signs ("Tanda bahaya") are uncapped and shown once, de-duplicated from
  `redFlags` + `doNotMiss`.
- Therapy panel's "Hanya untuk ditinjau… Dokter tetap pengambil keputusan akhir" disclaimer is
  removed; the global footer already states physician authority.
- F2: the primary card's "Alasan" dropdown renders whenever evidence has items, including the
  insufficient-evidence state.

## Parked a11y minors (not fixed this batch)

- Focus ring clipped by `overflow: hidden` on stage containers.
- Progress stepper: no landmark role; "done" state is colour-only; `aria-current` not set once
  every step is done.
- Stage `<summary>` elements contain a `<div>`; no `:focus-visible` style on stage summaries.
- "Pilih" button on Diagnosis Banding cards has no `aria-pressed`.
- Primary card's "selected" border styling ignores a manually chosen diagnosis.

## Live checks for Chief

- Motion (staged open/close, stagger) needs Chrome 131+ for the `<details>` unfold; older Chrome
  shows an instant snap instead.
- Walk a real ePuskesmas case end to end (Temuan → Diagnosis → Terapi → RME) to confirm the
  stepper, tracker and timeline read correctly against live data.

## Open for Chief (decisions, carried from the sidepanel-ui-batch, still open)

a. Acknowledge the R3 test file `lib/clinical/tenaga-medis.test.ts`.
b. Profession→field mapping (Dokter/Dokter Gigi → doctor; Perawat/Bidan/Apoteker/Triage Officer
   → nurse) — confirm.
c. Exact-match practitioner-name rule accepts a ≤4-letter trailing suffix as a degree
   abbreviation — accept or tighten.
d. R2 review of medboard `GET /api/doctors/contacts`.
e. Landing order: update `origin/main`, land `migrate/healthcare` with its integrity review, then
   this batch (now including the staged diagnosis page batch too).
f. Chief's "Logic: Diagnosis utama" request item had no content — still parked, out of scope.
g. Older diagnosis-page summaries ("Alasan", "Rincian edukasi") keep sub-AA `--text-muted`; not
   in this batch's scope.

## Carried over from before (unchanged, kept short)

MIRA service timeout cost gap; `lib/diagnosis-engine/**` still missing from
`.safrs/sensitive-paths.json` as R3; MIRA UI limits (no tag on selected cards, English label in
RME, confirmed chronic diagnoses can push a cannot-miss entry out); `getPatientInfo` not
re-injected after an extension reload (fix touches protected `main.tsx`); PII trade-offs of
`b5b875a1`; ADR-005 / Gate 1 still open; the `cannotMiss` fill rule; broken
`vitest.clinical.config.ts` / `vitest.unit.config.ts`.

## Next action

Chief reviews the rulings and parked a11y minors above, does the live checks, then folds this
batch into the landing-order decision (item e).
