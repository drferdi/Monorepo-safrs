# Sentrapedia decisions

## 2026-10-08 — Standalone Glass recreation

- Keep all application dependencies, configs, tokens, lock state, tests, and deployment assets capsule-local. Empirical extraction passed outside Monorepo.
- Implement browser-local workflows without silently obtaining credentials or calling other capsule services.
- Preserve clinician-supplied text and organize explicit English/Indonesian labels. Local question/DDx/A&P output is a scaffold; actual medical reasoning requires a reviewed backend.
- Match the screenshot's desktop composition; use a responsive drawer for small screens and custom vector artwork for the promotional image.
- Gaffer's explicit autonomous completion request supersedes intermediate design checkpoints and the earlier verification halt; record failures, solve them, and verify the final implementation.

## 2026-10-09 — Five local workspace concepts

- Gaffer approved all five design/workflow concepts and explicitly requested solo implementation without an additional worker; review was performed inline.
- Keep v1 browser storage compatible using optional source/baseline/status metadata. No clinical inference, AI provider, knowledge base, or archive changes.
- Draf → Ditinjau → Final is a user-controlled local workflow. Editing returns to Draf. It is not clinical sign-off, authentication, or an audit trail.
- Snapshot input/context/patient notes/format preferences at generation. Preserve snapshots and initial content across edits; do not backfill provenance for legacy documents.
- Read only explicit context labels; keep conflicting encounter/patient values separately labeled and missing facts unavailable. Timelines never merge unrelated or unlinked Patients.
- Use the existing independently installed extraction and identical lockfile for gates while respecting the no-install constraint. Main checkout runtime remains a separate baseline limitation.

## 2026-10-09 — Compact interface and reactive headlines

- Keep stored setting identifiers and documents unchanged; localize Primary Care/Standard through display-only helpers.
- Default headline follows Gaffer's explicit copy list. Other headlines follow the active intent group, with a short CSS transition and no automatic cycling. Keep Tosca/light theme and existing reduced-motion behavior.

## 2026-10-09 — Four persistent local workflow tools

- Gaffer confirmed the written spec and requested execution; no additional workers. Review performed solo; independent review remains unavailable under that constraint.
- Extend version-1 storage with optional metadata. Validate new fields separately so malformed metadata does not discard valid legacy documents. Preserve source/baseline; record revisions only on actual content changes, with 50 snapshots per document.
- Review checklists are user work metadata. At least one required item, all required checks, and reviewed status precede Final. Edit/restore/list changes reset signs and status; legacy final records remain readable. Global default changes affect subsequent documents only.
- Template preferences are recorded without AI interpretation. Only explicit matching labels fill personal sections; missing sections remain unavailable. Capture the selected template in document provenance so later edits/deletion cannot change the source.
- Queue status/pins/tasks remain manual per Encounter and independent of document/clinical status. Storage failures retain a visible warning; no successful-save claim on failed writes.

## 2026-10-09 — Oracle catalog and existing MIRA adapter

- Gaffer authorized integrate-both after comparison; execute solo. Oracle remains read-only, unreviewed source text with file/hash/record provenance. Use 15 actual categories rather than metadata's 14; never merge disease entries by repeated ICD code.
- Localize Med Assist's v1 schema/type/validator snapshots with attribution, no runtime cross-capsule dependency. Reuse the existing MIRA service/provider; no install, credential copy, upstream change or paid verification. Optional server-only token and loopback URL; health availability is separate from authenticated readiness.
- Synthetic structured input only, no Patient/Encounter auto-copy. Same-origin/loopback/Host validation and bounds/timeout/cancel protect the local adapter; it is not a production authenticated API. Preserve full result/case/trace in an explicit draft, all model evidence and outside-Oracle diagnoses. Oracle narratives never generate regimens. Review metadata remains manual and not clinical certification; PNPK page sources still unavailable.
## 2026-10-09 — Free OpenRouter routing

- Gaffer selects free OpenRouter models; both MIRA stages pinned to apodex/apodex-1.1-mini:free after official metadata/JSON/ZDR compatibility check. Experimental, not clinically validated. No random free router, paid fallback, privacy weakening or replacement of clinical postchecks.
- Keep shared Med Assist MIRA instance untouched. Prepare a separate service using existing runtime, process-only profile and own ignored configuration. No external .env reads or installs; key missing is explicit readiness state. Gateway refuses non-free/mixed profiles before inference and missing/nonzero cost after response. Health/configuration is not authenticated provider verification.- 2026-10-09: Gaffer approves paid DeepSeek Flash and declines training-use consent. Select deepseek/deepseek-v4.1-flash for both MIRA stages, fixed ZDR/no-training privacy preserved, fictional-only local instance8791, service budgets0.10USD/step and1USD/day. Free-only selection superseded; no production/clinical accuracy authorization inferred.

## 2026-10-09 — Kode ICD-10 quick action

- Gaffer chose codes from the existing case analysis over a local Oracle lookup. `icd10` is a focus mode like `workup`/`refer`: the same analysis, with a "Kode ICD-10" section first listing only the codes the analysis returned, grouped as likely / alternatives / cannot-miss. No new ICD-10 catalogue or code inference.

