# Sentrapedia workspace: back to the Glass shape (design)

Date: 2026-11-04. Owner: Gaffer. Risk: R1 (presentation layer only; no change to storage format, AADI contract, gateway, auth, sync or the evidence gate).

## Why

The workspace was built on 2026-10-08 as a recreation of a Glass for Clinicians screenshot (`docs/plans/completed/2026-10-08-glass-workspace.md`). From 2026-10-09 on, layers were added that Glass does not have: four intent tabs, grouped quick-action chips, a "Templat lain" picker, a two-column document with a section rail, a nine-part numbered analysis report, "Lanjut" and "Salin ke P-Care" chip rows after every answer, and a Clinical Cockpit panel. On 2026-11-03 Gaffer asked for the whole workspace to be brought back to Glass's shape ("samakan UI Sentrapedia dengan Glass Health"), after reviewing his own Glass account in the browser pane. The 2026-10-21 decision "consult-first, one composer" already points the same way.

Reference: `docs/verification/glass-reference-2026-11-03/` (25 captures of Glass 6.0 and a README naming what each establishes). Measured from Glass's DOM: Inter at 14.4 px; canvas `#fbfbfb`, radius 12 px, margin 8 px, a 1 px / 3 px shadow at 10 %; chips 32 px high, radius 8 px, 1 px border at `rgba(31,31,31,.1)`, 11 px / 500 text; primary buttons radius 6 px.

## Decisions taken with Gaffer (2026-11-03)

1. Scope: the whole workspace, not only the composer.
2. Layout: Glass's split view. Chat on the left; a document pane on the right replaces the Clinical Cockpit. The Encounter Overview tab absorbs the cockpit's content.
3. AADI analysis: rendered in Glass's differential shape plus Sentrapedia's therapy section, from the stored engine result, not from the nine-part text.
4. Chips: one scrolling row with a shortlist; every other mode and personal template through `/`, the counterpart of Glass's `.` menu. Intent tabs and "Templat lain" go.
5. Visual language: Glass's structure, components and proportions (rounded corners, hairline cards); Sentrapedia's brand stays (tosca action colour, Plus Jakarta Sans titles, Geist text).

## Approach

Reshape in place, in stages. Existing components are reshaped one at a time; storage format v2, the message model, the AADI client/gateway and the auth layer are untouched. Rejected: a parallel shell behind a flag (two UIs to maintain) and a rewrite (throws away idle lock, consent, sync and gate work that is proven).

## 1. Shell and navigation

- Sidebar: 256 px, grey, same drawer behaviour at 760 px and below. Order follows Glass: **Baru · Buat Pasien · Buat Daftar Pasien · Mulai Scribe · Pengaturan Agent · Cari**, then the three list sections (Daftar Pasien, Semua Pasien, Semua Encounter) with the existing `SidebarSubmenu` motion, the feedback box, and an account row at the bottom.
- The nav groups "Mulai / Alat kerja / Sistem" go. Antrean kerja, Referensi, Templat dan favorit and Command Center leave the sidebar: Antrean kerja and Referensi are reached from the Command Center (Ctrl/⌘ J, unchanged) and from the account menu; Templat dan favorit lives in Pengaturan Agent (section 7); Voice mode becomes the composer's Mulai Scribe button.
- Account row menu: display name, plan badge (Lite), Pengaturan Agent, Antrean kerja, Referensi, Tentang workspace, Keluar, and today's AADI usage (the existing step/daily budget figures). The Clerk `UserButton` and the sign-out button of `SessionBoundary` move into this menu; the session toolbar strip above the workspace goes.
- Canvas: one sheet, `#fbfbfb`, radius 12 px, 8 px margin, the measured shadow. Header keeps breadcrumb, Command Center, Focus Mode and Ekspor; Berlangganan stays top right as Glass's Upgrade.

## 2. Home and composer

