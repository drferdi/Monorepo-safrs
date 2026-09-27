# Diagnosis page, staged layout and motion (2026-09-27) — Design

Status: approved by Chief in chat on 2026-09-27 ("Agreed, write it"). Branch
`feat/sidepanel-ui-batch`, on top of `ff193e0e`.

## Intent

After a live test of the side panel batch, Chief found the diagnosis page redundant, confusing
for doctors and nakes, and showing too much at once. The same confidence, evidence counts,
danger signs and "no diagnosis yet" messages appear two or three times, and sections that cannot
be used yet (therapy, transfer) render in full before a diagnosis is chosen.

Success: a doctor reads each fact once, sees at a glance which step they are on (finding →
diagnosis → therapy → RME), and the page opens the next sections only when they become useful.
Content from the engine is unchanged; only arrangement, wording of UI chrome, and motion change.

Out of scope: diagnosis ranking, triage decision logic, emergency detection, the emergency
verdict card, the three-button action bar, the "MIRA tidak tersedia" engine notice, and the
parked "Logic: Diagnosis utama" item.

## Approvals recorded

- Chief approved the staged approach ("Bertahap per langkah") and the motion set, including the
  timeline patterns (progress stepper, order tracker, activity timeline), on 2026-09-27.
- `entrypoints/sidepanel/style.css` (protected): new classes appended at the end only; no
  existing class changes.
- No R3 path is touched. No new dependency: `framer-motion` is already a capsule dependency and
  is used only where CSS cannot express the motion.

## D1 — Section order and first view (before a diagnosis is chosen)

"Diagnosis chosen" means `viewModel.therapy.selectedDiagnosisCount > 0`.

Order in `DiagnosisWorkspace`:

1. Progress stepper (D5).
2. Clinical Finding — unchanged.
3. Diagnosis Utama — moved above Diagnosis Banding (reverses the earlier order on Chief's
   choice). The confidence word appears once, in the section header. The card holds the title,
   one evidence tally line (+/−/?) and the safest next action. `ConfidenceRail` is removed from
   the card. One primary button (`primary.primaryCtaLabel`), a small text button
   "Diagnosis manual ›" that toggles the manual form (was "Buka Diagnosis Manual" /
   "Tutup Diagnosis Manual"; the open state reads "Tutup diagnosis manual"), and a
   "Alasan" dropdown with the primary evidence (Mendukung, Yang tidak mendukung, Catatan) that
   moves here from Pemeriksaan Penunjang.
4. Diagnosis Banding — each card: rank label and confidence word in the head row, title, one
   tally line, one button "Pilih" (was "Pilih sebagai diagnosis utama"), and its "Alasan"
   dropdown. `ConfidenceRail` removed.
5. Triase & Rujukan — status in the header as today. The "Saran" dropdown is removed (it only
   repeated the header). Remaining dropdowns: "Alasan", "Indikasi rujukan", "Tanda bahaya (N)".
6. Pemeriksaan Penunjang, Therapy + Resep, Edukasi, RME Transfer — each renders as a closed
   one-line `<details>` summary with a short count, e.g. "Pemeriksaan penunjang · 4 disarankan",
   "Therapy + Resep · pilih diagnosis dulu", "Edukasi · 3 catatan", "RME Transfer · Menunggu".
   The doctor can open any of them at any time.

## D2 — After a diagnosis is chosen

When "diagnosis chosen" turns true, the four sections in D1.6 open (their `open` state follows
the flag; a doctor can still close one by hand). They open in order with a 40 ms stagger (D6).

- Therapy + Resep: the panel "Hanya untuk ditinjau. Dokter tetap pengambil keputusan akhir." is
  removed (the global footer already states physician authority). The warning "Pilih diagnosis
  terlebih dahulu…" no longer renders; the collapsed summary carries that state. The manual
  medication form stays closed until its button is pressed.
- Edukasi: shows `evidence.review` items that do not already appear in the Pemeriksaan
  Penunjang list (case-insensitive match after the existing cleaning). The "Safety-net" list is
  removed from this section.
- RME Transfer:
  - The three status boxes become one text line: "Diagnosis siap · Resep belum siap · Obat 0/0"
    (same readiness logic as today).
  - One primary button "Isi otomatis RME" (D6 morphing states). While `transfer.state` is
    `running`, a "Batal" button shows beside it; when the state is `failed`, `error` or
    `partial`, an "Ulangi" button shows beside it. Otherwise neither shows.
  - "Kirim diagnosis", "Kirim resep" and "Anamnesis" move inside the "Rincian transfer"
    dropdown, above the step tracker (D7). Their enable rules are unchanged.

## D3 — Danger signs appear once, uncapped

