# Side panel UI batch (2026-09-27) — Design

Status: approved by Chief on 2026-09-27. Branch `feat/sidepanel-ui-batch` (from `e2de54d0`).
Updated 2026-09-27 after implementation.

## Intent

Chief asked for six changes to the side panel after using it on real RME pages: a clearer
emergency (triage) card with a way to alert a doctor on WhatsApp, a pregnancy header that no
longer overlaps, practitioner names in the RME taken from the person signed in to Assist, a
tidier Clinical Trajectory page, and a diagnosis page that reads in clinical order with the
triage details folded away. Success is the panel showing these on the next build, with every
gate green and no protected behaviour lost (three-button action bar, GCS left, SBP+DBP on one
row, safety independence of the emergency layer).

Out of scope: the item "Logic: Diagnosis utama" (no content given; parked until Chief
describes it), any change to diagnosis ranking, triage decision logic, or emergency detection.

## Approvals recorded

- Protected files (Chief, written, 2026-09-27): `entrypoints/sidepanel/main.tsx` (emergency
  verdict card only), `components/clinical/TTVInferenceUI.tsx` (pregnancy header only),
  `entrypoints/sidepanel/style.css` (new classes; no existing class removed).
- R3 (Chief, 2026-09-27): `lib/clinical/tenaga-medis.ts` may become dynamic; this reverses the
  earlier directive "always used, never dynamic" and is recorded in `DECISIONS.md`.
- WhatsApp route (Chief): `wa.me` link with no patient data; numbers from medboard crew profiles.

## WP1 — Clinical Trajectory

- `components/clinical/trajectory/charts/chart-shared.tsx` `TrajectorySimplePanel`: the "Hasil"
  card becomes a native `<details>` (closed by default, like the other trajectory panels). The
  test id `trajectory-simple-result` stays on the card.
- The summaries of "Hasil", "Review details", "Evidence map" and "Audit trail" get a hint that
  reads "Open" while closed and "Close" while open, coloured `var(--sentra-safe)`. The summary
  holds both words in two spans and CSS on `details[open]` shows one, so no component state is
  added.

## WP2 — Diagnosis page

- `components/clinical/diagnosis/DiagnosisWorkspace.tsx`: the section title and aria-label
  "Konteks Klinis" become "Clinical Finding". Content (the clinical-signal chips) is unchanged.
- Order stays Clinical Finding → Diagnosis Banding → Diagnosis Utama → Triase & Rujukan, then
  the remaining sections unchanged.
- Triase & Rujukan keeps the status chip and headline visible. Below it, inline dropdowns
  (existing `details.diagnosis-details.diagnosis-details--inline` pattern), each shown only
  when it has content:
  - "Saran": refer, or can be handled at the Puskesmas (the headline text of the decision).
  - "Alasan": the fired criteria (was "Dasar keputusan").
  - "Indikasi rujukan": the knowledge-base referral text split into one line per item.
  - "Tanda bahaya": moved here from Pemeriksaan Penunjang.
- Tests that pin labels and order are changed deliberately; each replaced assertion is named in
  the commit message. The ban on other English labels stays.

## WP3 — Pregnancy header overlap

- Cause: `.form-group-header` is a single flex row; the label has `white-space: nowrap` inside a
  half-width column, and the indicator "risiko terdeteksi" can shrink, so the label paints over it.
- Fix: a new modifier class on the Status Kehamilan header in `TTVInferenceUI.tsx` that allows
  wrapping, with the indicator set to `flex-shrink: 0; white-space: nowrap`. When space runs out
  the indicator moves to the next line. No existing class changes.

## WP4 — Emergency verdict card

- `EmergencyDashboard` in `main.tsx`: same seven sections, headline alert only, zone colours
  unchanged. The zone and headline form the card header; each section becomes its own block with
  an Indonesian heading: Mengapa penting, Lakukan sekarang, Jangan lakukan, Pemicu rujukan,
  Evaluasi ulang, Dasar bukti. Empty sections stay hidden as today.
- `docs/specs/2026-07-07-emergency-verdict-card-design.md` and
  `main.emergency-dashboard.test.tsx` are updated to the new headings.

