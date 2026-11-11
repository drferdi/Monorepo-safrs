# Doctor flow, simplified - design (draft for Gaffer's approval)

Status: approved by Gaffer on 2026-10-20 (R1 set "Setuju semua"; A2 "Ya, tampil dulu"; B3 "Tetap lima mode"). Built locally: A1, A2, A4, B1, B2, C1-C3 (including folding parts 2-4 on the phone), D1-D4. Not committed.

## Intent

Gaffer: "posisikan diri mu sebagai Dokter ... UI dan flow dari Sentrapedia ini benar benar membantu seorang dokter, mulai dari memasukan gejala sampai pedoman therapi dll lalu kemungkinan rujukan ICD10 dll harus simplified."

A doctor between patients needs, in this order: is this dangerous, what is it (with the ICD-10 code), what do I check, what do I give, do I refer. Today every one of those is in the answer, but behind about six screens of text on a laptop and nine on a phone.

This design is a layer on the nine-part report Gaffer approved on 2026-10-20 ("ini sangat penting"; candidates shown, NICE CG150/NG228 and ICHD-3 linked, all AADI analyses). The nine parts already follow anamnesis, examination, differential, workup, therapy, follow-up. The friction is density and where the answer sits, not the order. Nothing here removes a part, a safety line or a reference.

## Evidence

Walkthrough on the local dev server (port 3101), headless Chrome through a Node Playwright runner (the shared Playwright MCP browser was locked by another session). The runner's context aborts every non-GET `/api/aadi`; the page answered the one submit with the stored fictional headache answer from `.playwright-mcp/flow-desktop.js`. Server: no analysis (today's AADI audit ledger still has the same 4 lines). Reveal forced instant through reduced motion.

Typed in the home composer, mode left at the default: "Laki-laki 45 tahun, nyeri kepala hebat di belakang sejak 2 jam, mual, TD 170/100".

Evidence tiers:
- Verified in code: `composerCase` (`src/lib/aadi/composer.ts`) puts the whole line in `chiefComplaint`; demographics come only from a saved Patient; vitals and examination stay empty. The engine prompt (`aadi/service/prompts.py`) therefore says "Vital signs: (none recorded)" while the complaint text carries TD 170/100. Part 1 of the report shows "Identitas klinis ... belum tersedia" and "Pemeriksaan fisik: Belum tersedia" from the empty `caseData`, whatever the doctor typed.
- Measured on the fixture: answer height 5,103 px at 1440x900 (7,507 px at 390x844). The chat composer block (intent tabs, composer, quick actions) takes 307 of 900 px, leaving 521 px for the answer. Therapy line at 3,192 px (5,050 px on the phone). First ICD-10 code at 483 px (part 1 "Asesmen awal"), 1,066 px on the phone. 957 words. Copy puts 29,261 characters on the clipboard, including the trace, SHA-256 and TheOracle passages. 11 section Edit buttons.
- Not tested: whether the live model still reads TD 170/100 from the free text and raises subarachnoid haemorrhage. The fixture was answered for an older input. This is a structural risk, not an observed miss.
- Fixture artifacts, not friction: "Catatan penalaran: belum tersedia" and test indications "Belum tersedia" (the live answer of 2026-10-20, trace `d7454322`, carried both fields).

## Friction and proposal per step

Risk tags follow AGENTS.md: R1 reversible local UI; R2 engine/contract boundary; R3 clinical or safety logic, needs Gaffer's prior approval.

### 1. Entering the case

Friction:
- Age, sex and vital signs typed in the text never reach the structured case, so the report says they are missing and the engine is told none were recorded (verified above).
- The structured form exists (`aadi-case-form.tsx`, Pustaka Klinis, "Analisis kasus") but is three clicks away and needs a synthetic-data checkbox.
- The demo patient's notes ("Pasien demonstrasi fiktif ...") are sent as history and land in part 1 as "Riwayat penyakit sekarang".