- Home: greeting line (existing), then a two-line centred headline that rotates through the existing `intentGroups.headline` sentences on each visit (no auto-cycling, per the 2026-10-09 decision), a small pill "Layanan primer" under it, the composer, the chip row, then the footer. The promotional block below is not reintroduced.
- Composer, 672 px: textarea; left tools **Mulai Scribe** (tosca, primary) and **Tambah Konteks**; right tools: format select (Standar / Lengkap), a settings icon that toggles the age-and-vitals strip (`CaseStrip`), mic, send. The strip is never permanent. Placeholder follows the active mode as today.
- Chip row: one horizontally scrolling row under the composer, 32 px chips, hairline border, no tabs, no "Tindakan cepat" label. Shortlist, in order: **Ajukan pertanyaan · Analisis kasus · Catatan SOAP · Diagnosis Banding · Asesmen dan Rencana · Rujukan · Edukasi pasien · Anamnesis · Ringkasan kunjungan**. "Analisis kasus" is the `ddx` AADI path; "Diagnosis Banding" is the same path with the differential first (today's `ddx` label); the two are kept apart because Gaffer's product copy names both. A chip never submits: it sets the mode and prefills the composer with that mode's opening sentence (new field `opening` on `modes[]`), focus lands in the textarea, the doctor sends. Once the encounter holds a document of that mode, the chip reads "Perbarui …".
- Removed from under the composer: the four intent tabs, "Templat lain", the quick-actions row, the link row (Referensi penyakit · Analisis kasus · Templat dan favorit · Favoritkan pilihan), the fictional-data checkbox (already withdrawn by the 2026-10-26 decision) and the "/ untuk templat" hint.
- `/` picker: kept, now the only way to every mode and personal template. Two groups: **Mode** (all 18, in the six clinical categories of `modeCategories`) and **Templat pribadi**. Favourites are shown first when any exist. Behaviour (keyboard, Escape, scroll) unchanged.
- CaseGuide and the case strip (L/P, Usia, TD, Nadi, Suhu, RR, SpO₂): removed on 2026-11-04 after Gaffer saw the shipped result ("justru ini yang saya tidak suka"; "sama kan saja dengan UI dari Glass health"). The composer is one text box like Glass's. Age, sex and vitals are still read from the typed text and sent as structured data; there is no minimum-data gate: the case is sent as typed and the report's "Data yang perlu dilengkapi" names what is missing, as Glass does (Gaffer, 2026-11-04, second pass: "masih ada minta isi ini itu"). (This supersedes the earlier "kept" line and the first pass's one-line message.)

## 3. Encounter chat

- Top bar: "Tambah ke Pasien / <encounter title>" (title editable through the existing encounter dialog), a "Rawat jalan" pill, Ekspor, Command Center, Focus Mode, and a document icon that opens the document pane on narrow screens. No Connect EHR.
- Doctor turns: right-aligned grey bubble with the existing reuse control. Assistant turns: plain prose, no card chrome, no brand mark per message; a small "Analisis kasus · fokus: …" line above an AADI answer stays.
- Thinking: a progress list in Glass's form, but only steps the gateway reports: *Permintaan diterima → Pedoman ditelusuri → Analisis berjalan → Jawaban selesai*. The 340 ms timer of `thinking-card.tsx` goes (closes DESIGN-AUDIT M-02); `<ol role="status">` becomes `<div role="status" aria-live="polite"><ol>` (closes M-01).
- References: an AADI answer's guideline passages render as a **Kutipan pedoman** block of numbered cards (title, source file, page, chunk hash shortened, tag "Terverifikasi"), collapsed after the first two with "Tampilkan n kutipan lagi", exactly the `theOracleReferenceItems` data shown today. In-text markers `[n]` link to the cards.
- Per-answer actions: copy, print, download icons under the text. The "Lanjut:" row and the "Salin ke P-Care" row are removed from the chat; the persistent chip row and the document pane's copy menu replace them.

## 4. Document pane

- Trigger: the first assistant message of a document mode (every mode except `question`, which answers in prose) in the encounter opens the pane; the canvas splits, chat narrows to the left. The pane stays open for the encounter; a collapse control closes it, and the document icon in the top bar reopens it.
- Tabs: **Ringkasan encounter** (section 6), then one tab per document in creation order, and **Lainnya +n** as a dropdown when more than two documents exist. Each tab shows the document title and its time.
- Pane tools: revision history (existing `revisions`, restore unchanged), copy, **Salin ke P-Care** (a menu holding today's `pcareCopies` items), print, download, collapse.
- Document head: title, time, review status select (Draf / Ditinjau / Final) and the review checklist, moved here from `DocumentStudio`. Editing returns the status to Draf, as today.
- Body: one column, editable in place with a small toolbar (Normal/Judul, tebal, miring, daftar). The two-column section rail, "Bagian" list, folded supporting sections and "Edit bagian" are removed. Sections remain markdown headings; the markdown model and `documentSections` stay for copy, download and sync.
- In the chat, a document arrives as one line ("Draf Diagnosis Banding disusun.") plus a document card (title, time) that focuses its tab.
- Below 1200 px the pane is a full-height sheet opened from the top-bar icon; below 760 px the chat fills the screen and the sheet covers it, like Glass on a phone. The 1200 px dialog of the cockpit is retired.

## 5. AADI analysis rendering

- Chat shows the existing five-line **Ringkasan untuk dokter** and the document card. Nothing else of the report is in the chat.
- The document is rendered from `storedCase(message)` (`CaseState` + `AadiResult` in `sourceText`), in this order: **Pembahasan kasus** (case facts, missing data, `reasoningNote`) → **Kemungkinan utama** (`differential.likely`) → **Alternatif** (`differential.alternatives`) → **Jangan terlewat** (`differential.cannotMiss`) → **Langkah diagnostik berikutnya** (`nextBestActions`, grouped question / exam / test, with indication) → **Rencana tata laksana** (the gated therapy: regimen lines with the "Cek dosis obat" status per drug, DDI, contraindications, disposition) → **Edukasi dan tindak lanjut** → **Kutipan pedoman** (section 3's cards). Each diagnosis: bold label, ICD-10 code, status word, supporting and opposing findings from `evidence[]`.
- Focus modes (`workup`, `icd10`, `refer`) are the same document with the focus section first, as today; `icd10` lists only codes the engine returned.
- The therapy section is produced only through `applyTherapyGate` (one strict rule, 2026-10-17). The gate report drives the per-drug status.
- Stored answers: a message whose `sourceText` has an engine result is rendered the new way; one without (local drafts, legacy nine-part or seven-part answers) is rendered as its markdown. `diagnosisContent` and `summaryCopies` keep reading the markdown, so copy, download and sync are unchanged. No migration, no backfill.
- `aadiDraft` keeps producing the nine-part markdown for storage and copy. The new renderer is a view, so a doctor who edits the document edits the markdown, which then renders as markdown. This is accepted: editing already drops the typed reveal today.

## 6. Ringkasan encounter (replaces the Clinical Cockpit)

The first tab of the pane. Blocks, each with a heading and, where it applies, a Buat/Segarkan control:

- **Timeline**: the encounter's documents by time (today's `timeline-document` list), and the patient's other encounters when the encounter is linked.
- **Ringkasan sumber**: the context facts the cockpit shows today (keluhan utama, anamnesis, riwayat, obat, alergi, from labelled context and patient notes), with "Edit konteks" and the original-text folds.
- **Pasien**: name, age, sex, "Edit detail pasien", or the link control for an unlinked encounter.
- **Daftar tugas**: the engine's `nextBestActions` as a checklist draft, with a Buat control that makes the local `tasks` document (existing mode). No "Care Gaps" (no EHR).
- Footer: "Tersimpan di browser" dot, plus the sync state when `/api/sync` is configured.

## 7. Pengaturan Agent

The "Pengaturan Agent" dialog becomes a page at `/agent` within the authenticated workspace, three tabs:

- **Preferensi**: global instructions (`settings.instructions`), spesialisasi, lingkungan (new, "Layanan primer / Rawat jalan", stored in settings, shown as the home pill), bahasa dikte, nama panggilan, format keluaran default.
- **Mode dan templat**: the 18 built-in modes with an optional instruction text each (new, stored under `settings.modeInstructions`, applied to local drafts only; AADI prompts are not user-editable), personal templates (existing editor), favourites.
- **Pengetahuan**: read-only list of the installed TheOracle index (manifest id, chunk count, embedding model, hash), and the catalogue version; a note that sources are installed by the operator.

Settings schema: two optional fields added (`environment`, `modeInstructions`); legacy workspaces load unchanged (optional-field rule, 2026-10-09).

## 8. Data, safety, out of scope

- No change to: storage format v2, `Message`/`Encounter`/`Patient` types, AADI request/response contract, gateway, auth and consent, sync projection, evidence gate, PII guard.
- No ads, no Connect EHR, no patient-facing mode, no billing codes.
- Tokens: `--radius-control` 8 px and `--radius-structure` 12 px are overridden in `globals.css` (the Sentra snapshot `sentra-tokens.css` is not edited); tosca, hover and accent ink unchanged; shadows only on the canvas and dialogs; fonts unchanged. Motion rules of AGENT-CONTEXT section 11 apply; the pane opening is a 160 ms fade, no slide.
- Copy stays Indonesian sentence case. No closing disclaimers on local drafts.

## 9. Staging

Each stage ships on its own and leaves the app usable:

1. Shell and tokens: sidebar order, account menu, canvas, radius tokens, session toolbar merged into the menu.
2. Composer and chip row: shortlist, `opening` sentences, chip prefill, `/` as the full picker, removal of tabs and rows; CaseGuide and the case strip removed (2026-11-04 amendment).
3. Document pane and Ringkasan encounter: split layout, tabs, tools, review head, cockpit retired, mobile sheet.
4. AADI rendering: the structured document, Kutipan pedoman cards, honest progress list, chat summary and card.
5. Pengaturan Agent page and settings fields.

## 10. Testing

- Update: tests that assert intent tabs, quick actions, the two-column rail, "Lanjut" chips, cockpit markup, thinking-card timing.
- New: chip prefills and never submits; "Perbarui …" after a document exists; `/` lists all 18 modes and personal templates; the pane opens on the first document and not for `question`; structured rendering from `storedCase` covers likely/alternatives/cannotMiss, evidence, next actions and gated therapy; a nine-part legacy answer renders as markdown; `applyTherapyGate` is the only therapy path (existing test extended); settings with and without the new fields load; the progress list shows only reported steps.
- Browser: `SENTRAPEDIA_AUTH_MODE=local` preview at 1440, 1024 and 375 px, captures into `docs/verification/`, axe on home and encounter.
- Gates: `npx tsc --noEmit`, eslint on touched files, full Vitest, `npm run test:system`.

## Known limitations

- Glass's editor is a rich-text editor; this design edits markdown with a thin toolbar. Headings, bold, italics and lists only.
- Rotating headline, pill and chip opening sentences are static copy; nothing is personalised.
- The Pengetahuan tab reads the index manifest only; it does not list documents.