## WP5 — Send to Doctors (WhatsApp)

- medboard (`projects/healthcare/medboard`): new `GET /api/doctors/contacts`, same crew
  authorisation and CORS as `/api/doctors/online`. Returns active users whose profession is
  Dokter or Dokter Gigi and whose crew profile has a WhatsApp number: `{ id, name, whatsappNumber }`.
- Assist: `lib/api/bridge-client.ts` gets `getDoctorContacts()`. A new component under
  `entrypoints/sidepanel/components/` renders a "Send to Doctors" button in the verdict card; it
  loads the contacts on click and lists the names. Choosing a name opens
  `https://wa.me/<digits>?text=<message>` in a new tab.
- Message: zone only, e.g. "Sentra Assist: konsul triase KUNING. Mohon cek Sentra Assist." No
  patient name, RM, age, vital signs or alert title.
- Numbers live in memory for the open list only; never stored, logged, or written to tracked
  files. When the crew API is not signed in or not configured (`getBridgeAuthSource` returns
  `none`), the button shows the bridge sign-in message instead of loading contacts. When the crew
  API responds but the list is empty, it shows "Belum ada nomor WhatsApp dokter di crew portal".
- The action bar keeps exactly three buttons.
- `project.contract.json`: the crew portal entry also names the doctor-contact lookup.

## WP6 — RME practitioner autofill

- `lib/clinical/tenaga-medis.ts` gains a pure resolver (`resolveTenagaMedisNames`): given the
  Assist session user as `{ name, profession }`, return `{ dokter_nama, perawat_nama }`.
  Profession (`session.user.poli`, the crew profession) maps by an explicit list: Dokter, Dokter
  Gigi → the user's name goes to the doctor field; Perawat, Bidan, Apoteker, Triage Officer → the
  user's name goes to the nurse field. Any other or unknown profession, and local accounts
  (`session.user.id` starting `local:`), keep the constant names (`DOKTER_NAMA`, `PERAWAT_NAMA`)
  in both fields; the field not matched by the resolved profession also keeps its constant.
- Profession is used instead of `role` because `normalizeRole` maps bidan to `doctor`.
- The resolved names are not written by `lib/rme/payload-mapper.ts`; that module keeps building
  `DOKTER_NAMA` / `PERAWAT_NAMA` as its defaults. `entrypoints/background.ts`
  (`applyAssistStaffPayload`, via `assistStaffFromSession` / `withStaffNames` / `withResepStaff`
  in `lib/rme/assist-staff.ts`) overwrites `tenaga_medis` (anamnesa, diagnosa) and
  `ajax.dokter` / `ajax.perawat` (resep) with the resolved names immediately before each RME
  transfer fill step (`executeRMEFillStep`) runs — the Uplink/transfer path only. Direct
  `fillAnamnesa` / `fillResep` messages outside the transfer path, and native messaging, still
  send the payload-mapper constants unchanged.
- ePuskesmas autocomplete: practitioner fields use a new `requireExactMatch` option in the
  MAIN-world bridge (`lib/filler/filler-core.ts`, matching via `lib/filler/staff-match.ts`). A
  menu item matches when, after stripping menu suffixes and normalising both names (lower case,
  leading titles, degrees after a comma, and punctuation removed), the item's normalised name
  equals the practitioner's, or the two differ only by trailing words of at most 4 letters on the
  longer side (e.g. "s kep", "amd", "sp pd" — degree abbreviations), with the shorter name at
  least two words. Exactly one menu item must match this way; zero or several matches leave the
  field empty and report a reason ("Nama tenaga medis tidak cocok persis di ePuskesmas"). Other
  autocomplete fields keep the current behaviour.

## Error handling

- Crew API unreachable or 401 → the Send to Doctors list shows the error text; nothing opens.
- No session → autofill behaves as today (constants).
- Practitioner not found in ePuskesmas → field left empty, transfer step reports it; no wrong
  clinician is written.

## Testing

TDD per work package. Gates in the capsule: lint, typecheck, test, build, `run:check`; token-guard
and safrs-auditor before each commit. medboard: its typecheck and a route test. One commit per
work package with explicit paths; no push.
