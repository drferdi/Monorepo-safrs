# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-10-05 — MedBoard host is medboard.sentrahai.com

- Decision (Chief: "crew.puskesmasbalowerti.com -> sudah tidak digunakan", then
  "medboard.sentrahai.com"): default sign-in address, passkey crew-domain check and manifest host
  permission use the new host. Passkeys made on the old host do not carry over.
- Evidence: auth-client default test and the manifest e2e red first; commit `99bfcca1`.

## 2026-10-05 — MedBoard is the default sign-in; Asisten Medis reports who is online

- Decision (Chief chose "Default ke MedBoard", auth change approved): reverses the earlier Mode
  Lokal default. A fresh install signs in at `DEFAULT_AUTH_BASE_URL` (MedBoard crew), so an account
  registered and approved on MedBoard works here unchanged. Mode Lokal = an empty Crew API Base URL
  saved in Settings. A local session stored before stays local until logout.
- Decision (Chief chose "Heartbeat + ACARS"): while signed in with a MedBoard cookie session the
  background sends `POST /api/presence` at once and every 30 s (shortest Chrome alarm; MedBoard
  TTL 90 s) and `DELETE` on logout; no presence call in Mode Lokal.
- Decision: "Ghost Protocols" is called "Asisten Medis" in copy and comments.
- Note: `entrypoints/login` stays the unused legacy popup; user-facing sign-in changes go to
  `ConsoleLogin`.
- Evidence: auth-client, Settings and heartbeat tests red first; e2e proves the heartbeat carries
  the cookie. Commits `2e682e22`, `65f715c1`, `0b5cd564`.

## 2026-10-04 — MedBoard session: safety rules follow the guidelines; MIRA reaches MedBoard

Made from the MedBoard session (Chief chose the rule-research recommendations and MIRA as the only
diagnosis engine). Commits on `feat/sidepanel-ui-batch`, all red-then-green:
- `d82906c4` MedBoard roles map to Med-Assist roles (`APOTEKER` → nurse is an assumption).
- `471173d5` the bridge poller skips an entry it could not claim; `9b37ea68` patient-sync sends the
  anamnesa page SpO2.
- `9f2e2ff7` (R3) the anaphylaxis red flag follows the two WAO 2020 criteria (it fired an
  epinephrine alert on "mual muntah" + "pusing"); CP-025 yields to CP-024 (`supersededBy` now also
  matches earlier patterns); qSOFA codes R65.1 (WHO), not the US-only R65.20.
- `9bc9d777` (R3) the consciousness alert comes from the observed ACVPU only; vitals no longer imply
  an AVPU, and autocomplete no longer writes one into the form.
- `42a08095` (R3) SBP below the age floor alerts without a DBP; a temperature below 35 C is a
  'high' hypothermia alert.
- `774a25ec` (R3) trajectory NEWS2 scores new confusion (3) and supplemental oxygen (+2), treats
  'unknown' as missing, and receives ACVPU and O2 from the TTV form.
- `b2592f0b` + `df286fdd` the MIRA differential of the active encounter goes with the consult as
  `mira_differential` (legacy suggestions never; the consult still goes out without it).
- Not done (Chief's call): TTV state still defaults AVPU to 'A'; CORE deterioration averages over
  seven vitals (absent = 0.1); sepsis consolidation, Wells PE, momentum acceleration units.
- Evidence: full Vitest 1762 passed / 17 skipped, `tsc` 0, ESLint 0 apart from the other session's
  untracked `tests/e2e/zz-verify-kb-rx.spec.ts` (4 `no-console`).

## 2026-10-04 — The visit summary gains columns inside its blocks, not new blocks

- Decision (Chief: "pdf kurang penuh"; then "hanya tambahkan kolom di isinya saja ya, struktur
  prinsipnya dipertahankan", picking the visit history, the interaction check, the trend line and
  the continued chronic therapy): the ten blocks stay. 05 TATALAKSANA adds STATUS (Lanjutan for
  `isChronicContinuation`, else Baru; the resep's order kept, so NO matches the RME) and INTERAKSI
  (the DDInter partners within this resep with the severity in Indonesian, a matched allergy; red
  when major, contraindicated or allergic), then a line saying what the check found, had not
  finished or could not run, and the curated advice of each serious pair. Pairs with a chronic
  drug not continued are left out. 08 TREN TANDA VITAL takes up to four earlier visits as dated
  columns (dd-mm-yy) before HARI INI, a Diagnosis (ICD) row and a GDS row; TREND is a sparkline
  (0.5 pt grey) before the template's arrow, which still compares the latest earlier visit with
  today. A visit dated the day of printing is left out (it is this visit's own record once
  ePuskesmas saves it).
- Departure from the template, the one this asks for: block 05's column widths (twips 567, 3288,
  1134, 1474, 1814, 1020, 1475 in place of 567, 4989, 1701, 2268, 1247) and block 08's (860, 700
  per visit, the rest for TREND, measured so "28-08-26" fits at 27.4 pt).
- The component matches the check on `nama_obat` (what `checkInteractions` was asked) and names
  the pairs as printed (`resepDrugSafety` in `tatalaksana.ts`); `lib/report` imports nothing from
  `components/`.
- Evidence: model 8, layout 17, helper 2 tests red first, and the PDF-flow test red on the old
  component; the synthetic visit stays one page (Amlodipin + Simvastatin, DDInter major, the
  advice "Batasi dosis simvastatin maksimal 20mg/hari."); harness `summary.html`.

## 2026-10-04 — The header reads "Prototype" under the credit line

- Decision (Chief: the Latin text after "...built by dr Ferdi Iskandar" becomes "Prototype"):
  `SidePanelHeader` prints "Prototype" in the motto line, same class (serif italic from the
  frozen `style.css`). The frozen, unmounted `SentraAssistPanel.tsx` keeps its old motto.
- Evidence: header test red on the old code, 22/22 green; harness `header.html` reads
  "Architected by dr Ferdi Iskandar" / "Prototype".

## 2026-10-04 — One welcome sound, none on the way to the sponsor page

- Decision (Chief: "hapus sound nya, sehingga hanya satu welcome sound saat masuk ke UI utama"):
  `ConsoleLogin` plays no sound; the only sound is `opening.mp3` from `runLaunchSequence` when the
  main UI opens. The background `action.onClicked` sound never fires (`openPanelOnActionClick`),
  and `entrypoints/login` is an unused popup; both left as they are.
- Evidence: `ConsoleLogin.test.tsx` (no `play` on sign-in) red on the old code; the controller
  test sees exactly `['opening.mp3']` from the sponsor page to the main UI.

## 2026-10-04 — The visit summary's signers: DPJP from the login, dr. Ferdi verifies

- Decision (Chief: "Pada output pdf — DPJP tergantung isian dan login. Verifikator selalu saya:
  dr Ferdi Iskandar. Jika DPJP saya, maka verifikator: dr Dibya Arfianda SPOG atau dr Boyong
  Baskoro SPOG (bergantian/ random)"): DPJP is `dokter_nama` from `resolveTenagaMedisNames` (a
  signed-in non-doctor gives dr. Ferdi). The verifier is `DOKTER_NAMA`; when the DPJP is dr. Ferdi
  it is one of `FERDI_VERIFIERS`, picked by the code-point sum of `RM|date` modulo 2, so a
  reprint of the same visit keeps its verifier. Supersedes the verifier half of 2026-10-03 "closes
  with the DPJP and the verifier" (default nurse as verifier). The RME's nurse field is unchanged.
- Evidence: model tests for all three cases; harness `summary.html`: RM-00-12-34 → dr. Dibya,
  RM-00-12-35 → dr. Boyong, another DPJP → dr. Ferdi.

## 2026-10-04 — The visit summary follows the approved template

- Decision (Chief: `Clinical_Visit_Summary_Template.docx` is the approved template; only add the
  Sentra logo, structure and placement unchanged): the layout is redrawn from the template's XML
  (A4, its margins, red tab, two-line title, ten numbered blocks, five-column medication table,
  footer). The template is bold throughout; the text is IBM Plex Sans Bold (Chief, same day:
  "Text summary gunakan IBM Plex Sans"), embedded as a subset through `@pdf-lib/fontkit`; the
  regular weight and the white logomark moved to `archieved/`. Plex is wider than the template's
  Arial, so "TANGGAL & WAKTU" wraps the time under the date inside its cell. The ink logomark sits
  at the right end of the title cell. Alerts print in block 01's "Temuan penting" slot. Supersedes
  2026-10-03 "opens on an Oxford band" and the Swiss grid of "a Swiss Style PDF"; of "set in IBM
  Plex Sans" only the bold weight stays. The medication table header is not repeated on a second
  page.
- Evidence: 39 report tests; the font test (only `IBMPlexSans-Bold`) red on the Helvetica code;
  the synthetic visit renders one page, 45 medications two ("2/2"), checked as rendered PNGs and in
  the harness `summary.html`.

## 2026-10-04 — Unreachable code and finished docs move to `archieved/`

- Decision (Chief: "pindahkan files dan folder yg tidak digunakan langsung ke folder ...
  archieved"; "samakan penulisan huruf kecil"): files no production entry reaches (traced from
  entrypoints, configs, services, scripts and WXT auto-imports) move with their tests to the
  gitignored `archieved/` (on disk, out of git); vitest and eslint ignore it. R3 code that looks
  unused is held for Chief: `lib/emergency-detector/index.ts`, `gate2-workflow.ts`,
  `ttv-inference.ts`, `lib/clinical/dosage-database.ts`. Finished plans and audits moved too;
  `docs/` names are lowercase (`docs/architecture.md`, `docs/adr/adr-00N-*.md`, `readme.md`).
  Standard files added: `LICENSE` (proprietary, all rights reserved; the terms are Chief's
  call), `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`.
- Evidence: build, tsc, vitest and eslint green after the move; links rewritten and checked.

## 2026-10-04 — A chronic card no visit gave a signa takes the references' standard start

- Decision (Chief "Pilih 1", after "NAC dan CTM tidak ada dosis"): when no visit, under any name
  of the drug, wrote a signa, `buildChronicMedications` takes `standardDoseFor` (standardDose.ts,
  PPK 2022 / PIONAS) for the card's name when it tells a strength, else for the stock medicine of
  the same `drugKey`, in stock first and lowest strength first. The card then carries that stock
  name (the resep takes the strength the dose is for), the dose line ends "· dosis standar", the
  card can be continued, and the continuation's rationale reads "dosis standar, riwayat tanpa
  signa". A single dose (durasi), a weight-based syrup (no dosis) or a drug the references leave
  out (injections, TB/HIV/KB, specialist psychiatric) keeps no dose. Supersedes 2026-10-02
  ("Pengisian dosis salah": no dose without a signa).
- Coverage (stock, 2026-10-04): 157 drugs, 55 with a standard start. Without a rule but plausibly
  daily: vitamin B komplek, tiamin, retinol, zink, tambah darah, nistatin, griseofulvin, kaolin
  pektin; adding them needs referenced rules (R3). Stock spelling slips form their own drug
  ("Amoksilin 125 Mg", "BLUD Setritizin").
- Evidence: 3 tests red on the old code (standard start, lowest strength, name without visits),
  the merge test updated for the stock name; harness: CTM 3x4mg and Simvastatin 1x20mg
  "dosis standar", Haloperidol without a dose.

## 2026-10-04 — One drug, one chronic card: abbreviations read through the RME synonym table

- Decision (Chief: "NAC dan CTM tidak ada dosis", "pastikan bukan hardcode"): `drugKey` reads a
  name through the RME resep's own synonym table (`MEDICATION_NAME_SYNONYMS` in
  `lib/rme/payload-mapper.ts`, now exported, behaviour unchanged) after dropping parentheses and
  hyphens, so "NAC" = "N-asetilsistein kapsul 200 mg", "CTM" = "Klorfeniramin Maleat ( CTM )",
  "PCT" = parasetamol, and no second alias list exists. `buildChronicMedications` merges names of
  one drug into one card under the name that tells the strength, else the longest; its dose is the
  latest visit's signa across every name. A card name without a strength takes it from the name the
  visit wrote ("CTM" + "... tablet 4 mg 3X1" → 3x4mg). Duplicate checks see NAC + N-asetilsistein.
