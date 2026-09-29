# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

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