Proposal:
- A1 (R1, recommended first): a compact strip under the composer textarea in the analysis modes: Usia, L/P, TD, Nadi, Suhu, RR, SpO2. Optional fields, Tab-able, mapped straight into `CaseState.demographics` and `CaseState.vitals`, which the contract already accepts. Zero extra clicks when left empty.
- A2 (R3 question for Gaffer): read the same values from the free text ("45 th", "laki-laki", "TD 170/100", "N 98", "S 38,5") on the client and fill the strip, shown to the doctor before sending. Faster typing, but it is input-shaping clinical logic.
- A3 (R2, not recommended now): ask the engine to extract them. Changes `prompts.py` and the schema, and adds tokens.
- A4 (R1): patient notes go in as "Catatan pasien", not as the history of the present illness, in part 1.

### 2. Choosing what to do

Friction:
- Five analysis modes (PICO, DDx, Penunjang, ICD-10, Telaah Rujukan) run the same AADI call; the mode only moves one part to the top.
- The default mode is "Pertanyaan Klinis (PICO)", so a full case analysis is headed "Pertanyaan Klinis (PICO)".
- Four intent tabs plus four quick chips plus "Templat lain" sit above and below the composer on every screen.

Proposal:
- B1 (R1): AADI answer cards are headed "Analisis kasus" with the focus as a small tag ("fokus: ICD-10").
- B2 (R1): in the chat view, the intent tabs and quick actions fold into one row that opens on focus, giving back about 150 px to the answer. The home screen keeps them.
- B3 (product decision for Gaffer, not proposed by default): one "Analisis kasus" action with the focus switchable on the result. It touches Chief's 18-mode design of 2026-10-09.

### 3. Reading the answer

Friction:
- The doctor's five answers (danger, diagnosis and code, check, give, refer) are spread over parts 1, 2, 5, 6, 7 and 8.
- Part 2 opens with generic lists; AADI's own cannot-miss diagnoses and disposition sit at its end.
- Part 7 opens with a five-row template table ("Nama obat, indikasi, dosis ..."); AADI's actual regimen sits below it.
- Disease labels are English ("Tension-type headache") even where TheOracle has the Indonesian name.

Proposal:
- C1 (R1, the core of this design): a "Ringkasan untuk dokter" card above part 1, built only from fields AADI and the gate already return, each line linking to its part:
  - Perlu disaring segera: `cannotMiss` diagnoses, and the disposition if any.
  - Diagnosis kerja (kandidat, belum terkonfirmasi): label and ICD-10, with copy.
  - Periksa: AADI's tests (first two) and examinations.
  - Terapi usulan: the post-gate regimen line, or "belum ada terapi terverifikasi"; dose wording exactly as the gate leaves it.
  - Rujuk: disposition decision and urgency, or "belum dinilai".
  The nine parts stay complete below. On the phone, parts 2 to 4 start folded (title and one line), the summary open.
- C2 (R1): part 7 shows AADI's regimen and gate status first; the documentation table follows, folded. The gate text and the "perlu diverifikasi" line stay word for word (changing them is R3).
- C3 (R1): where a TheOracle record matches the code, show "Nyeri kepala tipe tegang (G44.2)" with the engine label as fallback. Asking the engine for Indonesian labels would be R2.

### 4. Editing, copying, exporting, referring

Friction:
- Copy takes the full 29 k characters, including the audit trail, which does not belong in an RME or PCare note.
- No one-click copy of an ICD-10 code or the therapy line.
- "Unduh" in the header saves `encounter.md` with every message of the encounter.
- A referral letter needs a separate mode and a second analysis.

Proposal:
- D1 (R1): "Salin ringkas" next to "Salin": the summary card as plain text, no trace, SHA-256 or TheOracle passages, ready to paste into an RME or PCare note.
- D2 (R1): a copy button on each ICD-10 code (code and name) and on the therapy line.
- D3 (R1): downloads named `sentrapedia-<date>-<complaint words>.md`.
- D4 (R1): "Buat surat rujukan" on a AADI answer opens the existing local Surat Rujukan draft prefilled from the answer's summary, diagnosis, findings and tests, with no new AADI call. The doctor fills the destination.