- One list, "Tanda bahaya", built from `evidence.redFlags` and `evidence.doNotMiss`, cleaned and
  de-duplicated as today (so "SpO2 < 90%" from both sources shows once).
- It renders in Triase & Rujukan when triage data exists, otherwise in Pemeriksaan Penunjang.
- The cap of 3 items in `getVisibleSafetyItems` is removed, because the separate Safety-net list
  that used to show the rest is gone. Dropping danger signs is not acceptable.
- The summary shows the count: "Tanda bahaya (N)".

## D4 — Loading

The "Menyusun diagnosis banding…" text panel becomes a skeleton of two diagnosis cards (title
bar, tally bar, button bar) with an accessible live text "Menyusun diagnosis banding…" kept for
screen readers, so the page does not jump when results arrive.

## D5 — Progress stepper (diagnosis page)

A compact horizontal stepper at the top of the workspace with four steps: Temuan, Diagnosis,
Terapi, RME.

- Temuan is done when `phase === 'ready'`.
- Diagnosis is done when "diagnosis chosen" (D1).
- Terapi is done when `viewModel.therapy.selectedMedicationCount > 0`.
- RME is done when `viewModel.transfer.state === 'success'`.
- The current step is the first step not done; it is marked `aria-current="step"`.
- The connecting line fills toward the current step and unfills in reverse when a step is undone
  (for example the diagnosis is removed). The stepper is an indicator only; it gates nothing.

## D6 — Motion

Principles (from the reviewed reference, lab.xevrion.dev): CSS transitions where they can do the
job, `framer-motion` only for what CSS cannot express; open 250 ms, close 200 ms, curve
`cubic-bezier(0.23, 1, 0.32, 1)`; the row that was clicked never moves; under
`prefers-reduced-motion: reduce` movement drops out and only opacity fades remain.

- Dropdowns and collapsed sections (every `details.diagnosis-details` and the D1.6 summaries):
  content unfolds with `details::details-content` plus `interpolate-size: allow-keywords`
  (height 0 → auto) and fades in; the chevron rotates. In a browser without support the
  `<details>` opens instantly, which is acceptable.
- Staged opening (D2): the four sections open in order, 40 ms apart, via modifier classes
  (no inline styles).
- Selected diagnosis card: its border moves to `var(--sentra-safe)` in 150 ms (uses the
  existing `candidate.isSelected`; the primary card uses the rank-1 candidate's flag).
- "Isi otomatis RME" morphing button, by `transfer.state`: `running` → the button narrows into a
  spinner; `success` → a check draws in; `failed`/`error` → one short horizontal shake. Under
  reduced motion only the colour and icon change.
- Skeleton (D4): a soft shimmer; static under reduced motion.
- Stepper line (D5): width transition 250 ms.

## D7 — Order tracker (Rincian transfer)

The step list inside "Rincian transfer" becomes a vertical tracker: one node per
`transfer.steps` entry, joined by a line.

- Node marks by step state: `success` → check stamp; `failed`/`error` → cross stamp;
  `running` → pulsing ring; `skipped`/`cancelled` → dash; `idle`/`pending`/`ready` → hollow.
- The line is filled up to the last finished step.
- Each row keeps today's text: label, state label, detail, reason, message.
- A stamp animates in (scale 0.8 → 1, 150 ms) when a step's state changes to a finished state.

## D8 — Activity timeline (Clinical Trajectory audit trail)

`renderAuditTrail` in `components/clinical/trajectory/v2/ClinicalReasoningDifferentialPanel.tsx`
becomes a vertical timeline: a line on the left with one node per event, each event card beside
its node, same content as today ("Step N", stage · status, summary).

- When the Audit trail panel opens, the line grows top to bottom (250 ms) and the events fade in
  with a 40 ms stagger.
- Under reduced motion events appear with a fade only.

## Error handling

- `transfer.error` and `transfer.reasonLabels` render as today, below the status line.
- Missing triage: danger signs fall back to Pemeriksaan Penunjang (D3).
- An empty `transfer.steps` list renders no tracker.

## Testing

TDD per work package. Tests changed on purpose, each named in its commit message:
`DiagnosisWorkspace.test.tsx` (triage summaries lose "Saran"; danger-sign list uncapped and
single), `ClinicalDifferential.final-page.test.tsx` (button labels "Pilih" and
"Diagnosis manual ›"; section order), `RMETransferPanel.test.tsx` (status line, button
placement). Buttons moved into a closed `<details>` stay in the DOM, so tests that query them by
role keep working. New tests pin: section order; stepper done/current states; staged `open`
state; danger signs shown once and uncapped; Edukasi de-duplication; transfer button visibility
by state; tracker node marks; audit timeline structure. Gates: lint, typecheck, test, build,
`run:check`; token-guard and safrs-auditor before each commit. One commit per work package with
explicit paths; no push.
