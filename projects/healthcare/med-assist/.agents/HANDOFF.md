# HANDOFF

Last updated: 2026-09-28

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch`, local only, not pushed, no PR.

- Staged diagnosis page + motion batch closed at `88ccf25c` (range `ff193e0e..88ccf25c`, spec
  `docs/specs/2026-09-27-diagnosis-page-staged-design.md`); details in `DECISIONS.md`
  2026-09-28 entries and the ledger `.superpowers/sdd/2026-09-27-diagnosis-page-staged-plan/`.
- This session: fixed the Chrome memory blow-up / Trajectory hang Chief reported (PC hung on the
  Trajectory page). Root cause: an endless render loop — side panel re-render → new `vitals`
  object in `ClinicalReasoningWorkbench` → `ClinicalTrajectory` reloads (canonical call) → new
  sanitised objects in `ClinicalTrajectoryV2` → audit trail writes 100 records to
  `storage.local` → `main.tsx` `storage.onChanged` (any key) re-renders the panel. Fix: memoise
  the vitals object and the two sanitised objects. No R3 or protected file touched. See
  `DECISIONS.md` "Clinical Trajectory must not reload or persist on equal re-renders".

- Later the same day: end-to-end leak probe (Edge, synthetic ePuskesmas page, all outside
  requests blocked) — current build: 1 audit write per Trajectory open, side-panel heap flat at
  8.1 MB over 3 minutes on Trajectory and 1 minute on Diagnosis; the same probe on a pre-fix
  build recorded 4,286 audit writes in 75 s and the browser growing 240 MB. Button sounds moved
  to Web Audio and sound files trimmed (see DECISIONS "UI sounds play from decoded Web Audio
  buffers"). Probe scripts live only in the session scratchpad.

## Verification (capsule root)

- New tests red before the fix (audit persisted 2×; canonical engine called 2×), green after.
- lint exit 0 (1 pre-existing warning in `lib/api/platform-api-client.test.ts`), typecheck
  exit 0, test exit 0 (1217 passed, 17 skipped), build exit 0.
- token-guard PASS (no rendered change); SAFRS R2, no R3 path, no protected file.
- Not yet verified live: Chief reloads the rebuilt extension and opens Trajectory while watching
  Chrome's Task Manager (extension memory should stay flat).

## Open for Chief

1. Review details: "Review next" is now one Indonesian paragraph ("Penjelasan"): complaint
   signal, the visit it first appeared (kunjungan ke-N, date), the engine rationale, vital
   drivers, diagnosis and therapy signals, and "Sentra menyarankan survei primer A-B-C-D" when a
   complaint signal exists or the trajectory is worsening/critical (Chief chose ABCD + whole
   section). Chief checks the wording live. "Physician action", "Evidence map", "Audit trail"
   stay English. `.ct-v2-review-checklist` in `style.css` is now unused (append-only file, left).
2. Trajectory top card now in Indonesian (headline, chips, six chart tabs and their panel
   titles and empty states, "N kunjungan ditinjau · Kunjungan terakhir …", state-chart axis).
   Chief checks the wording. Copy inside R3 engine output (e.g. complaint rationale) unchanged.
3. Carried: a–g from the side panel batch (R3 test file ack, profession→field mapping,
   ≤4-letter suffix rule, medboard contacts R2 review, landing order, parked "Diagnosis utama"
   item, sub-AA `--text-muted` summaries); parked a11y minors (focus ring clipping, stepper
   landmark/colour-only state, `<div>` in `<summary>`, "Pilih" `aria-pressed`, primary card
   selected border); "MIRA tidak tersedia" investigation.
5. Pending Chief approval (protected `main.tsx`): play the button sound on `pointerdown`
   instead of `click`, and prime `button5.mp3` when the console launches; plus the "smooth and
   soft" UX pack (see the chat proposal of 2026-09-28).
4. Defence in depth (not done): `main.tsx` re-renders on every storage key; filtering its
   `onChanged` listener to the keys it reads would need a protected-file approval.

## Next action

Chief reloads the extension, tests Trajectory with Chrome's Task Manager open, and reviews the
Indonesian top card and the "Penjelasan" narrative.