## 2026-10-09 — Every click-driven UI change transitions smoothly

- Gaffer: every UI change from a click must transition smoothly. Opacity only, 160 ms ease-out: content that appears fades in through CSS (`fade-in` keyframes, `@starting-style`); content that leaves or reflows cross-fades through a View Transition (`components/smooth.ts`). No movement, scale or springs added; approved motion (headline, submenu, mode picker, diagnosis reveal, thinking steps, pixel loader, mobile drawer) is unchanged. Reduced motion and browsers without view transitions apply changes at once.

## 2026-10-09 — Tosca controls, sky quick actions and the greeting

- Clinical-question quick actions use a sky-blue chip palette (`--chip-sky-*`) that sits beside the tosca accent; Gaffer chose "Biru sky".
- The Berlangganan tosca is the guideline for the send button, microphone and the four intent tabs. Relief stays light: Gaffer asked twice to reduce neumorphism, so these share a 15% gradient with a `0 1px 2px` shadow, pressed = inset. The microphone alone keeps its earlier thin two-sided neumorphism ("yg mic biarkan"). Intent tabs have square corners ("Tab jadi sudut tajam").
- "Ruang kerja klinis" replaces both the header "Workspace Clinical" label and the home "RUANG KERJA KLINIS" eyebrow, with the motion of lab.xevrion.dev/lab/greeting recreated in CSS (sun or moon by local time, rising along an arc, 700 ms) and no new dependency. The glyph is time-based, so it is the moon from 19:00 to 06:00.
- Superseded the same day: Gaffer asked for a real Indonesian greeting with the user's name instead of "Ruang kerja klinis". The text is "Selamat pagi/siang/sore/malam, {name}" by local hour (pagi from 04, siang 11, sore 15, malam 18); the sun now sets at 18 to match "malam". The app had no user name, so an optional "Nama panggilan" joins Settings, stored locally; until it is filled the greeting has no name. Legacy workspaces without the field still load.

## 2026-10-09 — Clinical template pack v1 (labels, order, insertable structures)

- Source: Gaffer's `sentrapedia_templates_klinis_indonesia_v1.json` / `.md` (18 templates). Gaffer chose "Label, urutan, sisipkan": the pack sets the 18 mode labels, their order and six categories in the Mode picker, and 18 built-in structures that are previewed and appended to the composer on an explicit "Sisipkan ke input". Local draft output and MIRA are unchanged; making drafts follow the pack's fields was offered as R3 and not chosen.
- The pack's four "audit" modes map to existing handlers: Pemeriksaan Penunjang = `workup`, Pengodean Diagnosis (ICD-10) = `icd10`, Pemantauan Klinis = `monitoring`, Telaah Rujukan = `refer`. Mode IDs are unchanged, so stored documents, favourites and personal templates keep working.
- The four composer tabs (Analisis/Dokumentasi/Rencana/Komunikasi) and their quick actions stay; only their labels follow the pack. Inserted text keeps the pack wording, including the missing marker on every field, and never replaces what is typed.

## 2026-10-09 — Swiss style, current colours