- Still no dose when no visit, under any name, wrote a signa (the 2026-10-02 "Pengisian dosis
  salah" rule stands). A reference standard dose for those cards waits for Chief: it would reverse
  that rule and reach the resep.
- Evidence: 3 tests red on the old code (merge, duplicate, synonym coverage), 1 more for the
  strength; the coverage test walks every synonym pair whose drug is in stock (more than 30) and
  finds no mismatch. Harness `tatalaksana.html`: one N-Asetilsistein card 2x200mg, CTM 3x4mg.

## 2026-10-04 — No "Signa tidak tercatat": every riwayat signa form is read; halves stay halves

- Decision (Chief: "Saya gak mau ada signa tidak tercatat"): the history parser (`lib/clinical`,
  R3, covered by that instruction) reads 3X1/2, 2x1.5 (the scraper's point for 2x1,5), 3x½,
  3 dd 1, 3×1, "3x sehari" and "3 kali sehari"; `amountText` keeps the units a take as written
  ("1/2", "1,5") for the regimen and the dose line. A chronic card's dose comes from the latest
  visit that wrote a signa. A medication no visit gives a signa shows no Dosis row and no tick
  (supersedes the 2026-10-02 "Signa tidak tercatat" card). The RME resep keeps "3x1/2" and
  "2x1,5" (it sent "3x1": a whole tablet for a half).
- Assumption: the ePuskesmas signa list writes a decimal with a comma ("3X1,5", as its riwayat
  table does); "3X1/2" is in the list (noted live 2026-10-01).
- Evidence: 14 tests red on the old code, 1 UI test red on the old card; harness
  `tatalaksana.html` (port 5181): Amlodipin 1x1 from the older visit, Captopril 3x1/2,
  Metformin 2x1,5, CTM without a Dosis row, no "tidak tercatat" on the page.

## 2026-10-03 — Gate 3 raises GDS ≥200 without symptoms; the DDI check reads real names, fails closed

- Decision (Chief "Agree, Lanjutkan" on the R3 findings and on page-side warnings moving to debug):
  - Gate 3: a random glucose of 200 or more is reported in the diabetes category even without
    classic symptoms (the TTV form has no symptom input). Without symptoms or another confirming
    test the reasoning reads "hiperglikemia, DM belum tegak" and asks for GDP, OGTT or HbA1c; the
    UI shows its existing "Hiperglikemia berat — evaluasi DM" alert. `TTVInferenceUI.tsx` untouched.
  - DDI names: strengths and forms dropped, an Indonesian/English spelling key matches exact table
    names, salts tried with and without, "asam X-at" as X-ic acid, two-drug products as both,
    aliases target table names; no substring matching (it could pick methylprednisolone for
    "Prednisolon"). An unreadable table throws; the reasoner then leaves the candidate out
    ("DDI tidak dapat diperiksa").
  - Page-side `console.warn` stays at debug (off in production): failures reach the side panel
    through return values.
- Not done: the KB prescription path that calls no DDI is in another session's uncommitted
  `lib/api/sentra-api.ts`; it is left to that session. `sentra-api.ts` still falls back to the
  30-pair mock when the table throws.
- Evidence: red on the old code (34 failures, incl. Aspirin+Warfarin, Spironolakton+Kaptopril and
  the fail-closed tests), green now; two old tests that pinned "no alert for GDS 320" replaced (the
  hyperglycaemia preset itself fills glucose "agar gate glukosa aktif"); harness `gate3-harness`
  (port 5181) shows the alert for GDS 320.

## 2026-10-03 — Audit follow-up: least privilege, one answer per message, logging rule

- Decision (Chief: "Lanjutkan audit"): the manifest drops `identity`, the googleapis host
  permission and `oauth2` (no code uses them), and web-accessible resources are matched to
  `*://*.epuskesmas.id/*` only (any site could detect the extension and read the drug stock list).
  The native `onMessage` listener no longer answers `scanFields`, `scanMedicalHistory`,
  `scanClinicalContext` and `fillAnamnesa`; their typed handlers do. Content scripts are reinjected
  only into a tab whose host is ePuskesmas. Code that runs in the ePuskesmas page (handlers,
  scrapers, filler, content and main-world entries) logs through `utils/logger`; ESLint enforces
  `no-console` there. `scripts/dev/auto-commit.js`, `auto-document.js`, `docs-all.js` and the
  broken `vitest.clinical.config.ts` / `vitest.unit.config.ts` are removed.
- Not done: gating `VITE_MIRA_DEV_TOKEN` to DEV builds would stop Chief's production MIRA; it waits
  for a per-session token through the native host (MIRA repo). Clinical findings (Gate 3 glucose
  without symptoms, DDI name matching, DDI failing open) are R3 and wait for Chief (HANDOFF).
- Evidence: `background.exec-scrape.test.ts` (typed messages claimed by no raw branch; example.org
  gets no injection, ePuskesmas two), red before the fix; `extension-smoke.spec.ts` asserts the
  removed grants and the WAR matches on the built extension; full lint 0 warnings.

## 2026-10-03 — A dashboard bridge entry fills only its own patient's tab

- Decision (Chief, on the audit question whether the bridge auto-fill is used: "Ini justru harus
  KUAT, karena sangat membantu nakes, jika memungkinkan improve, gunakan technology terbaru tanpa
  API namun state of the art"): an entry is claimed only while an ePuskesmas tab whose URL carries
  its `pelayananId` is open (`selectBridgeTransferTab`, no fallback to the active tab); otherwise it
  stays pending. Every step fills that tab only; a vanished tab fails the step as
  `PATIENT_MISMATCH` with no retry. A loaded ePuskesmas page polls within about a second
  (`requestBridgePoll` from `pageReady`); a saved `sentra:auth-config` restarts the poller; the
  alarm listener is registered synchronously; one poll at a time (an in-flight promise, not a
  60 s stale flag), and a poll asked for meanwhile runs once after it. No external service added.
- Fixed with it: the transfer `runId` was `rme-<13-digit ms>-…`, which the PII guard reads as a
  BPJS number, so every bridge complete/fail report carrying the result was blocked; it is base 36.
- Evidence: e2e "fills a dashboard bridge entry only into the tab of its own patient" (mock crew
  server with two entries; the other patient's entry is never fetched or patched; reports read
  claim, processing, complete); unit tests for the targeting, the poller and the orchestrator (the
  PII test is red on the old run id).

## 2026-10-03 — Assist keeps no visit history on the PC

- Decision (Chief: "RME kan ada database untuk menyimpan data pasien? Assist hanya mengambil dari
  rme lalu proses done"): the visit store is in memory, one patient at a time, for as long as the
  side panel is open; another patient's visits replace it. The IndexedDB `sentra-visit-history`
  of earlier versions is deleted once. `sentra:encounter` (the open visit, 24 h) is unchanged: not
  asked about.
- Evidence: `visit-history-store.test.ts` (the two earlier claims unchanged; patient switch; one
  `deleteDatabase('sentra-visit-history')`).

## 2026-10-03 — The crew portal receives the patient's identity masked

- Decision (Chief: identity may go to the crew portal "dengan sensor pada beberapa bagian nama ...
  Ferdi Iskandar, Jadi : F**di *I***ar"): each word keeps its first letter and its last two
  letters, the rest are asterisks (`F**di I*****ar`; a word of three letters or fewer keeps only
  its first letter). Chief's second word was taken by the first word's rule (the example has 7
  characters for 8 letters). My defaults: the BPJS number keeps its last four digits (unmasked, the
  PII guard blocked the whole sync); the RM stays readable (the portal matches by it). Applied in
  `buildPatientSyncPayload`, the only patient-sync path.
- Evidence: `name-masking.test.ts`, `patient-sync-payload.test.ts` (masked payload passes
  `assertNoPII`; the unmasked one is blocked).

## 2026-10-03 — The visit summary is set in IBM Plex Sans

- Decision (Chief: "Text gunakan IMB Plex Sans"; picked "Setuju" for the dependency and the
  files): the PDF embeds IBM Plex Sans Regular and Bold (v3.005, SIL OFL 1.1, licence URL in the
  font's name table), copied from Chief's installed fonts to `public/fonts/`, subset to the glyphs
  drawn. New dependency `@pdf-lib/fontkit@1.1.1` (MIT, needs only `pako`, already present). The
  logo's cap-height alignment uses Plex's 698/1000. The fonts load with the logo at the click
  (`loadVisitSummaryAssets`); a missing file shows "PDF gagal dibuat".
- Kept: the WinAnsi guard, so characters stay those every weight has (`≥` still prints `>=`).
- Evidence: the renderer test finds only IBMPlexSans and IBMPlexSans-Bold in the file; the layout
  test finds a Plex glyph for every character drawn; the harness shows the Plex letterforms.

## 2026-10-03 — The visit summary closes with the DPJP and the verifier

- Decision (Chief: "Lalu dokter penanggung jawab atau buatkan istilah lain ala sentra dan
  verifikator saya. Nama seharusnya tergantung saat user login"; picked "DPJP", "Sesuai profesi
  login", then "Setuju, kerjakan"): section 09 VERIFIKASI prints DPJP (columns 4-7) and
  VERIFIKATOR (columns 8-12), names bold Oxford under muted captions. The names come from
  `resolveTenagaMedisNames(assistStaffFromSession(await getSession()))`, the RME's rule: a signed-in
  doctor is the DPJP and the verifier is the default nurse; a signed-in nurse, midwife, pharmacist
  or triage officer is the verifier and the DPJP is the default doctor; a local account or no
  profession gives both defaults. The session is read at the click, so a change of account shows
  on the next PDF. The model is now built inside the async handler, so its failure also shows
  "PDF gagal dibuat" (closes the deferred minor).
- Evidence: model, layout and full-flow tests (a synthetic signed-in doctor becomes the DPJP).

## 2026-10-03 — The visit summary opens on an Oxford band, red orange signals

- Decision (Chief: "Design ringkasan kunjungan : buat lebih komprehensif swiss style dan beri
  sentuhan warna red orange dan blue oxford"; picked "A. Pita Oxford", "Visual + isi"): page 1 opens
  with a full-width Oxford blue (#002147) band, "RINGKASAN / KUNJUNGAN" white 36 pt, the white
  logomark spanning both title lines, the meta line in a light tint, a 3 pt red orange (#FF4500)
  rule under the band. Sections are numbered 01-08 in red orange (column 1) with Oxford labels
  (column 2); vitals are 16 pt Oxford figures over captions; the PRIMER role, urgent alerts, triage
  merah, list numbers and each vital's latest visit are red orange; rules, ICD codes, follow-up and
  the page number are Oxford. New content from the Diagnosis page: 06 Edukasi (ticked points),
  07 Tindak lanjut ("Kontrol …" and "Segera kembali bila" red flags). A typical visit is now two
  pages, Tren TTV whole on page 2.
- Same pass, from the whole-branch review: a long complaint or alert continues on the next page by
  lines (was cut off), Tensi became Sistolik and Diastolik rows so each band is its own range (the
  shared band made diastolic 94-100 look normal), and the trend keeps only visits whose
  `patient_id` is this RM.
- Evidence: layout tests for the band, the numbering and tones, the new sections, the figures,
  the red-orange latest marks, the overflow and the triage spacing; model tests for the RM filter
  and the new fields; the harness shows both pages in Chrome's viewer.

## 2026-10-03 — The visit summary is a Swiss Style PDF

- Decision (Chief: "Build a system to format the output of the Assist result into a PDF document",
  Swiss Style, Sentra logo; picked: "Ringkasan kunjungan", "Lengkap, ubah main.tsx", "A. pdf-lib",
  "logomark saja"): "Unduh PDF" on the RME Terapi step saves an A4 PDF from `lib/report/*`
  (model → layout → pdf-lib). 12 columns, 12 pt gutter, 12 pt baselines; labels in columns 1-3,
  content from column 4; Helvetica / Helvetica-Bold at 24 / 9 / 7; red only for triage merah and
  urgent CDSS alerts; the black logomark on page 1, cropped flush to the mark.
- Approvals: `pdf-lib@1.17.1` as a new dependency; `main.tsx` (protected) passes one prop,
  `visitSummaryContext`. No patient name, date of birth, kelurahan, BPJS status, or the history's
  clinicians and therapy text in the file.
- Deviations from the spec, found against the code: Tren TTV is Tensi, Nadi, Napas, Suhu (visit
  history has no SpO2), the last 8 visits, the axis widened to every value; Tatalaksana prints the
  resep list (not per diagnosis) then the alerts; the triage zone is its bold word, no square; the
  button is enabled once a diagnosis is chosen; Chief's dose notation is applied in
  `ClinicalDifferential` because `lib/**` does not import `components/**`.
- Evidence: layout tests pin every text to a column edge and the baseline grid, 45 medications to
  two numbered pages, Helvetica-encodable text; a full-flow test shows no history clinician in
  the model; the harness renders both cases in Chrome's PDF viewer.

## 2026-10-03 — The Tren TTV card keeps the lab's shape, the trajectory's text

- Decision (Chief: "Okay tapi text sizing keluar jauh dari design trajectory lain"): the spring
  playground card keeps the lab's surfaces, ball, rings, chart, toggle and slider, but its text
  uses the scale of the other trajectory panels as measured in the harness: labels (Nilai, Selisih,
  Batas, Perilaku, Kunjungan) 10px / 700 uppercase like the result eyebrow, values 12px / 650 like
  the result title, hint and note 12px, the visit date 10px, the vital pills, the Sistolik /
  Diastolik toggle and Play 10px / 700 uppercase at 28px like the chart tabs, chart ticks 11px as
  drawn (15 chart units in a 334px-wide chart). Appended overrides; the earlier block is in main.
- Evidence: computed sizes read from Linimasa and Perburukan, then from the Tren TTV card after the
  change (all equal); CSS only, the suite unchanged.

## 2026-10-03 — Tren Tanda Vital is the lab spring playground

- Decision (Chief: "Sekarang bagian clinical trajectory gunakan design berikut
  https://lab.xevrion.dev/lab/spring-playground"; picked: the Tren TTV tab, motion "Setia ke
  referensi", limits "Export dari engine (Recommended): satu kata `export` di file R3 (perlu
  persetujuan Chief — memilih ini = menyetujui)", controls "Slider kunjungan + Play"): the chart
  of `TrajectoryVitalSignsPanel` is `VitalPlayground`, drawn to the lab card's measured sizes
  (outer surface radius 20 / padding 8, stage and controls radius 12 / padding 14, 40px ball and
  rings, 36px pills, 4px slider track with a 16px thumb, labels 12px in sentence case). The ball
  goes to the picked visit's value on the lab's Snappy spring (stiffness 500, damping 45, mass 1,
  critically damped); the two dashed rings and dashed chart lines are the normal limits; the
  marker is the picked visit; Nilai / Selisih / Batas / Perilaku replace the lab's four figures;
  the vital pills replace its presets, Sistolik / Diastolik its Physics / Perceptual toggle (spring
  thumb), one visit slider its three sliders; Play walks K1 to the last visit. The spring and the
  lab's press scale stay inside this card. Left out: dragging the ball (a dragged value means
  nothing clinically) and the lab's code block. Limits: `NORMAL_RANGES` of
  `lib/iskandar-diagnosis-engine/trajectory-analyzer.ts` exported (R3, the one word Chief
  approved); SpO2 has no engine limit and says so.
- Evidence: tests red first (module missing), then 8 green; the first cut used side-panel
  classes and Chief answered "KOK DESIGN NYA BEDA", so the card was redrawn from the lab's
  computed styles. Harness `traj.html`: ball and toggle thumb sampled per frame, monotonic,
  overshoot 0, settled in about 0.5 s (the lab states 0.51 s). Not yet seen in Chief's Chrome.

## 2026-10-03 — The daily breakdown on STATS is one sidebar sub-menu

- Decision (Chief: "Halaman statistik, gunakan design berikut di salah satu section",
  lab.xevrion.dev sidebar-submenu; section chosen: the daily accordion): Pasien per DPJP, Poli /
  Ruangan, Asuransi, Kelompok Umur and Waktu Layanan are one `ct-v2-panel` drawn as the lab's
  sub-menu: one 1px rail, a 3px `--accent-med` tick beside the open title, the open section's rows
  as a list on a branch drawn by borders (trunk and a rounded elbow on each row's first line, any
  row count), closed titles in `--ct-v2-text-soft`, the subtitle only on the open title. One open
  at a time, DPJP first (`useAccordion`). The lab's motion (height auto, blur-in items, the drawn
  path, the sliding tick) is not taken: only the title colour changes (steady console). DPJP shows
  counts without the meter bars; no row is highlighted (rows are counts, not navigation). 10 Besar
  Penyakit and the shift overview are unchanged. `StatisticSubmenu` and `shareRows` live in
  `StatisticCharts.tsx`; CSS appended.
- Evidence: tests red first (five panels, not one; a closed section's subtitle shown), then green,
  existing assertions untouched; harness `stats.html` read from the DOM (tick 16px on a 16.2px
  title, elbow at the first label line, open title the Diagnosis colour). Code review: ready with
  fixes, both applied. Not yet seen in Chief's Chrome.

## 2026-10-03 — The STATS page uses the side-panel design system

- Decision (Chief: "design nya mengikuti halaman halaman lain, text colour dll"): the whole STATS
  page (Statistik Harian and the shift overview) is drawn like Diagnosis and Trajectory: a
  `ct-v2-layout` root (it defines the panel text and surface colours), `ct-v2-panel` sections with
  `ct-v2-panel-head`, `ttv-section-title` titles and a `ttv-label` on the right, `diagnosis-row-meta`
  / `text-small text-muted` text, `action-btn--primary` / `--secondary` buttons, `PixelLoader`
  while loading. Figures use the TTV value scale (18px / 600, tabular), bars are a 3px
  `--accent-med` line, the date field is an underline that turns accent on focus. The surface's own
  scale (18px titles, 28px values, blue gradients, rounded 16px glass cards) is gone; the empty
  "Fase 2" ghost panel is dropped (no panel without data). Appended CSS only.
- Decision (Chief, same evening: "10 besar penyakit dan bawah nya di buat random ada drop down ada
  accordion"): 10 Besar Penyakit shows the 5 largest and opens the rest in place from "Lihat 10
  besar" (the Diagnosis page's "Lihat alasan" text button); the panels below it (DPJP, Poli /
  Ruangan, Asuransi, Kelompok Umur, Waktu Layanan) are one accordion, DPJP open first, and the
  shift panels another, Status Pelayanan first. One open per group; content appears and goes in
  place, no height animation (steady console). The trigger is the panel title (chevron drawn by
  borders), freed from the global `.sentra-card button` edge as `.diagnosis-text-button` is.
- Evidence: tests red first (headings not `ttv-section-title`, root without `ct-v2-layout`), then
  green; in the harness frame of the Diagnosis page (478px, `sentra-card`) the titles compute to
  the same `oklch(0.95 0.01 95 / 0.9)` as Diagnosis.
- Dead CSS (append-only file): `.statistic-board*`, `.statistic-grid*`, `.statistic-card*`,
  `.statistic-panel*`, `.statistic-list*`, `.statistic-bars*`, `.statistic-compare*`,
  `.statistic-empty`, `.statistic-partial`, `.statistic-daily__controls`.

## 2026-10-02 — Statistik Harian reads the ePuskesmas daily service report, identity-free

- Decision (Chief: "konsentrasi halaman baru yaitu statistic ... daily statistic yang mengambil
  data dari RME, buat agar mudah memprosesnya, misal menggunakan python"; source chosen:
  "Halaman laporan ePuskesmas"; approach chosen: "A. TS + CSV"): the STATS page opens with
  "Statistik Harian". "Muat statistik harian" opens `/laporanpelayananpasien` for the picked date in
  a hidden tab (the full GET filter set the page's own "Tampilkan" submits; only the two date
  fields gave "Data tidak ditemukan" live), the content script reads columns by header text (a
  grid over colspan/rowspan, SOAP spans four) and keeps only tanggal, jenis kelamin, umur tahun,
  jenis kunjungan, poli, asuransi, DPJP, diagnosa 1-5 with ICD and jenis kasus, and the three
  service times in minutes. Name, NIK, KK, eRM, phone, address, parents, SOAP, complaint, therapy
  and prescription never leave the page. A missing required header fails with its name. Counts are
  made in TypeScript (`lib/statistics/daily-statistics.ts`): services, sex, new/old visits, new
  cases of the primary diagnosis, the 10 largest ICD codes over all diagnoses, services per DPJP,
  poli, payer, age band, median service times. Rows are kept per date (`sentra:statistic:daily`,
  latest 31 days) for the change from the day before; "Unduh CSV" writes one wide row per service
  for `pandas.read_csv`. Python stays Chief's tool, not a runtime dependency. The shift overview
  below it is unchanged.
- Evidence: the live report was read for structure only (headers, value shapes masked to a/9,
  category labels, counts: 136 rows, 81 cells, one page). Tests red first (modules missing, the
  section without the daily panel, the e2e scan "message port closed"), then green; the panel test
  caught a race (the store read overwrote a just-loaded day). Playwright cannot route the first
  navigation of a tab the extension creates (it reached the live login/Cloudflare page), so the e2e
  scans the synthetic report in a page it opens; the hidden-tab path is the one the shift overview
  already uses. Live, read-only after the commit: the URL `buildDailyReportUrl` emits for today
  returned 136 rows of 81 cells on one page ("136 Data"), and the same header grid run on the live
  page found all 15 whitelisted headers (Tanggal 1, DPJP 28, Diagnosa 1 63, Lama Pelayanan Obat
  79). The live headers are <td> in <thead> (the fixture now matches); "freeze-table" adds three
  full clones after the real table, which the first-best pick skips. The report URL is no clinical
  page for `detectEpuskesmasPageType` (guard test). Not yet seen: a live "Muat statistik harian"
  in Chief's Chrome.

## 2026-10-02 — A real failure beside a stock gap keeps its own reason

- Decision: when a resep step has an out-of-stock medication and another failure (a signa not
  taken), the step is classified by the other failure (danger tone, Ulangi) and its message names
  every failure, joined with "; ". Only a step whose every failure is a stock gap is the warning
  note without Ulangi.
- Evidence: orchestrator test red first (the signa failure hid under `RESEP_OBAT_TIDAK_TERSEDIA`),
  then green; test 1528 passed, e2e 19 (18 own + the other session's spec), `run build` last.

## 2026-10-02 — A resep step says what went wrong; out of stock is a note, not a failure

- Decision (Chief, screenshot of RME Terapi: "Step gagal tanpa klasifikasi spesifik" after a
  medication was out of stock, "we need to solve this once and forever"): the handler's row error
  ("[STOCK_INSUFFICIENT] <nama>: Obat tidak ada di daftar stok ePuskesmas") matched nothing in the
  orchestrator's `classifyFailure`, so the step got `UNKNOWN_STEP_FAILURE` and the page showed that
  code's label. Now `RESEP_OBAT_TIDAK_TERSEDIA` (checked first, not retried) covers "tidak ada di
  daftar stok" and "stok tidak mencukupi"; the step message names every medication left out, the
  runtime code prefix stripped. The page shows the step's own message for that code and for
  `UNKNOWN_STEP_FAILURE` (any other unclassified handler error reads as itself), and drops the
  "tanpa klasifikasi" label from Alasan and Rincian. A stock-only gap is a warning-toned note
  without Ulangi: the handler's duplicate guard covers only the last committed row, so a second run
  would add the medications already in the resep again.
- Evidence: tests red first (orchestrator: two out-of-stock names and an unclassified message;
  panel: warning tone, no Ulangi; Diagnosis surface: the note shows the step message, no "tanpa
  klasifikasi", Ulangi only for the unclassified case), then green; no existing assertion changed.
  Which message Chief's run carried is inferred from the screenshot (generic label, partial, 26 s),
  not read; the general rule covers either case.

## 2026-10-02 — Terapi kronis leaves out medications only acute visits prescribed

- Decision (Chief, looking at the side panel: "usulan 9 macam obat? sejak 2 kali modify ini obat jadi
  aneh maleh"): since the visit therapy is read from the riwayat Resep tables, every medication of
  the last five visits became a chronic card, the ISPA ones included (N-asetilsistein, CTM,
  Parasetamol, Vitamin B Komplek with "Acute upper respiratory infections" as indikasi; seen on
  Chief's screen, read-only). `buildChronicMedications` now drops a medication when every visit that
  prescribed it has a diagnosis whose ICD root is not in `CHRONIC_ICD_ROOTS`
  (`lib/clinical/recurrent-diagnosis.ts`, Chief's list, read not changed). A medication one chronic
  visit prescribed stays (e.g. Parasetamol also given at a hypertension visit); a name no stored
  visit shows is kept as before. Using that list as the definition of chronic therapy is my default.
- Evidence: test red first (acute-only medications kept), then green; no existing assertion
  changed; capsule test 1522 passed, e2e 18, `run build` last.

## 2026-10-02 — A medication the ePuskesmas catalogue does not offer is left out at once

- Decision (Chief: "walah macet di vit b6", "bagaimana ya agar tidak stuck melulu kan stok obat bisa
  kosong sewaktu waktu"): read live (read-only, the autocomplete source called directly): "Vitamin
  B6", "Piridoksin" and "B6" return no item; the catalogue lists what is in stock. The main-world
  pick listens to jQuery UI's `autocompleteresponse`; an empty answer fails at once with
  `CATALOG_EMPTY_ERROR` ("Obat tidak ada di daftar stok ePuskesmas") and empties Nama Obat. The
  typed candidates then run only for those that search other words (an alias), within 12 s per
  medication (`MEDICATION_NAME_BUDGET_MS`); the row fails as "<nama>: Obat tidak ada di daftar stok
  ePuskesmas", the next medications are filled, and the step ends partial with that message. A
  left-out medication's typed words are cleared without events (a blur closed the next
  medication's suggestions).
- Evidence: e2e red first (step timeout at 60 s, no row), then green: N-asetilsistein and
  Klorfeniramin land, Vitamin B6 named in the partial result, no alert, under 25 s. The live-shaped
  page now fires `autocompleteresponse` and keeps minLength 1, as live.

## 2026-10-02 — The header lights the page on screen; "Lanjutkan semua" for chronic therapy

- Decision (Chief: "saat user ada di halaman trajectory maka button di atas di bagian trajectory
  menyala, begitu juga saat berada di halaman lain"; "Untuk terapi buat agar ada pilihan select
  all"): `SidePanelHeader` takes `activeSurface` (main.tsx passes `activeInferenceSurface`, one
  prop line in a protected file, at Chief's request). Under START, the button of the page on
  screen gets the existing `active` look and `aria-current="page"`: START on the main page,
  TRAJECTORY on the workbench, DIAGNOSIS on the differential, STATS on statistics; TRIAGE and
  MEDLENS as before. START keeps `aria-selected` for its tab panel. Tatalaksana's Terapi kronis gets
  "Lanjutkan semua", which continues every card with a regimen not yet continued and is disabled
  once all are; "Terapi kunjungan ini" already had "Gunakan semua usulan". Reading "terapi" as the
  chronic cards is my assumption (the visit proposals already had select-all).
- Evidence: tests red first (header 3 of 4 surfaces, Tatalaksana select-all); harness: each page
  lights only its own button (computed: text-main + accent-med border; transitions finished by hand
  because the hidden pane does not run them), "Lanjutkan semua" continues Amlodipin and disables.

## 2026-10-02 — Chronic doses come from the riwayat Resep table; no triad warning

- Decision (Chief, live resep: every row 1X1, "Pengisian dosis salah, masih ada Komponen triad
  regimen belum lengkap"; approved: read the riwayat format masked, fix the R3 parser, drop the
  triad warning): the visit scraper reads the riwayat modal's Resep table ("Nama Obat | Jumlah |
  Signa | … | Aturan Pakai") as the visit therapy, "<nama> <signa> <aturan pakai>" joined by "; "
  (`getResepTableTherapy`, first of the two copies, a comma becomes a point), else the free-text
  "Terapi Obat". The history parser (`lib/clinical`, R3) gives a name without a signa no dose
  (frequency 0, empty label) instead of 1x1 "Sesudah makan"; such a chronic card shows "Signa tidak
  tercatat" and cannot be continued. The visit store (`lib/iskandar-diagnosis-engine`, R3, needed
  for the approved fix) replaces a scanned visit whose therapy a new scan reads differently; a
  visit recorded in this session is kept. The RME transfer no longer raises
  `RESEP_TRIAD_INCOMPLETE`; the rule left `AGENTS.md` (the reasoner's copy is untouched).
- Rationale: read live 2026-10-02 (names masked, nothing stored): "Terapi Obat" is free text
  ("W3, W3", "sesuai advis") with no signa, so every history medication fell to the 1x1 fallback;
  the same modal's Resep table holds the signa (2x1, 3X1) and the aturan pakai.
- Evidence: tests red first (scraper table, parser no-dose, chronic card no regimen, store rescan);
  the payload-mapper triad assertion migrated from `toContain` to `not.toContain`. Harness: the
  CTM card from "NAC, CTM" reads "Signa tidak tercatat" with no continue button. A live fill with
  the new history was not run.

## 2026-10-02 — The RME resep picks each medication from its suggestion; one Tambah per row

- Decision (Chief: "Di bagian terapi lagi lagi stuck … selecting obat setelah kamu mengetik beberapa
  kata, keluar suggestion, kemudian harus click obat tersebut"): `fillResepForm` first chooses the
  medication on the ePuskesmas "Nama Obat" autocomplete in the main world (`pickMedicationInPage`,
  bridge `matchMode: 'medication'`): it searches the leading words (`medicationSearchTerm`, e.g.
  "Klorfeniramin Maleat"), clicks the item whose catalogue name is the medication with code, stock,
  case, spacing and punctuation ignored (`pickMedicationSuggestion`, never a near item), and counts
  only when the page wrote the row's hidden `obat_id`. The typed candidate loop stays as fallback.
  A page without indexed Nama Obat inputs (the live entry-row layout) is single-entry from the first
  row, so Tambah is no longer pressed on the empty entry row. Tambah is pressed once
  (`clickElementLikeHuman` no longer dispatches its own click before `button.click()`). The resep
  step gets 15 s more per further medication (`resepStepTimeoutMs`, orchestrator and tab message).
- Rationale (reproduced on the live-shaped page, now modelled on the live `setTambahObat`: entry
  row inside `#tabel_detail`, committed `tr_<x>` with hidden `ResepDetail[x][...]`, x = rows + 1):
  row 2 pressed Tambah on the empty entry ("Nama obat tidak boleh kosong"), then typed long
  candidates without "( CTM )" and the alias "chlorpheniramine", which the catalogue never offers;
  the 30 s step limit cut it off and the retry started a second fill over the running one. The
  double press raised the same alert after every committed row.
- Evidence: unit tests red first (suggestion pick 3, in-page pick 3, one press 1 with 2 presses,
  orchestrator timeout 1); e2e "adds every medication" red (STEP_TIMEOUT) then green: three rows in
  order, ids 20144/20109/20012, signa 1X1/3X1, no alert, ~15 s. Live: the catalogue answer for
  "Klorfeniramin Maleat" was read 2026-10-02 (read-only); a fill on Chief's form was not run.

## 2026-10-01 — The RME signa is chosen from its ePuskesmas suggestion; "3x sehari" is 3x1

- Decision (Chief, live resep fill failed: "kalo tidak di tekan ya gak kepilih"): read live on the
  ePuskesmas resep page (jQuery UI 1.12.1, read-only, synthetic throwaway inputs): the Signa
  column is the "Cari Resep Signa" autocomplete (`signa_nama`) whose select alone writes the
  hidden `ResepDetail[n][obat_signa]`, and Tambah (`setTambahObat`) refuses a row without it or
  without `obat_id`. `fillSignaField` now chooses through that autocomplete with `matchMode:
  'exact'` (`pickExactSuggestion`), so "3x1" takes "3X1", never "3X1/2"; no exact item falls back
  to the earlier path. `normalizeSignaValue` reads a frequency alone ("3x sehari 5-7 hari", also
  after a strength) as `Nx1`.
- Rationale: the knowledge base's "500-1000 mg" + "3x sehari 5-7 hari" became the signa text
  "500-1000mg3xsehari5-7hari", which failed the row check, so nothing was added. The drug-name pick
  was checked live the same way and already chose the stock item (`obat_id` set).
- Evidence: commits b562f747, bf5b1c3d; live probe: "3X1" chosen, hidden signa "3X1". A full live
  fill (typing into Chief's form, Tambah) was not run.

## 2026-10-01 — A green line runs around the Tatalaksana medication proposals until decided

- Decision (Chief: "recomendation obat di buat ada motion garis hijau mengitari kolom", after the
  resep button stayed off with "Obat 0/0"): the visit-therapy proposals sit in one box
  (`data-testid="dx-tx-proposals"`); while the page is undecided (same `decided` as the breathe
  effect) a `var(--accent-med)` ring orbits it (`.dx-tx-orbit--active::before`, appended to
  style.css; still under reduced motion). An exception to the "steady like a console" rule, like
  breathe: drawn outside the cards, so nothing grows, slides or moves.
- Evidence: new test red first (no box), then green; file 32 → 33 tests; five gates exit 0
  (1493 passed, 17 skipped); token-guard PASS (append-only, tokens only); SAFRS R2. Visual check of
  the built CSS in the browser pane: the ring moves around the box, cards do not shift.

## 2026-10-01 — Drug abbreviations resolve to the full stock name in the RME resep fill

- Decision (Chief, live synthetic test: "nac gak di kenal gunakan nama lengkap. check database
  obat"): `lib/rme/payload-mapper.ts` maps `nac`, `nasetil`, `acetylcysteine` → "N-asetilsistein
  kapsul 200 mg" and `pct` → parasetamol, using `stok_obat.json`. `pct` and `nasetil` were added
  by the agent alongside NAC (HANDOFF probe list); `nasetil` = N-asetilsistein is an assumption.
- `tab` is now a lookup stopword like `tablet`: before, "NAC tab" matched "Metildopa tab 250 mg"
  through the shared word (a wrong-drug fill). Unknown names now match nothing and go as written.
- Evidence: 4 new mapper tests red first (NAC/NASETIL/PCT got Metildopa or nothing); removing
  the `tab` stopword turns 2 red. Five gates exit 0 (test 1492 passed, 17 skipped); token-guard
  PASS; SAFRS R2. Open: "NAC tab" is filled as kapsul (the stock has no tablet); live ePuskesmas
  acceptance of the full names not yet seen.

## 2026-09-30 — No tensi in the RME: the engine gets the last visit's BP through the BP gate

- Decision (Chief: "Tensi jika rme belum di isi maka system seharusnya mengikuti algoritme
  tensi"; he chose Diagnosis / MIRA and the existing algorithm): when today's BP is not recorded,
  the diagnosis request carries the latest visit's reading (`previous_blood_pressure`), and the
  engine case gets one result row "Tekanan darah kunjungan sebelumnya (N hari lalu); TD hari ini
  belum diukur", flagged by `getHTNSeverity` (grade 1 and above abnormal). It never enters
  today's vitals and is dropped once today's BP exists. With no earlier BP nothing is added.
- Rationale: an earlier reading is evidence the engine should weigh, but it must not read as
  today's measurement; the results row keeps the MIRA contract unchanged. The reading comes from
  the history read both requests wait for, so the prefetch and the page keep one case key.
- Evidence: commit 9b8dddd9. The model-side effect was not verified (no live MIRA call).

## 2026-09-30 — Visit-form labels are not chronic medications (R3, Chief approved)

- Decision: the history parser (`lib/clinical/chronic-therapy-history.ts`) drops lines with no
  letters, bare form labels (obat, resep, terapi, dr, dokter, signa, ...) and the "sesuai
  advis(e) dokter" placeholder; the three-word fallback stays for real short entries.
- Rationale: Chief saw cards "Obat", "Dr Dokter", ":", "Advise Dokter"; each was a 1x1 medication
  that a tick would continue into the RME resep.
- Evidence: commit 1b90f54d. The scraper (`lib/scraper/extractors.ts`, label-sibling read) is
  the inferred origin of the labels; not changed without a real DOM sample.

## 2026-09-29 — Each RME page shows only its own transfer run

- Decision: RME Diagnosa and RME Terapi share one transfer state, so the view model carries the
  run's step (`transfer.lastStep`); each page shows the state, error and Ulangi of its own runs
  only, "Isi resep ke RME" morphs for a resep run only, and RME Terapi is done once the resep step
  succeeded (was the shared `transfer.state === 'success'`, which a diagnosa-only run reaches).
- Rationale: a successful diagnosa fill otherwise showed the resep button already done on the
  last page, and a failed run showed its error on the other page.
- Evidence: commit cc67c33b; red first in `RMETransferPanel.test.tsx` and rme-transfer test 1.

## 2026-09-29 — Chronic cards continue in this visit; the RME fill follows the ePuskesmas pages

- Decision (Chief, on Tatalaksana with no proposals: "di stage ini saya tidak bisa memilih
  obatnya"; he chose "Kartu kronis bisa dipilih"): a Terapi kronis card is tapped to continue the
  medication in this visit (selection line, tick). The continuation carries the latest visit's
  regimen as a signa (times a day x units a take; a dose written as a strength such as "1x10mg" is
  one unit a take - my assumption), "Sesudah makan"-style signa text, durasi "30 hari" (the
  prescription engine's own continuation length) and `isChronicContinuation`. It counts as a
  decision for "Selesai", is named in the receipt and in Ringkasan ("2 obat · 1 dilanjutkan"),
  is never drawn a second time under Terapi kunjungan ini, survives "Lanjut tanpa terapi
  tambahan" (not "tambahan") and is not taken by "Gunakan semua usulan". A card whose regimen no
  visit shows cannot be continued. The RME mapper names it by the Puskesmas stock ("Amlodipin
  tablet 10 mg") and its existing quantity rule applies (days capped at 3, rounded to 10).
- Decision (Chief: "Lanjut tanpa terapi tambahan -. beri breathing efek agar memberi perhatian
  dokter"): that button breathes (opacity 1 → 0.4, 2.4 s) while the page is undecided; it stops
  once a medication is chosen or continued or the skip is taken, on hover/focus, and under
  prefers-reduced-motion.
- Decision (Chief: the ePuskesmas Diagnosa page is apart from the therapy, "autofill rme harus
  mengikuti", "baru selanjutnya masuk ke halaman terapi"; he chose "Langkah sendiri" and "Tombol
  kedua di akhir"): five steps - Temuan 1/5, Diagnosis 2/5, RME Diagnosa 3/5 (page 1), Tatalaksana
  4/5 (page 2), RME Terapi 5/5 (page 3). RME Diagnosa offers "Isi diagnosis ke RME" (diagnosa step
  only) and "Lanjut tanpa mengisi"; a successful diagnosa fill moves on and stays sent through
  later runs. RME Terapi offers "Isi resep ke RME" and "Isi anamnesa ke RME" (education,
  "Kontrol …", vital signs), each for its own ePuskesmas page. "Isi otomatis RME" (one run for
  all three pages) and the "Kirim diagnosis / Kirim resep / Anamnesis" row are gone.
- Evidence: tatalaksana.test (2 new), TatalaksanaStep.test (4 new), DiagnosisStepFlow.test (4 new),
  rme-transfer e2e (1 new; mutation: a skip that clears continuations turns it red), migrated
  assertions named in the commit; five gates exit 0, `test:e2e` 15 passed; harness J20.9: RME
  Diagnosa → "terkirim" → Tatalaksana, Amlodipin continued (trace, "1 dilanjutkan", Selesai
  enabled, breathing stops), RME Terapi with the two buttons, no horizontal overflow.

## 2026-09-29 — The build Chief tests is `run build`; the native host follows the extension ID

- Decision: the extension Chief reloads is built last with `node scripts/pnpm.mjs run build`
  (production mode, MIRA engine). `exec wxt build --mode development` stays a gate only: it
  writes the same `.output/chrome-mv3-dev` but bakes the engine to `legacy`, which is why Chief
  saw "stuck loading MIRA" after a rebuild. When the unpacked extension's ID changes (it is derived
  from the load path), `install_host.ps1 -ExtensionId <id>` is re-run; the current ID is
  `bhcffleclpadneocndhembhjbemimhkm`.
- Evidence: `background.js` from the development build contains `return"legacy"` for the engine
  parse, the production build does not; `connectNative` was "forbidden" before the re-install and
  answered `running` after it; `/healthz` 200 and `sentra:mira-status` ready in Chrome.

## 2026-09-29 — The e2e suite runs on Google Chrome; the RME page stays active

- Decision: Playwright e2e start Google Chrome (`channel: 'chrome'`) and load the unpacked build
  through the DevTools protocol (`Extensions.loadUnpacked`, `--enable-unsafe-extension-debugging`,
  Playwright's `--disable-extensions` dropped). Chief: "sudah ada chromium" - this machine has
  Chrome 154 and no Playwright Chromium, and branded Chrome 137+ ignores `--load-extension`.
- Decision (my reading of Chief's "harus on the same side with RME page", not yet confirmed by
  him): a transfer test keeps the ePuskesmas
  page the active tab while the extension sends, as the real side panel sits beside it.
- The side panel's Tatalaksana payload for the e2e lives in
  `tests/e2e/side-panel-tatalaksana-transfer.ts`; the Vitest RME-transfer test asserts the side
  panel still sends it, so the two halves stay joined.
- Evidence: `test:e2e` 15 passed (was: could not start); commits 48ef1011, 8707bc66, 193b0a75.

## 2026-09-29 — Safety net as a timeline

- Decision (Chief: "I think we better make it like diagram?"; he chose "Safety net timeline"):
  the red flags are drawn like the therapy cards' rail (`dx-timeline`): one orange warning node
  (the Kontraindikasi triangle) per flag, joined by the hairline, the text beside it. No label
  column ("Segera kembali") and no frame. Supersedes the row entry below; its appended
  `.dx-tx-safety-list` rules in style.css are now unused (style.css is append-only).
- Evidence: TatalaksanaStep test "draws the safety net as a timeline" (red first, then green);
  five gates exit 0; token-guard PASS (existing classes only); harness: 5 warning nodes, no
  horizontal overflow.

## 2026-09-29 — Safety net is one row without a frame

- Decision (Chief, on the orange Safety net box: "Redesign"; he chose "Baris tanpa bingkai"): the
  Safety net part is one Kv row like Tindak lanjut: term "Segera kembali", value the red flags,
  one per line with a small orange dot (`--sentra-warning`). The orange framed box and its second
  title "Segera kembali / rujuk bila" are gone. The KB text stays verbatim (through
  `formatClinicalText`), so J20's complications ("Bronkopneumoni.", "Pneumonia.") still show as
  they are written (HANDOFF open item 3).
- Evidence: TatalaksanaStep test "shows the safety net as one row" (red first, then green);
  five gates exit 0; token-guard PASS; harness: no frame, orange dots, no horizontal overflow.

## 2026-09-29 — Tindak lanjut is one row: "Kontrol 3 hari"

- Decision (Chief: "Tindak lanjut simplified, cukup kontrol 3 hari atau sejenisnya"): the
  Tindak lanjut part is one row, "Kontrol" with an interval picker (`CONTROL_AFTER_OPTIONS` in
  `tatalaksana.ts`: 3 hari, 1 minggu, 2 minggu, 1 bulan; default 3 hari). The RME anamnesis
  gets `rencana_tindakan` "Kontrol <interval>". The knowledge-base `tindak_lanjut.kontrol`
  paragraphs (for the chosen diagnosis and "Kontrol rutin · <chronic condition>") no longer
  appear on the page or in the RME; `buildFollowUp`/`FollowUpView` were removed. The Ringkasan
  row "Tindak lanjut" (a count of schedules) is gone: the value would repeat the row above.
- Assumptions (Chief can change them): the four intervals and the 3-day default for every
  diagnosis, chronic ones included. `DiseaseNote.followUp` in `useDiseaseNotes.ts` still parses
  the KB field but nothing reads it.
- Evidence: TatalaksanaStep test "says the follow-up in one short row"; rme-transfer e2e now
  picks "1 minggu" and expects `rencana_tindakan: 'Kontrol 1 minggu'`; five gates exit 0;
  token-guard PASS; harness: row "Kontrol [3 hari]", picker 86 px wide, "1 minggu" sticks.

## 2026-09-29 — The Sentra logomark on every Edukasi card

- Decision (Chief, sending the white Sentra mark: "di card masing masing kasih logo Sentra"): each
  education card shows the Sentra logomark, 56 px wide, centred between the number and the point.
  The capsule already had the same mark (`public/icon/sentra-hai-logomark.png`), so no new asset;
  it is decorative (`alt=""`) and takes no pointer events, so a drag that starts on it still
  moves the card.
- Evidence: labMotion.test.tsx "carries the Sentra logomark on every card, as decoration"
  (red first, then green); five gates exit 0; token-guard PASS; harness: 8 cards, logo loaded
  on each, no face overflows, a drag started on the logo brings card 02.

## 2026-09-29 — Edukasi deck in the reference's own design; the tick on a card gives

- Decision (Chief, after seeing the first deck: "gunakan design asli motion
  https://lab.xevrion.dev/lab/swipe-deck, cuma isi dengan edukasi pada masing masing card, swipe
  ganti edukasi selanjutnya"; for giving he chose "Centang di kartu"): the deck holds every
  education point and looks like the reference: a centred portrait card (256 px wide, at least
  320 px tall, radius 24 px, padding 24 px) with its number ("01") on top and the point below
  (first sentence as the title, the rest as the note), and two round arrow buttons ("Geser ke
  kiri" / "Geser ke kanan"). A swipe either way (drag, flick, buttons, ArrowLeft/Right) only
  brings the next point; the top card goes to the back. The tick on the card (`PenCheck`, as on
  the therapy cards) gives or takes back the point. The numbered given list, "ubah"/"hapus" and
  "Belum ada edukasi yang diberikan." are removed so nothing is written twice; the "Edukasi N"
  count stays. Supersedes the 2026-09-29 entry below (right gives, left skips).
- Details: both buttons are disabled with one point; held keys are ignored; cards beyond the
  third are hidden and take no pointer events (in the harness the 8th card, 84 px lower,
  covered the arrow buttons); the deck still sizes to its tallest card; reduced motion swaps
  cards without flights or springs. Tokens only (`--neu-inset-bg`, `--border-subtle`,
  `--neu-shadow-card`, `--text-main`, `--accent-med`, `--sentra-safe-border`); the face no longer
  uses `neu-select`.
- Evidence: labMotion.test.tsx (10 tests: every point, title/note, swipe moves on and gives
  nothing, tick gives/takes back, held key, one point, reduced motion, reconcile, hidden cards);
  TatalaksanaStep, DiagnosisStepFlow and rme-transfer e2e migrated (named in the commit); five
  gates exit 0; token-guard PASS; harness: right ×3 → 04, left → 05, drag moves on, tick →
  "Edukasi 1", a long point grows the deck (390 px) above the buttons, no horizontal overflow.

## 2026-09-29 — Edukasi as a swipe deck (right gives, left skips)

- Decision (Chief, on the Edukasi part: "section ini gunakan motion FX
  https://lab.xevrion.dev/lab/swipe-deck"; he chose right = berikan, left = lewati): the points
  not yet given are a card deck (`EducationDeck` in `labMotion.tsx`, adapted from xevrion ui-lab
  "Swipe deck", MIT). The top card is thrown right (drag/flick, "Berikan", ArrowRight) to give it
  (`onToggleEducation`), left ("Lewati", ArrowLeft) to put it at the back; three cards show, the
  rest step forward. It replaces "+ Tambah edukasi" and the long picker (one entry point); the
  numbered given list with "ubah"/"hapus" is unchanged. Supersedes item 5 of the 2026-09-28 entry
  below.
- Details: throw at > 120 px or > 400 px/s; held keys and the second click of a double-click are
  ignored; "Lewati" is disabled with one card; the last card flies out before the deck goes and
  focus moves to "ubah"; flying copies take no pointer events; the deck sizes to its tallest card
  (grid, one cell), so long knowledge-base points (up to 411 characters) never spill onto the
  buttons; reduced motion swaps cards without flights or springs.
- Like the focus underline and the selection trace, this motion is Chief's explicit exception to
  "steady like a console", confined to the deck.
- Evidence: labMotion.test.tsx (throwDirection, give/skip/keys/double-click/last card),
  TatalaksanaStep, DiagnosisStepFlow and rme-transfer e2e tests migrated (named in d2dcd08d);
  task review + 2 fix rounds, final review (opus) + fix wave 9fbb52e5, token-guard PASS; Chrome
  harness: right drag gives, left drag skips, ArrowRight ×6 gives all and focus lands on "ubah",
  a 412-character point fits at 384 px (deck 187 px) and 260 px (237 px), no horizontal overflow.

## 2026-09-29 — Tatalaksana without "Keamanan terapi"; audit of its functions

- Decision (Chief: "hilangkan Keamanan terapi"): the part is gone (ticked lines, "Perlu review" box,
  "Lihat detail"). What only it said moved onto the cards: the same drug elsewhere in the plan
  (chronic + chosen) is a "duplikasi: <name>" line in the card's DDI node, orange; "memeriksa…" /
  "tidak dapat dicek" were already there. Ringkasan "Safety check" keeps the count. "Lanjut tanpa
  terapi tambahan" now scrolls to Edukasi.
- Audit (Chief: "please check the function and algorithm"), each with a test that failed first:
  - `drugKey` was the first word: "Asam mefenamat" = "Asam folat", "Vitamin C" = "Vitamin B6",
    "BLUD Amlodipin" ≠ "Amlodipin". Now the words before the form or strength, with "BLUD", salts
    and form words dropped and one spelling (x→ks, c→s/k, doubled letters, final e): amoxicillin =
    amoksisilin, paracetamol = parasetamol. Also used to match the chronic history.
  - `allergyMatches` missed "Amoxicillin" in "Amoksisilin kapsul"; now compares the same spelling.
  - `strengthOf` read "100.000 IU" as 100; a thousands dot is now thousands.
  - `formatDose` multiplied a percentage ("2x1" of a 0,1 % cream → "2x0.1%"); a % stays as written.
  - The summary said "✓ Aman" when the interaction check could not run; now "interaksi obat tidak
    dapat dicek" (orange).
  - ClinicalDifferential wrote "• -" for an empty duration; the part is left out.
- Checked and left: `searchStock`, `nameBesideDose`, `buildChronicMedications`, `explainInteraction`,
  `reviewSafety` interactions, `buildFollowUp`, `buildSafetyNet`, `standardDoseFor`. Open: a class
  allergy (penisilin → amoksisilin) is not detected; that needs a clinical class table (R3).
- Evidence: tatalaksana.test.ts (4 new), TatalaksanaStep test (1 new, 5 migrated),
  final-page test (1 new assertion); harness J20.9: no "Keamanan terapi", BLUD Amlodipin added →
  "duplikasi: Amlodipin 10 mg" on the visit card, "duplikasi: BLUD Amlodipin tablet 10 mg" on the
  chronic card.

## 2026-09-29 — A selected card is circled by one moving line, not framed in green

- Decision (Chief, on a selected Tatalaksana card: "Ini jg efek visual yg saya gak suka. Gunakan
  motion futuristic single line bergerak mengitari kotak"): a selected `.diagnosis-candidate-row`
  (Tatalaksana therapy cards and Diagnosis page cards, one shared rule) keeps its plain
  `--border-subtle` border and no left bar; `SelectionTrace` (`labMotion.tsx`) draws one
  `--accent-med` segment (16 % of the edge) that travels the card's inner edge once every 4 s, at
  an even pace whatever the card's size (`pathLength` 100). Reduced motion shows the whole line
  still. The Temuan finding chips (`.diagnosis-medication-row`) keep their pressed style.
- Like the focus underline, this is motion Chief asked for; the steady-console rule still bars
  elastic layout motion.
- Evidence: TatalaksanaStep test (only the selected card has the trace); harness J20.9 and
  `?step=diagnosis` → "ubah": border rgba(255,255,255,0.06), box-shadow none, one running
  `dx-trace` animation, rect length ≈ card perimeter (1072 px on a 382 × 165 card).

## 2026-09-29 — Tatalaksana: a picked stock medicine brings its standard dose and signa

- Decision (Chief: "keduanya terisi otomatis dengan dosis minimal dan standard sesudah/ sebelum
  makan atau signa lain", then "Cari dulu referensi"): picking a Puskesmas stock item in "Nama
  obat" fills Dosis and Aturan pakai (and Durasi "1 hari" for a single dose) from
  `components/clinical/diagnosis/standardDose.ts`; an item with no entry clears the dose. A
  prefill the doctor edits, never a prescription of its own.
- Rules: the lowest standard adult regimen the chosen strength makes in whole units ("NxM"; the
  RME signa reads nothing else); a rule fires only for the strengths its source covers. Syrups
  and drops by mouth get the signa only (weight-based dose). Eye, ear and skin preparations are
  written like the prescription templates ("6x1 tetes", "2x aplikasi") with "Pemakaian luar".
  Nothing for injections, infusions, vaccines, TB/HIV/KB programme regimens, specialist-titrated
  psychiatric drugs, and items the sources leave open (Tablet Tambah Darah, zinc for adults,
  vitamin B kompleks, multivitamin, fenol gliserol, nistatin vaginal).
- Sources (one per rule, in the file): PIONAS BPOM (503 on 2026-09-29, read via the Wayback
  Machine), PPK 2022 (KMK HK.01.07/MENKES/1186/2022), Pedoman Pengobatan Dasar di Puskesmas 2007,
  BPOM labels; FDA DailyMed / EMC only for meal timing. Where the sources leave meal timing open,
  "Sesudah makan" is the prescribing convention, marked "konvensi".
- Conflicts resolved: kaptopril "Sebelum makan" (FDA) over "any time" (EMC); domperidon 3x10 mg
  (BPOM label) over PIONAS 10-20 mg; prednison 2x5 mg (PPK) over 10-20 mg once in the morning
  (PIONAS); metformin 1x500 mg (PIONAS start dose) while the reasoner template gives 2x1;
  metronidazol 2x500 mg (PPK vaginosis, the lowest) though amebiasis uses 3x500 mg.
- Not R3: `lib/clinical/dosage-database.ts` (R3, six weight-based drugs, no meal timing) is left
  unchanged; the table is a UI prefill beside it. Clinical sign-off of the table is Chief's.
- Evidence: `standardDose.test.ts` (8 tests, including every stock item's dose being NxM, drops or
  applications); TatalaksanaStep test picks Amlodipin 10 → 1x1 Sesudah makan, Omeprazol 20 →
  1x1 Sebelum makan, Permetrin → 1x aplikasi, Pemakaian luar, 1 hari, Haloperidol → dose
  cleared; harness J20.9: Omeprazol picked → card "1x20mg • Sebelum makan".

## 2026-09-29 — Diagnosis form fields: one green line under the field on focus

- Decision (Chief: "rubah design hilangkan garis major hijau begitu ganti dengan 1 line garis di
  bawah berwarna hijau smooth motion"): a focused `.diagnosis-input` (the Tatalaksana manual
  medication form, the Diagnosis page's fields) draws no green frame, ring or outline; a single
  1 px `--accent-med` line under the field grows from its middle (`--duration-engine`,
  `--ease-neu`) and folds back on blur. Reduced motion shows it at once. The line is a background
  layer over the field's own `--neu-inset-bg` (a gradient in dark, a colour in light), so the fill
  stays (token-guard caught a first version that erased the dark fill). Appended to style.css;
  the global `.diagnosis-input:focus-visible` outline and the `.neu-select:focus` ring are
  overridden; the focused field is flat (no inset shadow).
- This is the one smooth motion Chief asked for after the "steady like a console" rule: a focus
  indicator, not layout motion.
- Evidence: harness J20.9: the focused field computes outline none, box-shadow none, border
  unchanged, both background layers present; the line's size sampled at 0 %, 66 %, 90 %, 97 %,
  100 % over ~430 ms, the field left behind back at 0 %; with `data-theme='light'` the fill is
  rgb(21, 23, 25) under the light accent line.

## 2026-09-29 — Steady like a console: no rubbery motion on the diagnosis pages

- Decision (Chief: "Adhu saya gak suka banget Ui gerak gerak kaya karet gini, make it steady like
  real world console"): on every diagnosis page (Temuan, Diagnosis, Tatalaksana, the step flow and
  its receipts) nothing animates its size, position or scale. Removed: height springs of every
  panel (`Collapse`, ReasonTimeline, BedsideCheck; `PANEL_OPEN`/`PANEL_CLOSE` gone), `layout` /
  `layoutId` glides (cards, receipts folding into steps, education points moving lists), step
  slides, staggered entries (parts, cards, chips, timeline entries and their growing hairline),
  `whileTap` squash, spring-rotating chevrons (now the glyph flips ⌄ / ⌃), the rolling-number
  odometer (plain numbers), the drawn pen stroke (the tick is shown or not), the morphing
  "Selesai" (it closes at once), smooth scrolls and the "Lihat detail" pulse (jumps to the reason),
  the pixel loader's scale and ripple (cells switch on and off). Kept: the hold-to-Hapus fill (the
  only way to see how long is left to hold) and the pixel loader's frame cycle while checking.
- The Tatalaksana stock list under "+ Tambah obat" now opens over the fields below (a temporary
  overlay with `--neu-shadow-card`) instead of pushing them down; under "Ganti" it stays in the
  form's flow, because the card's own `overflow: hidden` would clip an overlay (token-guard). Its
  entry keyframes, stagger and `transition: all` are off. A pixel-loader cell that is off is dimmed
  by `[data-on='false']` in CSS; an unchecked PenCheck renders no path (no inline values).
- Supersedes the motion parts of this day's entries "push to the Max. Penggunaan Motion" (lab.xevrion
  motion) and "masing masing terapi … beri motion … activity-timeline": the timeline layout (icon
  nodes, hairline) stays, its motion is gone. Style.css comments that still describe motion
  (e.g. the `.dx-timeline` block) and the unused `.dx-roll*` rules stay, the file being append-only.
- Evidence: harness viewed (`dx=3-J20.9`, `step=diagnosis`): `document.getAnimations()` is 0
  after load, after opening Review, the education picker, the manual form, the stock list and
  "Lihat alasan"; the Keamanan part sits at the same page offset with the stock list open and
  closed (2449.4 px both). Tests unchanged (none asserted on motion).

## 2026-09-29 — Tatalaksana: the medicine name comes from the Puskesmas stock

- Decision (Chief: "saat user ketik obat ... harusnya sudah connect dengan database obat
  puskesmas. Misal saya ketik Am...(keluar lodipin)"): the "Nama obat" field of "+ Tambah obat" and
  "Ganti" searches `public/data/stok_obat.json` (Puskesmas Balowerti, 277 items) as it is typed:
  `searchStock` in `tatalaksana.ts`, from two letters, every typed word must begin a word of the
  name, group `OBAT` only (BMHP, reagents and devices left out), at most six, names that begin with
  the first typed word first, then in stock, then A–Z. Each row shows the stock ("47884 Tablet") or
  "habis"; out-of-stock medicines are still offered, after the rest, because a doctor may still
  prescribe them. Mouse or ArrowUp/ArrowDown + Enter pick; Escape and blur close. Free text stays
  allowed (a medicine not in the stock can still be written).
- The list reuses the existing dropdown classes (`history-dropdown`, `option-item`); three rules are
  appended to style.css: the panel sits in the form's flow without the overlay shadow (the form
  opens inside an overflow-hidden collapse, which would clip an absolute panel), the stock count
  stays muted, and the row the arrow keys reach keeps an `--accent-med` border (the shells'
  `button:not(:hover)… { border-color … !important }` rule would otherwise hide it; same
  specificity, later in the file).
- Evidence: harness J20.9 viewed: "Am" lists Amitriptilin, Amlodipin 10 / 5 mg, Amoksilin,
  Amoksisilin kapsul, Amoksisilin sirup with stock; picking "Amlodipin tablet 10 mg" with dose
  "1x1" adds a card "Amlodipin tablet · 1x10mg" and Keamanan reports the duplicate with the
  chronic Amlodipin. Tests: `searchStock` (3), TatalaksanaStep "offers the Puskesmas stock…".

## 2026-09-29 — Tatalaksana without red: findings are orange

- Decision (Chief: "warna merah di ganti orange"): on the Tatalaksana page every red becomes the
  warning token `--sentra-warning` (orange): the DDI partner and node, a contraindication, the
  "⚠ Perlu review" box and the Safety net box (the existing `diagnosis-readonly-field--warning`),
  the Keamanan pixel loader and pen check, the Ringkasan safety state and the "Hapus" hold fill.
  MUST NOT MISS on the diagnosis page stays red (Chief, 2026-09-28). The earlier red rules of this
  page (`.dx-tx-danger`, `.dx-tx-node--danger`, `.dx-pen-check--danger`) are no longer used; they
  stay in style.css because the file is append-only.
- Evidence: Med Assist commit after `d4452590`; harness J20.9 viewed: no element on the page
  carries a danger class, the warning colour computes to rgb(245, 158, 11); test "marks findings
  orange, never red".

## 2026-09-29 — Tatalaksana: why a DDI, and a muted medication history

- Decision (Chief: "DDI : beri penjelasan kenapa ?" and, for the "Review" history rows, "buatkan
  design text yang seperti warna text \"kontraindikasi\" tidak terlalu terang"):
  1. DDInter (`ddi-checker.ts`, R3, unchanged) stores the severity of a pair only; its description
     is one generic sentence per severity. The mechanism therefore comes from the curated pair
     table already in the capsule (`lib/api/mocks/ddi-mock.ts`, "Based on Lexicomp / Micromedex",
     about twenty pairs, used today as DDInter's fallback) through `explainInteraction`. A pair it
     does not list says "Mekanisme tidak tercatat di DDInter." with DDInter's advice; nothing is
     composed. The severity shown stays DDInter's (the table rates amlodipine + simvastatin
     moderate, DDInter major).
  2. The reason and "Saran" sit in the DDI node, muted, once per pair: on the first card on the page
     holding either drug (chronic cards first, then the visit slots). The other card names the
     partner and severity only. Keamanan's "Lihat detail" no longer repeats the reason; it scrolls
     to it and pulses it twice.
  3. The "Review" history rows use the muted label style (`diagnosis-row-meta`), the date in the
     label column so the rows line up with the node labels, a hairline above; dose and diagnosis
     each stay whole when the panel is narrow.
- Open for Chief: clinical review of the curated table's wording, and whether a larger mechanism
  source is wanted (the table covers few pairs).
- Evidence: Med Assist commit after `fcae2482`; harness J20.9 viewed (reason on the Amlodipin
  card only, "Lihat detail" scrolls from the bottom to it, the history rows muted).

## 2026-09-29 — Tatalaksana revision: dose notation "1x10mg" and therapy cards as a timeline

- Decision (Chief: "Penulisan dosis yang saya suka : 1x10mg (misal)" and "masing masing terapi
  antar nama obat-dosis-ddi-kontra beri motion https://lab.xevrion.dev/lab/activity-timeline"):
  1. Doses read frequency x strength per take: `formatDose` (tatalaksana.ts) compacts a dose that
     names its strength ("2x500 mg" → "2x500mg") and turns "3x1" into "3x500mg" from the name's
     strength, times the amount per take ("3x2" of 500 mg → "3x1000mg"); anything else stays as
     written. Used for proposals and manual entries (ClinicalDifferential) and the chronic
     history fallback; the history parser already wrote "1x10mg". The dose text turns off Inter's
     contextual alternates so "x" is not drawn as "×". The card title drops the strength when the
     dose line carries it (`nameBesideDose`).
  2. Each therapy card is the Activity timeline already used for the diagnosis reasons: nodes for
     name, dose, (indication for chronic,) DDI and contraindication, joined by a hairline; the
     entries settle one after another and each line grows to the next node, once, when the card
     appears (the ReasonTimeline variants, now exported). A serious DDI or a contraindication
     turns its node red. Nothing moves again when a value changes.
- Evidence: Med Assist commit after `fa873492`; harness viewed (J20.9: "1x10mg", "3x500mg", the
  hairline 12 px between nodes; a newly added card starts at opacity 0 and line scale 0 and
  settles at 1).

## 2026-09-29 — Tatalaksana: one page for therapy, safety, education, follow-up and safety net

- Decision (Chief's layout, same day: "Seperti ini urutan nya … TATALAKSANA", "push to the Max.
  Penggunaan Motion", "Ambil motion yang menurut kamu cocok dari sini https://lab.xevrion.dev/"):
  1. Four steps: Temuan (1 / 4), Diagnosis (2 / 4) | Tatalaksana (3 / 4) | RME (4 / 4). Terapi
     and Edukasi are no longer steps; `steps/TatalaksanaStep.tsx` replaces `TherapyStep` and
     `EducationStep`. Parts in Chief's order: Terapi kronis, Terapi kunjungan ini, Keamanan
     terapi, Edukasi, Tindak lanjut, Safety net, Ringkasan, "Selesai". The page closes only on
     "Selesai" (enabled once a medication is chosen or "Lanjut tanpa terapi tambahan" was
     decided); "Lanjut tanpa terapi tambahan" clears the selection and stays on the page.
  2. Terapi kronis: the chronic therapy names already given to the page, each with its dose from
     the latest visit that prescribed it and, as "Indikasi", the diagnosis those visits recorded
     most often (`buildChronicMedications`, visit store via `usePatientVisits`). "Review" only
     shows those visits (date · dose · diagnosis); it prescribes nothing and changes nothing.
  3. Terapi kunjungan ini: slots 01 Utama / 02 Adjuvant / 03 Vitamin by the engine's `role`, else
     the RME mapper's own keyword rule (`classifyRole`, now exported). A tap toggles; "Ganti"
     opens the manual form under the card and drops the card once the new medication is added;
     "Hapus" needs a 900 ms hold (the reference holds 2 s) and removes a proposal from the page
     and the prescription for the encounter (`dismissedMedicationKeys`), a manual entry through
     its own remove. "+ Tambah obat" is the one entry for the manual form; the "Basis: … hapus"
     line is gone, so a diagnosis chosen without a card now has its own "hapus" on page 1.
  4. Keamanan terapi, over the chronic and the chosen visit medications: duplicates by first word,
     major or contraindicated interactions from the local DDInter check (`checkInteractions`,
     chronic + every candidate, so cards show their own DDI), and contraindications from a named
     allergy or the prescription service's list. A passed check is ticked; a found one is listed
     under "⚠ Perlu review" with "Lihat detail"; a check that could not run is said, never ticked.
  5. Edukasi: numbered points given; "+ Tambah edukasi" lists the rest; "ubah" removes. The
     "Kontrol: …" row left the education list for Tindak lanjut.
  6. Tindak lanjut: `tindak_lanjut.kontrol` for the chosen diagnoses ("Kontrol") and, for each
     chronic condition not chosen, "Kontrol rutin · <name>", verbatim. The visit follow-up now
     goes to the RME anamnesis `rencana_tindakan` (whole items within 250 characters; the generic
     line only without one).
  7. Safety net ("Segera kembali / rujuk bila"): the chosen diagnoses' knowledge-base
     `red_flags`, verbatim. This overrides point 4 of the previous entry for this page only, on
     Chief's layout; the diagnosis page still never lists red flags (its test now renders page 1).
  8. Ringkasan counts, it does not repeat: diagnosis, chronic and visit medication counts,
     education points, number of follow-up schedules, safety state.
  9. Motion from lab.xevrion.dev (MIT, `labMotion.tsx`): pen-stroke check ("Scribble checkbox") on
     chosen cards, safety lines and education; rolling counts ("Odometer"); hold fill ("Hold to
     delete"); the pixel loader ends on its pixel check when the interaction check is done; the
     accordion springs of the diagnosis cards for "Review" and "Lihat detail"; parts rise in once
     when the page opens; "Selesai" morphs to "✓ Selesai" before the page closes. Only what the
     doctor opens moves afterwards (checked in the harness: toggling a card moves no other part).
- Limits: proposals still come only from the remote Sentra API (open for Chief). The knowledge
  base's `red_flags` for some entries are complications, not return criteria (J20: "Pneumonia.",
  "Pleuritis."); shown verbatim, for Chief's clinical review. DDInter matches names partially.
- Evidence: Med Assist commit after `4db92cdb`; Vite harness viewed (J20.9 with two chronic
  medications and the Amlodipin + Simvastatin major interaction, J18.9 without education, hold,
  Ganti, Selesai to RME).

## 2026-09-29 — What the Diagnosis page hands to Terapi and Edukasi

- Decision (Chief: "menyambungkan informasi yg di dapat dari halaman diagnosis ke halaman
  selanjutnya yaitu Therapy dan Edukasi"; the defaults below are mine, taken without a question):
  1. Three pages (Chief, same session: "Saya prefer membuatkan halaman baru untk terapi dan
     edukasi"): Temuan and Diagnosis; Terapi and Edukasi; RME. Edukasi is its own step (4 / 5)
     after Terapi and ends on one "Lanjut"; RME (5 / 5) is the third page. Each page carries
     nothing of the pages after it (no RME ghost on the second page) and keeps the earlier
     receipts on top. This overrides the 2026-09-28 lines "the first page (Temuan, Diagnosis,
     Penunjang and Edukasi)" and "Terapi and RME are the second page"; Penunjang stays a link. The
     old Edukasi link showed the top card's review items (plus the literal "Correlate with
     examination"), neither the doctor's chosen diagnosis nor patient education.
  2. It lists, for the diagnoses the doctor chose, the knowledge base's
     `advanced_guideline.kie_edukasi.untuk_pasien` and `tindak_lanjut.kontrol` (as "Kontrol: …")
     verbatim, a point shared by two diagnoses once (`components/clinical/diagnosis/education.ts`,
     read through `useDiseaseNotes`; the knowledge base is not changed). Nothing is composed for a
     code without them (21 of 159 entries have them; MIRA-only codes such as K65 and K35 have no
     entry): the page says "Basis pengetahuan belum punya edukasi untuk diagnosis ini."
  3. The doctor ticks what was given ("diberikan"); nothing starts ticked, because an untouched
     point is not a record that it was given. The ticked points go to the RME anamnesis `edukasi`
     field instead of the random generic line, whole and in order, as many as fit the
     250-character RME text limit (a cut point would record half an instruction). With nothing
     ticked the random line stays, as before.
  4. No "kembali bila" list from red flags: the Triage page owns the danger signs and the
     diagnosis page never repeats them (2026-09-28 rule and its test).
  5. The prescription request (`getRecommendations`) now carries `penyakit_kronis`: the confirmed
     chronic diagnoses the page shows plus the visit-history diagnoses labelled "Kronis"; it was
     always `[]`. The recorded bedside findings are not sent there (no field for them).
  6. Terapi says "Tidak ada usulan obat dari layanan resep." when the prescription service
     answered with no proposal or failed, instead of showing an empty list.
- Limits: proposals come only from the remote Sentra API (`/v1/cdss/prescribe`); the local
  pipeline in `sentra-api.ts` is unreachable (docs/ARCHITECTURE.md §5.4, R3, open for Chief). No
  `VITE_SENTRA_API_URL` is set in the local env files, so the request goes to the default
  `https://api.sentra.local` and is expected to fail: Terapi then shows the line from point 6.
  What the remote engine does with `penyakit_kronis` cannot be seen from this repository.
- Evidence: Med Assist commit after `53168078`; Vite harness viewed (J06.9 with education and
  ticks, J18.9 without, the no-proposal line, no Edukasi on the first page, the RME page with
  four receipts and "Edukasi · 2 poin diberikan").

## 2026-09-28 — Clinical reasoning loop: three-state findings, the doctor's diagnosis kept, what changed shown

- Decision (Chief's specification, same night):
  1. Every recorded finding has three states: ditemukan (present), tidak ditemukan (examined,
     absent) and belum diperiksa (unknown, the start). A list finding cycles through them on a
     tap; a question, a named sign or an unmatched step is one finding answered with two words
     (Ya/Tidak, Positif/Negatif, Abnormal/Normal for "Kelainan"). "Semua/Sisanya tidak
     ditemukan" is the doctor's explicit word, never implied by an untouched item.
  2. `encounterToCaseState` sends present as "— DITEMUKAN" and absent as "— TIDAK DITEMUKAN"
     (physicalExam, results; a yes/no question as qa Ya/Tidak) and leaves unknown out, so it can
     never become negative evidence. MIRA's assessment rules (`assist/service/prompts.py`) say
     what the two words mean and that an unlisted finding was not examined. An earlier checkbox
     record (`findings: string[]`) reads as present for the ticked names and unknown for the
     rest, never absent.
  3. A rerun caused only by a recorded finding keeps the doctor's diagnosis, therapy and
     medications; other input changes still start over. The selection key is by ICD code, not
     rank, so a reranked card stays chosen. When MIRA's proposal differs from the choice, the
     primary slot keeps the choice and says "MIRA sekarang menyarankan: …"; a choice with no
     card (manual, or no longer listed) holds the primary slot as a plain row.
  4. On "Simpan" the page keeps the assessment it showed (MIRA's own arrangement: proposal,
     MUST NOT MISS, two banding cards, the Next best step) and compares it with the next answer
     (`assessmentDelta.ts`, deterministic, no model call). Cards show "↑/↓ sebelumnya <place>",
     "Baru muncul", up to two new supporting/opposing findings, and "Data kurang a → b"; a card
     gone from the page is named once; a changed Next best step lists "Berubah setelah:" with
     the recorded findings (timing, not cause). Nothing is compared against a fallback list.
     While the doctor has a diagnosis chosen the page is arranged around it, so no place mark is
     shown (it could contradict the label above a card) and a card still on the page is never
     named as gone; evidence and Data kurang marks stay. "MIRA sekarang menyarankan" shows
     whenever MIRA's proposal differs from the choice, also before a rerun.
- Rationale: Chief: "Not documented, not checked and not present are three different clinical
  states"; the physician remains the final decision-maker; show what changed after a finding.
- Limits: tested with mocks and the synthetic Vite harness only; the MIRA service was not
  running, so whether MIRA uses the negative findings as intended is not verified live. The
  delta only compares the latest two assessments (no history). Present and absent share the
  pressed style; the state word tells them apart.
- Evidence: Med Assist commit after `c8dccf33`; MIRA repo commit on `feat/reasoning-service`
  (prompt rule and test).

## 2026-09-28 — Diagnosis page revision: ticked findings, real MUST NOT MISS checks, two pages

- Decision (Chief's six-point revision, same evening):
  1. Catatan gives practical bedside guidance from `penyakit.json` (what to examine, when to
     refer) instead of a bare "Review faring"; generic engine notes are dropped.
  2. "Apa yang perlu diperiksa" on a MUST NOT MISS card opens a tick list: the knowledge
     base's `pemeriksaan_fisik` for the code ("Tidak ditemukan" first) when it has them,
     otherwise the card's own Data kurang (its gaps plus MIRA's `missingInformation`), which
     then is not listed in the reasons as well. "Masukkan hasil" appears once on the page, on
     the Next best step: a first build listed MIRA's other next best actions under MUST NOT
     MISS, each with its own "Masukkan hasil", and Chief asked why there were two.
  3. At most two "Diagnosis banding" cards; no "Lainnya".
  4. Terapi and RME are the second page. The first page (Temuan, Diagnosis, Penunjang and
     Edukasi) carries nothing of them, not even ghosts; the second keeps the Temuan and
     Diagnosis receipts on top, whose "ubah" goes back. The "Basis:" line in Terapi stays
     although it repeats the Diagnosis receipt right above it: removing it (`e309efd0`) left a
     manual diagnosis with no way to be removed and a second chosen diagnosis shown nowhere,
     so `400c94ca` restored it; how to drop the repeat is open for Chief.
  5. "Masukkan hasil" on a next best step opens options to tick instead of a text field
     (`components/clinical/diagnosis/bedsideFindings.ts`: lung sounds, heart, abdomen, CVA,
     pharynx, meningeal, hydration, JVP/edema, neuro, skin, ear, sinus; CBC, CRP, glucose,
     urine, EKG, x-ray, SpO2, malaria, dengue, typhoid, pregnancy; a named sign is
     Positif/Negatif, a question Ya/Tidak, anything else Normal/Abnormal). "Simpan" sends the
     record back to the engine as `bedside_findings`, mapped into MIRA's CaseState
     (`anamnesis.qa`, `physicalExam`, `results`); the Temuan receipt lists it right after the
     main complaint.
- Rationale: Chief: "dokter cukup centang apa temuannya, system provide misal Ronki,
  Wheezing"; "Apa yang perlu diperiksa → belum ada data?? carikan data, wiring it"; "Terapi
  dan RME masuk halaman selanjutnya".
- Limits: the option catalogue is input vocabulary, not diagnostic logic, and its clinical
  wording is for Chief's review. Codes absent from the knowledge base (K65, K35) offer the card's
  Data kurang; bedside exams per code need knowledge-base entries (R3, Chief) or a MIRA
  contract field. The legacy engine ignores
  `bedside_findings`. Saving a finding asks the engine again (a new case key, so MIRA runs
  live) and clears a chosen diagnosis and manual medications.
- Evidence: `e753ad58`, `4e65703d`, `44c43b40`, `e309efd0`, `400c94ca` and the one-entry fix after it; Vite harness
  checked (tick list, receipt, MUST NOT MISS panel, both pages; a MutationObserver shows only
  the opening panel changes style when "Masukkan hasil" opens).

## 2026-09-28 — The side-panel column holds still while one part opens ("konsol nyata")

- Decision: opening a card's reasons animates only that panel (height, entries, lines, chevron);
  no other element scales or slides. Every framer-motion `layout` animation on the page is
  scoped with `layoutDependency` to the one event that should move it: the step wrapper,
  receipts and ghosts to the active step, the cards to the chosen diagnosis. New content goes
  inside an existing grid child, so no gap appears at once. Tap feedback sits only on the element
  being tapped.
- Rationale: Chief, on the live render: the dropdown was right but the column swayed
  ("bergoyang", "bergelayut"); "ANGGAP KOLOM INI ADALAH CONSOL NYATA".
- Evidence: `4df3887c`, measured with a MutationObserver on every style change in the column.

## 2026-09-28 — Diagnosis step follows Chief's mockup: utama, must not miss, banding, next best step

- Decision: the Diagnosis step reads, top to bottom, "Usulan diagnosis utama" (or "Diagnosis
  utama" once chosen), MUST NOT MISS (MIRA cannot-miss cards, outside the three-card cap),
  the numbered "Diagnosis banding N" cards (the rest behind "Lainnya (n)"), and NEXT BEST STEP
  (MIRA's first next best action, its reason, "Masukkan hasil"), separated by
  `console-divider`. Each card: title and chip, the `penyakit.json` definisi clamped to three
  lines, a tally row "✓ Mendukung n  − Menentang n  ? Data kurang n", and "Lihat alasan ⌄"
  ("Mengapa perlu dipertimbangkan ⌄" on MUST NOT MISS) opening the reasons timeline (Riwayat,
  Mendukung, Menentang, Data kurang, Catatan; on MUST NOT MISS: Temuan yang relevan, Bila
  terlewat with the `komplikasi`, Data kurang, and "Apa yang perlu diperiksa →").
- Nothing is said twice on the page (Chief, same evening, on the live render: "sekalian aja
  kamu tulis 200x", "Must not miss vs jangan terlewat vs ojo lali"): the MUST NOT MISS label is
  the only cannot-miss marker (no "Jangan terlewat" chip, no red "Jangan terlewat:" line; this
  closes the open question on that line), no "Diagnosis banding" title above the numbered
  labels, no count in the timeline (the tally carries it), one term "Data kurang", and a
  toggle's text is not repeated as the first heading it opens. This overrides the mockup,
  which showed several of these.
- Rationale: Chief pasted the layout as a mockup; it supersedes the banding-first order of
  `9f76dd66` and the "Tap here" label of `12ec57c6`. The next best step shows only engine data
  (no fallback), so the legacy engine shows no such section.
- Evidence: commits `ca874859` (layout), `2f2d70f2` (`next_best_actions` from MIRA through
  `run-diagnosis.ts` and `ClinicalDifferential`), and `c5b5ef88` (repeat removal).

## 2026-09-28 — Diagnosis page is a step flow (form B)

- Decision: `DiagnosisStepFlow.tsx` replaces `DiagnosisWorkspace.tsx` as the diagnosis page
  component (mockup form B, "fokus berjalan"): a `SafetyStrip` (danger signs and triase, never
  behind a click, rendered whenever it has content) at the top, one receipt line per finished
  step ("✓ <Step> · <chips> · ubah"), one active step in full, then ghost lines for the remaining
  steps ("3 · Terapi"). Steps are Temuan (Finding), Diagnosis, Terapi, RME, derived by
  `diagnosisSteps.ts` and read by `createDiagnosisPageViewModel`'s `steps` array, replacing
  `DiagnosisProgressStepper.tsx` and `StagedSection` (both deleted, along with
  `TherapyReviewPanel.tsx`, whose content moved into `TherapyStep.tsx`). Terapi advances only on
  an explicit "Lanjut" (with at least one medication selected) or "Lanjut tanpa obat" — not
  merely because a medication was tapped — so the step ends on the doctor's confirmation, not as
  a side effect (controller ruling; the plan's original "done when a medication is selected" rule
  was a defect that would have hidden the step after the first tap). Temuan is forced done in the
  flow (mockup B) so Diagnosis is the active step immediately, with its own loading skeleton and
  screen-reader text while data is not yet ready. The page uses one body size (13 px) throughout;
  step heading 14 px semibold; receipts and ghosts 11 px.
- Rationale: a doctor works one question at a time instead of scanning a fully expanded page, but
  safety-critical content (danger signs, triage) must never be gated behind a click or a step
  boundary — the safety strip sits outside the step sequence and is never collapsed.
- Evidence: commits `399c9937`, `792b9bf2`, `b6a67cd7`, `f22a222b`, `7ed5ed2c`. Tests:
  `DiagnosisStepFlow.test.tsx` (active step render, receipts, ghosts, "ubah" re-open, safety strip
  always present and uncapped), `SafetyStrip.test.tsx`, `StepReceipt.test.tsx`,
  `TherapyStep.test.tsx` ("Lanjut" / "Lanjut tanpa obat"); the six old page test files
  (`ClinicalDifferential.helpers.test.ts`, `.final-page.test.tsx`, `.logic-contract.test.tsx`,
  `.rme-transfer.e2e.test.tsx`, `.chronic-therapy.test.tsx`, and `DiagnosisStep.test.tsx`) were
  migrated with every replaced assertion named in the commit bodies, none weakened.

## 2026-09-28 — Recurrent diagnoses from the record are offered first; the doctor promotes them

- Decision: `lib/clinical/recurrent-diagnosis.ts` finds ICDs recorded at least twice (`minCount`
  default 2) within the last 12 months, grouped by the ICD's 3-character root (so `E11` and
  `E11.9` count as one diagnosis), deduplicated by `encounter_id`. Roots listed in
  `CHRONIC_ICD_ROOTS` — a plain data array in that module Chief may edit at any time (`I10`-`I15`
  hipertensi, `E10`-`E14` diabetes, `E78`, `I25`, `I50`, `J44`, `J45`, `N18`, `G40`, `F20`,
  `E03`/`E05`, `M06`) — are labelled "Kronis", everything else "Berulang". `useRecurrentDiagnoses`
  returns `{ candidates, loaded }`; on the Diagnosis step, history-derived candidates are seeded
  first in the card list and both display caps (candidates shown, cannot-miss slot) are widened
  by the unmatched-history count so an engine cannot-miss row is never pushed out. Selecting a
  recurrent candidate goes through the same selection path as any differential card and is never
  auto-selected; the audit records it via `auditLogger.log('suggestion_selected', …)` with
  metadata `selected_icd`, `source: 'riwayat'`, `history_label`, `history_count`,
  `visits_considered`. Recurrent candidates' names/ICDs are also appended to `knownConditions`
  sent to MIRA, de-duplicated against `penyakit_kronis`.
- Rationale: a doctor should see a patient's own recurring pattern — especially for chronic
  follow-up — before ranking a fresh differential, but the record only ever offers a candidate; it
  never overrides the doctor's own judgement.
- Evidence: commits `33ce64e2`, `11190856` (Task 8), `4ccf99cb`, `5f604855`, `affae82f` (Task 9),
  `e1ac23c7` (Task 10). Tests: `lib/clinical/recurrent-diagnosis.test.ts` (threshold, 12-month
  window edge, ICD normalisation, chronic label, ordering, current-visit excluded, missing ICD
  ignored), `ClinicalDifferential` history-seeding and audit-metadata tests, `case-state.test.ts`
  (`knownConditions` dedupe).

## 2026-09-28 — MIRA starts with Assist through a native messaging host; mira is the production default

- Decision: the extension starts the MIRA reasoning service itself, through a native messaging
  host (`nativeMessaging` permission, host `com.sentra.mira`, installed once with
  `install_host.ps1 -ExtensionId <id>` in the MIRA repository) instead of requiring the service
  to already be running, and prefetches its answer from the Trajectory stage. `SENTRA_DIAGNOSIS_ENGINE`
  now defaults to `mira` in the production build (via a Vite `define` in `wxt.config.ts`) when the
  variable is unset; Vitest and dev keep the `legacy` default. The deterministic safety layer is
  unchanged.
- Rationale: MIRA only helps if it is actually available when a physician opens a case; a
  service the extension does not manage is a service that is sometimes not running. Chief
  accepted ADR-005 on 2026-09-28 to make MIRA the production default now that autostart and
  prefetch remove that gap.
- Evidence: `assist/host/tests/test_host.py` in the MIRA repository (`D:\DEV\gafferverse\mira-system`)
  (Task 1); `lib/diagnosis-engine/mira-supervisor.test.ts` (Task 4);
  `lib/diagnosis-engine/mira-prefetch.test.ts` and `lib/diagnosis-engine/request-context.test.ts`
  (Task 6).

## 2026-09-28 — "MIRA tidak tersedia" on 2026-09-28 was the service not running

- Decision: the "MIRA tidak tersedia" note the physician saw was not a code defect. Its cause
  was that the MIRA reasoning service was not running when the extension called it; the
  extension's `mira` engine correctly fell back to the legacy result and flagged the failure.
  This is resolved by the native messaging host (Task 1): Assist now asks the host to start the
  service and shows its status in the header, so the service is running before the panel needs
  it.
- Rationale: recording the cause here keeps a future "MIRA tidak tersedia" report from being
  re-diagnosed as a client bug when the service process is simply not up yet.
- Evidence: `assist/host/tests/test_host.py` in the MIRA repository (`D:\DEV\gafferverse\mira-system`).

## 2026-09-28 — Button sound plays on press (protected main.tsx, Chief approved)

- Decision: the side panel's global button-sound listener in `entrypoints/sidepanel/main.tsx`
  plays on `pointerdown` (primary button only) instead of `click`, still plays for keyboard
  activation (a `click` with `detail === 0`), and primes `button5.mp3` as soon as button sounds
  are enabled at launch. Chief approved this protected-file edit in chat on 2026-09-28 (option
  "A. Suara saat ditekan"); the other proposed UX items (composited pulse, page transitions,
  softer press transition) were not chosen and are not built.
- Rationale: a mouse click fires on release, about 100 ms after the press; priming makes the
  first click play from a decoded buffer too.
- Evidence: new test in `main.controller.test.tsx` (red before, green after); in the built side
  panel (Edge) all six probe clicks, the first included, started Web Audio playback 0 ms after
  `pointerdown` with no `<audio>` element created.

## 2026-09-28 — UI sounds play from decoded Web Audio buffers; sound files trimmed

- Decision: `utils/sound.ts` decodes each sound once into a shared `AudioContext`
  (`latencyHint: 'interactive'`) and plays it from the buffer, starting past the file's leading
  silence (first sample at or above 0.01) and fading capped sounds with a gain ramp. The first
  play of a sound that is not decoded yet still goes through an `<audio>` element and starts the
  decode. Sound files are cut at MP3 frame boundaries without re-encoding: `opening.mp3` keeps
  its first 2.6 s (1.05 MB to 84 KB; every caller caps it at 2.2 s, and the toolbar
  `action.onClicked` path never fires because `openPanelOnActionClick` is true), and leading
  silence is cut from `hello.mp3` (919 ms to 83 ms), `beep.mp3` (204 ms to 60 ms) and
  `message.mp3` (108 ms to 56 ms).
- Rationale: Chief reported button sounds arriving late. Each click built a new `<audio>` element
  (9–63 ms to "playing" on an idle machine, more under load) and every file began with silence
  (34 ms for `button5.mp3`). Decoded buffers start in the same task as the click. A 32.7 s
  opening track decoded into memory would cost about 12 MB; trimmed, under 1 MB.
- Evidence: `utils/sound.webaudio.test.ts` (red before, green after); in the built side panel
  (Edge), clicks 2–6 started Web Audio playback 0 ms after the click event with no new `<audio>`
  element; a sample comparison of the trimmed files against the originals showed zero
  difference over the played part of `opening.mp3` and no click at any cut.

## 2026-09-28 — Review details reads as one narrative with ABCD primary survey advice

- Decision: the "Review next" checklist in `ClinicalReasoningDifferentialPanel` becomes one
  Indonesian paragraph under "Penjelasan": "Pada pasien ditemukan adanya <complaint signal>.",
  the first visit whose complaint contains the signal's matched keywords ("Keluhan ini muncul
  sejak kunjungan ke-N (date)." or "…tercatat pada kunjungan saat ini."), the engine rationale,
  vital drivers, diagnosis and therapy signals, and "Sentra menyarankan survei primer A-B-C-D
  (Airway, Breathing, Circulation, Disability)." whenever any complaint signal exists or the
  final state is deteriorating or critical. Chief chose the ABCD primary-survey meaning and the
  whole-section scope on 2026-09-28.
- Rationale: Chief asked for an explanation a doctor reads at once instead of four labelled
  items. Every complaint signal the engine emits is a safety pattern (stroke, ACS, respiratory
  with physiology, infection with sepsis-like risk), so advising the primary survey for any of
  them, or for a worsening trajectory, matches Chief's chest-pain example without advising it
  for routine visits. Display only: the gate reads existing engine fields (SAFRS R2).
- Evidence: the commit after `ba789530`; `ClinicalReasoningDifferentialPanel.narrative.test.tsx`
  was red before the change and green after.

## 2026-09-28 — Clinical Trajectory top card copy in Indonesian

- Decision: on Chief's request the Trajectory top card reads in Indonesian. Status chip:
  Prioritas tinggi / Perlu perhatian / Stabil / Pantau; trend chip: Eskalasi / Memburuk / Tetap /
  Membaik; priority chip: Tinjau sekarang / Mendesak / Hari ini / Rutin. Tabs (long / short):
  Linimasa Klinis Pasien / LINIMASA, Kurva Risiko / Perburukan / PERBURUKAN, Tren Tanda Vital /
  TREN TTV, Linimasa Tanda Bahaya / TANDA BAHAYA, Selisih Antar Kunjungan / SELISIH, Evolusi
  Hipotesis Diagnosis / EVOLUSI DX. "Trajectory" becomes "Trajektori" in running text.
- Rationale: Chief's users are Indonesian doctors and nakes; the rest of the side panel is
  already Indonesian. No short label is longer than the old longest word (DETERIORATION).
- Evidence: the commit after `78439d22`; test expectations swapped string for string (named in
  its message); token-guard PASS, SAFRS R1.

## 2026-09-28 — Clinical Trajectory must not reload or persist on equal re-renders

- Decision: objects that feed the trajectory pipeline and the reasoning-audit write keep their
  identity across re-renders with equal inputs. `ClinicalReasoningWorkbench` memoises the vitals
  object it passes to `ClinicalTrajectory` (whose load effect depends on it), and
  `ClinicalTrajectoryV2` memoises its sanitised view model and hybrid result (which feed the
  audit trail's persistence effect). Tests pin both: an equal re-render neither restarts the
  pipeline (no second canonical-engine call) nor writes the audit again.
- Rationale: the side panel (`main.tsx`, protected) re-renders on every
  `browser.storage.onChanged` event for any key, and the audit trail writes up to 100 records to
  `browser.storage.local` each time its inputs change. With fresh objects on every render this
  formed an endless loop — reload, canonical call, audit write, storage event, re-render — that
  grew Chrome's extension renderer from about 97 MB to 679 MB and the browser process from
  126 MB to 887 MB within five minutes on Chief's machine, then hung the Trajectory page and the
  PC. The loop's links date from the migration commit `809101cf`, not this branch.
- Evidence: see the commit after `88ccf25c` on `feat/sidepanel-ui-batch`; both new tests failed
  before the fix (audit persisted 2 times; canonical engine called 2 times) and pass after it.

## 2026-09-28 — Staged diagnosis page: order, collapse, and safety-first danger signs

- Decision: Diagnosis Utama renders above Diagnosis Banding (reverses the earlier order), each
  card shows its confidence word once, in the header, with one evidence tally line and no
  `ConfidenceRail`; the primary card's "Alasan" dropdown renders whenever evidence has items,
  including the insufficient-evidence state. Pemeriksaan Penunjang, Therapy + Resep, Edukasi and
  RME Transfer render as closed one-line `<details>` summaries until "diagnosis chosen"
  (`therapy.selectedDiagnosisCount > 0`), then open with a 40 ms stagger — except Pemeriksaan
  Penunjang, which forces itself open regardless of that flag whenever it is carrying the
  fallback "Tanda bahaya" list (no triage data), because safety information must not hide behind
  a click. Danger signs are built once from `redFlags` + `doNotMiss`, de-duplicated, and the
  3-item cap is removed (the separate Safety-net list that used to show the rest is gone). The
  Therapy panel's "Hanya untuk ditinjau… Dokter tetap pengambil keputusan akhir" disclaimer is
  removed; the global footer already states physician authority.
- Rationale: a doctor reads each fact once and sees only the sections useful at their current
  step, but safety-critical content is never gated behind an extra click.
- Evidence: commits `169c9ab2` (danger signs single/uncapped), `d1073b5a` (Utama above Banding),
  `47db122e` (collapse Penunjang/Therapy/Edukasi/RME), `7a07560d` (final review fix wave: F1
  Penunjang auto-open for fallback danger signs, F2 primary Alasan renders in the insufficient
  state). Spec `docs/specs/2026-09-27-diagnosis-page-staged-design.md` (`bd97f827`) D1–D3, with
  an "Updated after implementation" note for the F1 deviation.

## 2026-09-28 — Motion policy for the diagnosis page: CSS only, no framer-motion

- Decision: every new motion on the diagnosis page (stage open/close, stepper, stagger,
  selection, RME order tracker, Clinical Trajectory activity timeline) is plain CSS: open
  transitions run 250 ms, close 200 ms, both on the shared curve
  `cubic-bezier(0.23, 1, 0.32, 1)`; every new motion rule has a matching
  `@media (prefers-reduced-motion: reduce)` block that keeps only an opacity change. No new
  dependency was added; `framer-motion`, already a capsule dependency, is not used for any
  motion in this batch.
- Rationale: keeps the motion budget declarative and inspectable in `style.css`, and predictable
  under reduced motion, without pulling animation JS into the render path.
- Evidence: commits `49d7ba6c`, `2dfbe20e`, `72b12c5e`, `dac5b071`, `78a45e88` (reduced-motion
  test tightened to its own balanced `@media` block), `7a07560d` (TG2/TG3 reduced-motion fixes
  for the autofill-button label opacity transition and the audit-timeline `animation-delay`).

## 2026-09-27 — Send to Doctors opens a patient-free WhatsApp link

- Decision (Chief): the alert is a `wa.me` link whose text names only the triage zone (merah/
  kuning) — no patient name, RM, age, vitals, or alert title. Numbers come from medboard crew
  profiles via `GET /api/doctors/contacts` (crew auth, active Dokter/Dokter Gigi with a number),
  are held in memory only for the open list, and are never stored or logged. The button appears
  only in the emergency card, only for merah/kuning zones; the action bar stays three buttons.
- Evidence: commits `392b04df`, `92d5adb5` (medboard endpoint + route test), `f6a5f637`,
  `5171abc8` (Assist button and message text).

## 2026-09-27 — Emergency card and diagnosis page layout

- Decision (Chief): the verdict card keeps seven sections with Indonesian headings (Mengapa
  penting, Lakukan sekarang, Jangan lakukan, Pemicu rujukan, Evaluasi ulang, Dasar bukti). The
  diagnosis page order is Clinical Finding → Diagnosis Banding → Diagnosis Utama → Triase &
  Rujukan, with triage details folded into dropdowns (Saran, Alasan, Indikasi rujukan, Tanda
  bahaya). Clinical Trajectory results are folded into a "Hasil" dropdown with green Open/Close
  hints.
- Evidence: commits `91181d9b`, `16e3a20b` (verdict card), `d30f6fac` (diagnosis page), `48b76c4e`
  (trajectory "Hasil" dropdown).

## 2026-09-27 — RME practitioner names come from the signed-in Assist user

- Decision (Chief): the "Dokter / Tenaga Medis" and "Perawat / Bidan / Nutrisionist /
  Sanitarian" fields take the name of the user signed in to Assist, chosen by crew profession
  (Dokter, Dokter Gigi → doctor field; Perawat, Bidan, Apoteker, Triage Officer → nurse field).
  The other field, local accounts and unknown professions keep `DOKTER_NAMA` / `PERAWAT_NAMA`.
  This reverses the earlier directive "always used, never dynamic" in `lib/clinical/tenaga-medis.ts` (R3).
- Profession, not `role`, decides, because `normalizeRole` maps bidan to `doctor`.
- ePuskesmas autocomplete for these fields selects only a single exact name match; otherwise the
  field is cleared and the step reports "Nama tenaga medis tidak cocok persis di ePuskesmas".

## 2026-09-27 — Real cases may reach MIRA through OpenRouter zero data retention

- Decision (Chief, in chat): the reasoning service runs with `MIRA_DATA_POLICY=openrouter-zdr`
  (set in the service's gitignored `src/.env`), so de-identified real cases from Med Assist in
  `mira` mode are answered instead of refused with `DATA_POLICY`. Every OpenRouter request keeps
  the fixed policy (zero data retention, data collection denied, parameters required).
- Each diagnosis request in `mira` mode is one live step (about US$0.015–0.02 and 10 s with the
  current planning model); Chief waived the per-run "jalankan" rule for this mode only.
- Unchanged: the client PII guard and the service's PII re-check still run first; `legacy` stays
  the default; the local knowledge base still wins for physicians until ADR-005 is accepted.
- Evidence: before the change the service audit log held four `DATA_POLICY` refusals from the
  extension (token accepted, cost 0); `load_settings()` now reports `openrouter-zdr` with no
  policy problem.

## 2026-09-27 — Diagnosis engine modes legacy | shadow | mira; MIRA shown in the existing list

- Decision (Chief, in chat, with R3 approval for `feature-flags.ts`, `run-diagnosis.ts` and
  `lib/diagnosis-engine/`): `SENTRA_DIAGNOSIS_ENGINE` = `legacy` (default) | `shadow` (MIRA in the
  background, not awaited, audited) | `mira` (MIRA's list shown; on failure, timeout or an empty
  list the legacy list is shown with the note "MIRA tidak tersedia"). Only these exact values
  switch; anything else is `legacy`.
- In `mira` mode MIRA replaces only `diagnosis_suggestions` (likely, alternatives, then
  cannotMiss, tagged "MIRA" / "MIRA · jangan terlewat"); alerts and every other field stay the
  legacy engine's, and the safety layer is untouched. ICD codes stay as MIRA sent them, even when
  the local knowledge base lacks them. Cannot-miss entries always get one of the five places.
- This supersedes the 2026-09-27 lines "with `mira`, physicians still see only the legacy result"
  and "showing MIRA in the side panel is a separate UI task" for the `mira` value only. `mira` is
  off by default and meant for development; "the local knowledge base wins; the LLM is a reranker
  only" still holds for physicians until Chief accepts ADR-005.
- Development authentication (Chief): `VITE_MIRA_DEV_TOKEN` is sent as `Authorization: Bearer`
  and must equal the service's `MIRA_DEV_TOKEN`. It is inlined into the build, so it is a
  throwaway local value only; production authentication stays undecided. `host_permissions`
  already allow `http://127.0.0.1:*/*`, so no manifest change was needed.
- Evidence: commit `3e1b94d4`; full suite 1137 passing, 17 skipped (baseline 1109).

## 2026-09-27 — PII pattern false positives fixed (R3, Chief approved)

- Decision: `RM_NUMBER` needs "RM" / "No. RM" as a whole token plus an identifier with a digit;
  `HONORIFIC_NAME` keeps the title case-insensitive but requires a capitalised name (all-caps
  names only after dotted titles). "normal", "Ibu pasien", "Ibuprofen" and "RM: pasien baru" no
  longer block payloads.
- Accepted trade-off (the approved design's defaults): an all-caps name after "Ibu", a lower-case
  name after a title ("tn. budi") and an RM number without digits are no longer caught. The same
  patterns drive the redaction before the optional OpenAI reranker.
- Evidence: commit `b5b875a1`; the new tests fail on the old patterns (2 failing) and pass on the
  new ones.

## 2026-09-27 — MIRA planning model picked in the side panel by developers and admins

- Decision (Chief chose each option): the MIRA planning model is picked in the side panel
  (footer), only in development builds or by an admin; physicians never see the picker. The
  choice travels as the header `X-MIRA-Plan-Model`, so request contract v1 is unchanged. The
  reasoning service enforces its own allowlist (`MIRA_PLAN_MODEL_CHOICES`) and refuses any other
  value before a model call (`MODEL_NOT_ALLOWED`).
- Offered models (Chief's list): `google/gemini-3.1-flash-lite:nitro` (the service default for
  now), `inception/mercury-2`, `openai/gpt-6-luna`.
- Rationale: compare planning models on synthetic cases without rebuilding; the client-side role
  check only hides the picker, the service allowlist is the control.
- Evidence: commit `e07983ce`; 11 new tests; full suite 1109 passing, 17 skipped.

## 2026-09-27 — Diagnosis engine isolated behind an interface; MIRA slot off by default

- Decision (Chief approved the direction and the Step A inventory): diagnosis ranking goes
  through `lib/diagnosis-engine/` (`DiagnosisEngine.step(CaseState) → EngineResult`). The legacy
  engine is wrapped unchanged and stays the comparator and fallback; deleting it is a later task,
  allowed only after the Gate 1 benchmark passes.
- Flag `diagnosisEngine` lives in `lib/iskandar-diagnosis-engine/feature-flags.ts` (Chief's
  choice); only the exact value `mira` selects the candidate, anything else is `legacy`.
- With `mira`, physicians still see only the legacy result; MIRA runs in shadow mode, capped at
  20 s, and only its outcome is audit-logged. Showing MIRA in the side panel is a separate UI
  task under the freeze rules.
- The MIRA client talks only to a Sentra-side service (`VITE_MIRA_SERVICE_URL`), sends no
  credentials, screens every payload with `lib/api/pii-guard.ts`, and never holds an OpenAI key.
- The safety layer (red flags, emergency gates, triage verdict, triage/referral tree) stays
  deterministic and outside every engine; a test enforces that it imports no diagnosis pipeline
  and still produces output when an engine throws, hangs or breaks.
- "The LLM is a reranker only" stays in force until Chief accepts ADR-005 (Proposed).
- Evidence: golden recordings of 12 synthetic cases (`lib/diagnosis-engine/__golden__/`) match
  before and after the switch; a 0.0001 change in one confidence value fails them. Test run:
  1098 passing, 17 skipped (baseline 961/16).

## 2026-09-27 — Brought in Chief's GitHub updates (drferdi/Medassist PR #1–#10)

- Decision (Chief): the ten commits on `drferdi/Medassist` `main` after `de780e3b` (the commit
  the legacy snapshot was based on), up to `b17e83c2`, were applied to the capsule as one
  three-way patch: P0–P1 hygiene (#1), OCR failure without false triage (#2), LLM ICDs limited
  to KB candidates (#3), KB hygiene (#4, #8), red flags as alerts only (#5), one ranking
  authority (#6), differential populated from signals (#7), unknown age and one engine
  diagnosis source (#9), epidemiology gate and `diagnosis_banding` soft penalty (#10).
- Branch `cursor/p0-p1-hygiene-8d93` has the same tree as PR #1 (squash-merged), so nothing
  further was taken from it.
- Kept from the migration: the capsule's own `pnpm-lock.yaml` (upstream's pnpm 9 lockfile not
  taken), relative `source_file`/`kb_source_path` values in `penyakit.json`, the `Drferdi`
  author headers (also applied to the six new files), the vendored shared types, and `.agents/`
  tracked. Three import-order conflicts in the MedLens tests were resolved to upstream's order.
- Evidence: every other ported file is byte-identical to `b17e83c2`; see HANDOFF for the
  verification run.
- `eng.traineddata` (Tesseract's English OCR model, 5 MB) is no longer tracked (Chief). It was a
  cache file `tesseract.js` writes to the working folder for `services/medlens-local/ecg-ocr.mjs`,
  copied in with the migration though neither legacy nor upstream tracked it; it stays on disk
  and `*.traineddata` is ignored. A fresh machine downloads it on the first OCR run.
- `README.md` links now point to `drferdi/Medassist` and the `drferdi` profile (Chief).

## 2026-09-26 — Migrated from abyss-monorepo into SAFRS

- Decision: The legacy folder `abyss-monorepo/apps/healthcare/med-assist` was copied as it is
  to `projects/healthcare/med-assist`. Source: legacy commit
  `762e48cb4bb1967e2132e7b530e8f2a7f4231c59`.
- Not copied: `.agent/`, `.claude/`, `CLAUDE.md`, `graphify-out/`, `.output/`, `.wxt/`,
  `.env.local`, `node_modules/`.
- Toolchain: pnpm 9.15.0 became pnpm 11.21.0 with a fresh lockfile and `nodeLinker: hoisted`;
  Node 22 became Node 24. The pnpm 9 override block was dropped; the inert npm-style
  `overrides` field was left untouched.
- `pnpm audit` on 2026-09-26 found critical advisories in `vitest` 2.x (the legacy override
  only covered 3.x, so legacy was affected too). Raised `vitest` and `@vitest/ui` to
  `^4.1.11`, `vite` to `^6.4.3`, `wxt` to `^0.20.27`, `sharp` to `^0.35.4`; five scoped
  overrides cover the `web-ext-run` chain of wxt and wxt's esbuild. Audit then reported no
  known vulnerabilities. Build scripts allowed: `esbuild`, `sharp`; denied: `tesseract.js`
  (donation message), `spawn-sync` (old polyfill).
- `test` is the full Vitest suite (`vitest.config.ts`): 135 files, 926 passing, 16 skipped,
  and it includes every clinical test under `components/clinical/`, `lib/` and
  `entrypoints/sidepanel/`. The narrower `vitest.clinical.config.ts` and
  `vitest.unit.config.ts` were already broken in legacy (no `tests/setup.ts`, pinned
  `.pnpm` paths) and are left unchanged.
- Lint had five inherited errors (same eslint 9.39.5 as the legacy lockfile; the legacy
  `node_modules` could no longer run): two debug `console.log` lines in
  `DiagnosisWorkspace.test.tsx` were removed (assertions untouched), and three stale
  `eslint-disable-next-line import-x/order` comments referencing a plugin that is not
  installed were removed from the MedLens tests.
- `run` for a browser extension is `scripts/check-extension.mjs`: it loads the built MV3
  output like `chrome://extensions` does and checks every referenced file. `deployDryRun` is
  `wxt zip` (store package, no upload).
- Legacy references were removed: `AGENTS.md` was rewritten with the domain rules kept,
  `entrypoints/sidepanel/AGENTS.md` now points to the capsule router, and absolute legacy
  paths in docs and the `source_file` provenance fields of `public/data/penyakit.json` were
  rewritten (text only; the JSON stays valid and no clinical field changed).