## Targets (checked by Playwright on the fixture, 1440x900 and 390x844)

- Danger line, working diagnosis with ICD-10 and therapy line all visible on the first answer screen on desktop, and within the first 1.5 screens on the phone.
- Age, sex and vitals entered in the strip appear in part 1 and in the request body (checked on the intercepted POST), with 0 extra clicks when not used.
- "Salin ringkas" copies the summary card as plain text (about 600 characters for the fixture); full copy unchanged.
- No part, reference link, gate line or reviewer block removed; existing Vitest suites and the nine-part tests still pass.

## Non-goals

- No change to AADI's prompts, schema, cost or model (no R2) in this round.
- No change to clinical wording of safety lines, the therapy gate or red-flag lists (R3).
- No new dependencies, no medboard, no deployment.

## Open decisions for Gaffer

1. Approve the R1 set (A1, A4, B1, B2, C1-C3, D1-D4) as the direction.
2. A2: may the client read age, sex and vitals from the typed text (shown before sending)?
3. B3: keep five analysis modes, or one analysis action with a focus switch?

## Builder notes

- Files: `src/lib/aadi/composer.ts`, `src/lib/aadi/presentation.ts`, `src/components/composer.tsx`, `src/components/diagnosis-document.tsx`, `src/components/message-card.tsx`, `src/components/workspace-views.tsx`, `src/app/globals.css`, plus tests next to the existing ones (`tests/diagnosis-presentation.test.ts`, `tests/aadi-composer.test.ts`, `tests/ui/workspace-smoke.test.tsx`).
- Collision: `presentation.ts`, `types.ts`, `diagnosis-document.tsx`, `workspace-views.tsx`, `typing.ts` and `globals.css` hold uncommitted edits by the format session and the reveal session. Implementation waits until those land or ownership is agreed through HANDOFF; this blocks building, not this design.
- The summary card is typed text for the reveal (`typing.ts` lengths): either it arrives whole like the references, or it types first. Builder's call; arriving whole keeps the reveal untouched.
- Left to the builder: exact layout of the strip on the phone, fold styling, button icons.

## Calls made after the builder check (the designer's calls, for Gaffer to check)

A read-only reviewer read this document as the builder would. Its questions were settled as follows; none adds new clinical wording.

1. The summary card is markdown written by `aadiDraft` (a section before part 1), not a React card from `sourceText`. It is copied, exported and edited with the report, and once the doctor edits the answer it stays as edited, like every other part.
2. Danger line with no `cannotMiss`: it repeats part 2's existing line "Status tanda bahaya: belum dinilai." and links to part 2. With cannot-miss diagnoses it lists them, then the same line. No new safety wording.
3. Therapy line: the same text part 7 shows after the gate (regimen line, or the gate's reason when therapy is removed). With no AADI regimen it says "Lihat bagian 7" rather than lifting TheOracle's reference therapy into the card.
4. "Salin ringkas" copies the summary card only, as plain text without markdown tables (about 600 characters for the fixture). The 2,500-character target is dropped; full copy keeps everything. It copies the text as currently edited.
5. A4 is display only: `composerCase` already labels the two sources ("Konteks Encounter", "Catatan kasus") inside `anamnesis.freeText`, so part 1 splits on those labels; no contract change. The strip is prefilled from the saved Patient, and a value typed in the strip wins.
6. C3 uses only an exact code match (a "G44" record does not rename G44.2), and changes the label in the summary card and part 5 only.
7. Baseline: the current uncommitted nine-part `presentation.ts`. If Gaffer approves A2, the strip becomes an editable preview of values read from the text, so A2 is decided before the strip is built.