- Gaffer: "semua design UI buat lebih profesional ala swiss style namun gunakan warna sesuai saat ini". One corner radius (`--radius: 2px`) everywhere except circles; no decorative shadows (`--workspace-shadow`, `--workspace-modal-shadow`, `--workspace-brand-shadow` are `none`); floating layers (dialogs, menus, toast) are outlined with `--floating-line`; strong rules (`--rule-strong`) open the home heading, sit under dialog titles and under column heads; small labels in spaced capitals; Helvetica Neue first in the stack; tighter, heavier headlines; everything flush left, footer included; canvas meets sidebar and panel on straight rules instead of floating as a rounded card. Palette unchanged.
- Kept: the tosca controls' light relief and the microphone's thin neumorphism (earlier rulings), now on the sharp corner.
- Same evening, Gaffer: "jajarannya warna hijau tosca di kurangi lg". Only the chosen intent tab is filled tosca; the other three are the pale tosca tint (`--workspace-accent-soft`) with tosca-ink text, flat fills so a switch fades the colour (160 ms).
- Then "hijau kurangi sedikit": the chosen tab is tosca mixed with 30% white (about #79e9de), softer than Berlangganan, which keeps the full tosca.

## 2026-10-09 — Local documents in two columns

- Gaffer: "Clinic note redesign menjadi 2 kolom", left column = the section list (his choice). Every local draft or personal-template document with two or more sections uses the same two-column view as MIRA analyses: a sticky section list on the left (label "Bagian"), the document on the right; the closing note after `---` stays visible. Content and draft logic unchanged; one-section documents (Daftar tugas) stay single column.
- Then: "BAGIAN ... geser mentok kiri agar ... sejajar vertikal dengan kolom text user". On viewports wider than 900 px and canvases of 720 px or more, the section list hangs in the canvas's left margin and the document text starts on the same line as the composer, the intent tabs and the user's messages; the reading column shifts right only as far as needed (left margin at least 212 px). Applies to MIRA analyses too; narrower screens keep the list inside the column.

## 2026-10-09 — Catatan Klinis: list on the right, Edit per section, Indonesian names

- "atau bawa ke sebelah kanan" supersedes the left-margin list: the section list hangs in the canvas's right margin, so the document text lines up with the composer, intent tabs and user messages. Widths use `cqw` so the conversation scrollbar cannot shift the columns.
- Two-column documents drop the "Bagian" select bar; each section heading carries its own "Edit" (Gaffer chose "Pilihan Bagian di atas"). The local draft's provenance and patient lines are hidden on screen only (Gaffer chose "Hanya di tampilan"); stored content, copy and download keep them.
- Gaffer's names for the clinic note: title "Catatan Klinis"; Indonesian sections Keluhan Utama, Riwayat Penyakit, Riwayat Pengobatan / Alergi, Pemeriksaan Fisik, Assessment, Tata Laksana. English output keeps its English sections. Stored documents are not rewritten.

## 2026-10-09 — No closing disclaimer on local drafts; supporting sections fold

- Gaffer, on the line "Draf lokal berdasarkan teks yang diberikan. Belum ditinjau klinisi; bukan jawaban AI atau pedoman tervalidasi. Informasi yang tidak diberikan tidak disimpulkan.": "HAPUS". Local drafts no longer end with `---` and that note, in either language; the "Draf lokal · specialty · model" line at the top stays in stored content, copy and download. Supersedes "the closing note after `---` stays visible" in the two-column entry. Same direction as his standing "no disclaimers" ruling for answers.
- "Teks sumber (verbatim)" and "Konteks tambahan" (and their English names) are supporting sections: folded by default, smaller type, opened with a fade. They stay in the section list.

## 2026-10-09 — Type pair: Cal Sans titles, Geist text

- Gaffer: "Coba rubah semua text styling" with a Title spec (Cal Sans 500, 30/36) and a Body spec (Geist 400, 15/23), colours "menyesuaikan halaman". Titles (home headline, document title, dialog title) are Cal Sans 500 30/36 in primary ink at 90%; other headings take Cal Sans at their own size; reading text is Geist 15/23 in the secondary ink; all remaining UI text is Geist at its existing size. Replaces the Helvetica Neue stack and tight headline tracking from the Swiss pass. The wordmark keeps Helvetica.
- Fonts come from `next/font/google` (self-hosted after build). Cal Sans exists only at 400 on Google Fonts; weight 500 renders that face without synthetic bold, as on Gaffer's reference.

## 2026-10-09 — Text ink off black

- Gaffer: "scan semua font dengan warna HITAM, rubah semua sedikit less black agar muncul kesan premium". All black text (primary ink and form controls) is #232326; titles stay at 90% of it. Strong rules and floating outlines keep #131313, since the request named text only.

## 2026-10-09 — Slimmer, lighter titles on Cal Sans

- Gaffer: "buat font title lebih kurus dan less black"; Cal Sans has one weight, and he chose to keep it slimmed by a hairline stroke in the ground colour (`--title-ground`) over switching faces. Titles are a solid 80% ink (rgb 78,78,81).

## 2026-10-09 — Titles in Plus Jakarta Sans

- Gaffer asked for a slim yet smooth title face and chose Plus Jakarta Sans (Tokotype, Indonesia) over Outfit, Manrope, Urbanist, Sora, Inter Tight and Geist light. Supersedes Cal Sans and its slimming stroke. 30/36 titles at 300, 18/24 section headings at 400; body stays Geist 400 15/23; title colour stays rgb(78,78,81).
- Then "bagus nih, lebih black": titles take the full text ink #232326 (no lighter mix).

## 2026-10-09 — Home top, input text, active tab label

- The home rule, greeting and headline sit right under the header ("mepet bagian atas"); the composer stays at the bottom.
- Composer text is 14/22 with a soft text shadow ("kurangi 1px dan more shadow").
- The chosen intent tab's label is white with a soft tosca-ink shadow (Gaffer's call; white on the light tosca is about 1.5:1, the shadow is what keeps it legible).
- Revised the same evening: no text shadow in the composer; the placeholder fades back instead ("buat agak menghilang", muted mixed 70% with white). The chosen tab's label is back to tosca ink ("text kembali awal"); the white label is withdrawn.

## 2026-10-09 — Quick actions neutral

- Gaffer rejected the sky-blue quick actions ("warnanya jelek, text jadi gak jelas"), superseding the earlier "Biru sky" choice. They are white with a hairline border and ink text at 12 px 500; the chosen one has an ink outline.

## 2026-10-10 — MIRA installed with Sentrapedia

- Gaffer requires one system: capsule-local MIRA source/runtime, installed by npm ci,
  started and stopped with Next by dev/start. This supersedes external MiraRoot setup.
- Preserve clinical engine/prompt/schema bytes; snapshot exact planning schemas and
  routine prompt with source provenance, avoiding the research FHIR/ML import stack.
- Use private loopback port and per-run token; preserve provider/model/privacy/price
  gates and existing audit/budget path. Windows job ownership precedes child execution.
- Fresh extraction and packaged standalone passed; R2 review PASS. No paid inference
  or Docker image execution claimed. Gaffer approved corrected verification override.
