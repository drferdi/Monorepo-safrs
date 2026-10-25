# Sentrapedia decisions

Append new decisions at the end. When a decision replaces an earlier one, add a `- Status:` line under the earlier heading naming the later decision; entries without a status line are live.

## 2026-10-14 - One product capsule with a public site subsystem

- Gaffer superseded the temporary sibling `sentrapedia-website` capsule placement.
- The public website lives at `apps/site/` inside the sovereign `projects/healthcare/sentrapedia` capsule and future standalone repository.
- The clinical workspace remains at the capsule root for this bounded migration. Moving it to `apps/web/` would be a separate architecture change with no current functional benefit.
- A future demo belongs at `apps/demo/` as environment configuration and synthetic data using shared product code, never as a copied implementation.
- Parent install, build, lint, test, and deploy dry-run commands include the site lifecycle.

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

## 2026-10-09 — Oracle catalog and existing AADI adapter

- Status: the catalogue content and its categories are derived from the knowledge SSOT since 2026-10-21 (see "Single knowledge source").
- Gaffer authorized integrate-both after comparison; execute solo. Oracle remains read-only, unreviewed source text with file/hash/record provenance. Use 15 actual categories rather than metadata's 14; never merge disease entries by repeated ICD code.
- Localize Med Assist's v1 schema/type/validator snapshots with attribution, no runtime cross-capsule dependency. Reuse the existing AADI service/provider; no install, credential copy, upstream change or paid verification. Optional server-only token and loopback URL; health availability is separate from authenticated readiness.
- Synthetic structured input only, no Patient/Encounter auto-copy. Same-origin/loopback/Host validation and bounds/timeout/cancel protect the local adapter; it is not a production authenticated API. Preserve full result/case/trace in an explicit draft, all model evidence and outside-Oracle diagnoses. Oracle narratives never generate regimens. Review metadata remains manual and not clinical certification; PNPK page sources still unavailable.
## 2026-10-09 — Free OpenRouter routing

- Gaffer selects free OpenRouter models; both AADI stages pinned to apodex/apodex-1.1-mini:free after official metadata/JSON/ZDR compatibility check. Experimental, not clinically validated. No random free router, paid fallback, privacy weakening or replacement of clinical postchecks.
- Keep shared Med Assist AADI instance untouched. Prepare a separate service using existing runtime, process-only profile and own ignored configuration. No external .env reads or installs; key missing is explicit readiness state. Gateway refuses non-free/mixed profiles before inference and missing/nonzero cost after response. Health/configuration is not authenticated provider verification.- 2026-10-09: Gaffer approves paid DeepSeek Flash and declines training-use consent. Select deepseek/deepseek-v4.1-flash for both AADI stages, fixed ZDR/no-training privacy preserved, fictional-only local instance8791, service budgets0.10USD/step and1USD/day. Free-only selection superseded; no production/clinical accuracy authorization inferred.

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

- Source: Gaffer's `sentrapedia_templates_klinis_indonesia_v1.json` / `.md` (18 templates). Gaffer chose "Label, urutan, sisipkan": the pack sets the 18 mode labels, their order and six categories in the Mode picker, and 18 built-in structures that are previewed and appended to the composer on an explicit "Sisipkan ke input". Local draft output and AADI are unchanged; making drafts follow the pack's fields was offered as R3 and not chosen.
- The pack's four "audit" modes map to existing handlers: Pemeriksaan Penunjang = `workup`, Pengodean Diagnosis (ICD-10) = `icd10`, Pemantauan Klinis = `monitoring`, Telaah Rujukan = `refer`. Mode IDs are unchanged, so stored documents, favourites and personal templates keep working.
- The four composer tabs (Analisis/Dokumentasi/Rencana/Komunikasi) and their quick actions stay; only their labels follow the pack. Inserted text keeps the pack wording, including the missing marker on every field, and never replaces what is typed.

## 2026-10-09 — Swiss style, current colours

- Gaffer: "semua design UI buat lebih profesional ala swiss style namun gunakan warna sesuai saat ini". One corner radius (`--radius: 2px`) everywhere except circles; no decorative shadows (`--workspace-shadow`, `--workspace-modal-shadow`, `--workspace-brand-shadow` are `none`); floating layers (dialogs, menus, toast) are outlined with `--floating-line`; strong rules (`--rule-strong`) open the home heading, sit under dialog titles and under column heads; small labels in spaced capitals; Helvetica Neue first in the stack; tighter, heavier headlines; everything flush left, footer included; canvas meets sidebar and panel on straight rules instead of floating as a rounded card. Palette unchanged.
- Kept: the tosca controls' light relief and the microphone's thin neumorphism (earlier rulings), now on the sharp corner.
- Same evening, Gaffer: "jajarannya warna hijau tosca di kurangi lg". Only the chosen intent tab is filled tosca; the other three are the pale tosca tint (`--workspace-accent-soft`) with tosca-ink text, flat fills so a switch fades the colour (160 ms).
- Then "hijau kurangi sedikit": the chosen tab is tosca mixed with 30% white (about #79e9de), softer than Berlangganan, which keeps the full tosca.

## 2026-10-09 — Local documents in two columns

- Gaffer: "Clinic note redesign menjadi 2 kolom", left column = the section list (his choice). Every local draft or personal-template document with two or more sections uses the same two-column view as AADI analyses: a sticky section list on the left (label "Bagian"), the document on the right; the closing note after `---` stays visible. Content and draft logic unchanged; one-section documents (Daftar tugas) stay single column.
- Then: "BAGIAN ... geser mentok kiri agar ... sejajar vertikal dengan kolom text user". On viewports wider than 900 px and canvases of 720 px or more, the section list hangs in the canvas's left margin and the document text starts on the same line as the composer, the intent tabs and the user's messages; the reading column shifts right only as far as needed (left margin at least 212 px). Applies to AADI analyses too; narrower screens keep the list inside the column.

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

## 2026-10-10 — AADI installed with Sentrapedia

- Gaffer requires one system: capsule-local AADI source/runtime, installed by npm ci,
  started and stopped with Next by dev/start. This supersedes external AadiRoot setup.
- Preserve clinical engine/prompt/schema bytes; snapshot exact planning schemas and
  routine prompt with source provenance, avoiding the research FHIR/ML import stack.
- Use private loopback port and per-run token; preserve provider/model/privacy/price
  gates and existing audit/budget path. Windows job ownership precedes child execution.
- Fresh extraction and packaged standalone passed; R2 review PASS. No paid inference
  or Docker image execution claimed. Gaffer approved corrected verification override.

## 2026-10-11 — Design audit fixes
- Gaffer approved the `docs/DESIGN-AUDIT.md` judgment items. The mic becomes a plain tool icon,
  superseding the earlier Chief note "yg mic biarkan".
- Task headlines carry no numbering or claims ("Analisis kasus klinis.").
- Chrome labels are in Indonesian (Mode suara, Pusat perintah, Kokpit klinis, Jenis kelamin,
  footer), and labels use sentence case, not uppercase.
- On home, a quick-action mode hides the Mode trigger behind "Templat lain" after the chips;
  the trigger returns in the composer for non-quick templates and in chat.
- Empty draft sections collapse into one "Belum diisi" line of editor links. Queue cards show
  patient, date and counts; status and tasks sit under "Status dan tugas".
- The thinking card keeps its timed steps (M-02 declined). Dark mode and the type-scale refactor
  are out of scope.

## 2026-10-11 — Own repository
- Sentrapedia is an independent project with its own repository, https://github.com/drferdi/Sentrapedia.
  The monorepo is the governance/work framework only; no architectural dependency on it unless documented.
- History is published by `git subtree split` of `projects/healthcare/sentrapedia`, keeping the capsule history.
  Every push to it still passes the monorepo publish gate by Gaffer's decision.

## 2026-10-16 — Hero motion
- The hero intro keeps only the neuron and the wordmark. The unrendered `sentrapedia-hero.webm` and the
  uncommitted carousel WIP are gone (a copy of the WIP sits in the session scratchpad only). In their place:
  a short product film (Higgsfield, Kling 3.0 Turbo, image-to-video from the studio render `workspace.png`)
  that dissolves into a GSAP simulation of the real workspace with a visible pointer, then loops.
- Desktop layout is side by side (identity lockup left, device right). Gaffer's arrival order: the neuron
  alone in the centre, slide left as the wordmark joins it, slide left again as the device enters.
- The simulation shows only shipped features (DDx, SOAP, review checklist, referral) on a synthetic case;
  every draft stays "Draf lokal" until the physician reviews it. Reduced motion gets the static composition
  with no film; the "Jeda/Putar" control pauses both film and simulation.
- Higgsfield spend: one Kling 3.0 Turbo draft at 720p (7.5 credits, 120 -> 112.5). Seedance 2.5 needs a Pro
  plan on this account; any further generation or a final-quality render is a separate decision.

## 2026-10-16 — Hero film: push-in match cut
- Gaffer judged the first film-to-simulation dissolve disconnected. The clip was regenerated as a single
  continuous push-in from the wide studio shot to the monitor screen (Kling 3.0 Turbo via the Higgsfield
  MCP, 7.5 credits, 112.5 -> 105), and the dissolve now continues that zoom instead of freezing first.
- The MCP's preset suggestion ("IN THE DARK") was declined: the hero uses a literal camera move on the
  product render, never a stylised effect.
- A tighter, pixel-matched cut (Kling 3.0 with start and end frames, 10 credits) stays a separate
  decision; the current 15 of 18 approved credits are spent.
- Gaffer's follow-up on the mid-dissolve capture: no black bars above and below, the film shows as the
  tablet only. The film layer therefore shares the simulation's device frame (bezel, radius, 3:2 screen,
  4:5 on phones) and the clip is cropped to that screen, never letterboxed.

## 2026-10-16 — Meaning under the big wordmark
- `#logo-middle` now states who builds Sentrapedia and where: "Architected and built by professional
  doctors." and "Dikembangkan di RSIA Melinda DHAI.", the hospital name linking to https://melinda.co.id/
  (Gaffer's copy and link).
- The site's no-external-target gate stays. It carries a one-entry allowlist (`outboundLinks` in
  `scripts/verify.mjs`) for that link; any further outbound link is a new decision and a new entry.

## 2026-10-16 — Logo middle: the pinned block starts at the artwork
- The wordmark SVG's built-in whitespace no longer positions the sticky block: `.logo-middle-art` crops
  the SVG to its artwork band, so under the fixed header the wordmark starts at once and the meaning
  lines get their own scroll time before `#featured-projects` covers them. The hash-protected theme CSS
  stays untouched; the crop and the spacing live in `design-audit.css`.

## 2026-10-16 — Capabilities intro: the chat with Audrey is a Higgsfield render
- The visual beside "Dari encounter hingga referensi." is a generated product render (GPT Image 2.5,
  the studio family of the other renders) of a doctor-Audrey conversation on a synthetic measles case,
  not a hand-coded chat UI: Gaffer rejected the HTML panel and asked for Higgsfield "untuk hasil terbaik".
- Every Audrey reply is tagged with a shipped capability (Fast Assessment, Mesin Dokumentasi, Sentrapedia
  Library / ICD-10); clinical specifics stay structural (no doses, no guideline titles); the render closes
  with "Draf lokal · keputusan tetap pada dokter."
- "Audrey" as the assistant's name exists only in this render; registering it (SPDS, brand) is a separate
  decision for Gaffer. Credits: 4.5 (105 -> 100.5). The DrawSVG route line and the other motion options
  are dropped.

## 2026-10-16 — Capabilities: a physical anatomy of the workspace
- Gaffer requested an Anatomy figure in "Ruang kerja / Sepuluh kemampuan" and Higgsfield motion/video.
  A precision workbench connects an encounter tray, assessment sorter, reference cabinet, and document
  plotter with a separate manual review control. These objects illustrate the existing workflow;
  the physician retains decision authority. The Audrey intro and ten capability items remain.
- Use capsule-local generated SVG for the selectable diagram, with one teal emphasis at a time,
  keyboard phase selection, an idle tour, pause/offscreen handling, and static reduced-motion output.
  The vendored Anatomy kit snapshot is authoring code within the capsule, never an external lifecycle dependency.
- The opt-in film is a distinct generated interpretation of this metaphor: Kling 3.0 Turbo, 5 seconds,
  720p, job `b0f466ff-7b3f-4416-a1fe-c7061e55fc0f`, 7.5 credits (100.5 -> 93). No additional render,
  commitment, publication, or change to open branding/SPDS decisions is implied.

## 2026-10-16 — Modern digital anatomy is the capabilities opener
- Gaffer replaces "Dari encounter hingga referensi" and its Audrey intro image with anatomy,
  and rejects the analog cabinet/paper/plotter aesthetic as old-fashioned. Use a contemporary
  computing-device metaphor: glass context/document panels, processor, solid-state reference
  module and teal data traces. This supersedes the preceding physical workbench styling.
- Motion must be visible immediately: the modern Higgsfield film plays on entering the viewport;
  diagram mode remains selectable, with continuously moving data traces even on hover/focus.
  Explicit pause, offscreen/tab-hidden pause, reduced-motion stillness and static fallback remain.
- One replacement Kling 3.0 Turbo 720p/5 s render, job `91f17bbd-9c30-45cc-808e-a98e438daf5c`,
  cost 7.5 credits (93 -> 85.5). The previous analog clip is backed up outside the capsule.
  These are workflow illustrations, not claims about physical deployment or clinical validation.

## 2026-10-16 - SVG-only layered anatomy replaces the small chapter footer
- Gaffer selects only the modern SVG, superseding the film-default decision. Initial overview
  separates base, PCB and four functional modules with no selected feature. Selection focuses its
  module; reset/Escape restores all layers. Moving data traces, pause and reduced motion remain.
- Feature text belongs inside the diagram frame: desktop titles up to 22px/body 16px, phone
  18px/15px. Anatomy replaces the small Anamnesis/Pemeriksaan/etc chapter footer and loses its
  large top padding. All six narrative stages and ten capability items remain unchanged.
- Use a capsule-local shared pose model for generation, interaction and tests. Depth ordering
  is sampled across 35 poses, not claimed as a swept-volume proof. Existing generated films
  remain inactive assets; no new credits, publication or commit.

## 2026-10-16 - Capabilities use a cinematic GSAP horizontal rail
- Gaffer rejects the intermediate sidebar/accordion and explicitly chooses horizontal GSAP
  for "Sepuluh kemampuan. Satu ruang kerja." Preserve anatomy, hero, narrative and all ten
  capability texts. Pin the desktop section and translate its inner track; large images and
  shaped divider frames remain the focus. Mobile/short viewport uses native horizontal snap;
  reduced motion stacks readable content. No Element.animate replacement for GSAP here.
- One shared 5s720p Higgsfield workflow metaphor was explicitly approved at7.5credits:
  Kling3.0 Turbo job c3a70832-d3a2-4f2b-9c65-75a98e52a30d, balance85.5->78. Existing
  Document Studio and 18Modes illustrations remain; other slots share one live video and
  a real static poster. No further media generation or spending is authorized.
- Do not wait on offscreen lazy-image decode before timeline initialization. Reserve frame
  ratios, settle responsive layout before refreshing ScrollTrigger, cancel stale scheduled
  refreshes and flush pending geometry before programmatic navigation. Native panel height
  follows the selected content without animating height or clipping the six outputs.

## 2026-10-16 - A coordinated image family for all ten capabilities
- Gaffer approves one dedicated image per capability, uniform white/graphite/turquoise
  palette and feature-specific text, then selects the Sentrapedia Library design as the
  preferred reference. Preserve the existing horizontal GSAP rail, anatomy and motion.
- Use built-in image generation with a shared master reference. Remove an invented S mark
  rather than introducing an unapproved logo. Store transparent lightweight WebPs locally;
  these are synthetic UI illustrations, not screenshots or validated clinical results.
- Keep the single existing shared video behind the transparent foreground imagery and
  add a small GSAP float to the selected image. Both follow pause/visibility/reduced-motion
  controls; no new Higgsfield credit spending, new video render or publication is implied.
- Older product images remain preserved; generation provenance belongs with the new assets.

## 2026-10-16 — Legal pages are siblings of the FAQ page
- The three mandatory pages (Kebijakan Privasi, Syarat dan Ketentuan, Penafian Klinis) are standalone routes
  built like `/faq/`: one source file each, one shared stylesheet and script, the same shell, header, kicker,
  display title and footer. Where the FAQ shows questions at display scale, these pages show plain-language
  statements; the long text follows in numbered articles with a sticky table of contents.
- Every claim on the privacy page describes what the site code does (no cookies, the contact fields, the
  patient-identifier rejection, 15-minute IP memory, Resend and Vercel as the only processors); items the SPDS
  marks UNKNOWN (retention, lawful basis, venue) are written as commitments for Gaffer to confirm, not as facts,
  and no email address is published.
- The work lives on its own branch and worktree because another agent was writing in `apps/site` at the same
  time: one writer per scope.

## 2026-10-16 - Individual capability films with GSAP explanations
- Gaffer approves eight distinct five-second, silent Higgsfield clips, one for each raster capability,
  with a hard total ceiling of 60 credits. All eight Kling 3.0 Standard jobs completed at 7.5 credits
  each; the account balance moved from 78 to 18. No further paid rendering is implied.
- The two anatomy SVG capabilities remain interactive GSAP diagrams. Each of the ten scenes gets its
  own timed heading, copy, and three-step teal explanation line. One video element is reused across
  raster scenes, loading only the active clip when motion is allowed; pause, visibility, and reduced-motion
  controls keep still-image fallbacks available.
- The eight foreground illustrations are re-encoded at WebP quality 97 from the original generated PNGs.
  Fast Assessment's left copy surface is white again. All illustrations and films remain synthetic product
  metaphors, not screenshots of a validated clinical system.

## 2026-10-16 - Preserve exact capability artwork beneath scene-specific motion
- Gaffer requested higher-quality capability video after reviewing the eight 720p generative films, and
  specifically removed the cyan background behind Sentrapedia Library. The active clips are now five-second
  1586x992 H.264 composites of the approved high-resolution illustrations and individually animated teal
  signal paths. This keeps typography stable and 16:10 framing exact while retaining visible motion.
- Original Kling jobs remain in the provenance record but are not the active site clips. The replacement
  used Higgsfield's media sandbox for local-style FFmpeg processing, with zero new generation credits.
  One lazy video node, GSAP text/line explanations, the two interactive SVG anatomy scenes, pause and
  reduced-motion fallbacks remain. The Library frame is white; Fast Assessment's left copy stays white.

## 2026-10-16 - Capability UI becomes live HTML/SVG
- Gaffer explicitly selected HTML/SVG with animated lines and foreground elements after finding the generated interface text insufficiently sharp. This supersedes video/bitmap as the active presentation for eight capability scenes; the paid Higgsfield work is retained as historical source material, not deleted or regenerated.
- Render each scene's labels and UI shapes as real DOM/SVG, preserve the existing two anatomy diagrams and the right/down/right/down GSAP rail, and animate vector paths, signal pulses and content entrances. Keep a static readable state without JavaScript and respect reduced motion.
- This is a presentation illustration using synthetic data, not a functional clinical interface or a change to clinical logic. Final test and all-scene visual verification remain open after Jev stopped a retry of outdated-assertion tests.

## 2026-10-17 - Clinical workspace headline separates promise from physician review
- Gaffer approved "Ruang kerja klinis untuk dokter Indonesia." as the large `#home-text` headline, with the specific workflow description below rather than crowding the heading.
- Describe diagnosis output as a proposal for physician review, alongside clinical questions, SOAP notes and referral letters grounded in clinician-entered findings. Do not turn this presentation copy into a claim of autonomous clinical decision-making.
- This decision changes site copy only; the three explanatory columns and `child.png` placement require separate direction.

## 2026-10-17 - Use a concise journey line under the clinical workspace headline
- Gaffer replaces the detailed gray subheading with "Dari pertanyaan klinis sampai surat rujukan, dalam satu alur." The three-column explanations below retain the fuller context and physician-review boundaries.
- The headline, column content, `child.png` placement and underlying clinical behavior are unchanged.

## 2026-10-16 — Cockpit accessibility: launcher clearance and muted text
- Status: the launcher footprint part is superseded by "2026-10-16 - Dify is removed from Sentrapedia"; the muted-text rule stays live.
- The floating Vera launcher keeps its place (bottom right). Its footprint is three tokens (`--launcher-inset`, `--launcher-height`, `--launcher-width`), and the layouts it can cover reserve that footprint instead of moving it: the chat composer's hint line becomes the launcher's band when the canvas is under 1080px (780px column plus 2 x 150px footprint) and no inline cockpit is open, the home footer keeps clear of it, and the inline cockpit's fictional-data footnote sits above it. Any new bottom-right control must clear the same tokens.
- Muted text (`--color-text-muted`, 4.37:1 on `--color-background-surface`) stays off the surface colour; text there uses `--color-text-secondary`. `tests/design-tokens.test.ts` guards the token ratios and the known surface selectors.
- Two axe findings are recorded exceptions rather than fixes: the slash picker's scroll region (a `<textarea>` cannot carry `role=combobox`; keyboard access works through `aria-activedescendant`) and the Vera hero's normal-motion contrast reading (a finished `fill-mode: both` animation; the real hit-test shows the dark panel).

## 2026-10-16 - Dify is removed from Sentrapedia
- Gaffer cancelled Dify. The Vera side chatbot, the `/dify` page and the `/api/dify/*` routes are deleted, not hidden behind a flag. AADI with TheOracle grounding and the evidence gate remains the only clinical answer path.
- The bottom-right launcher footprint tokens and clearance rules went with the widget. A future floating control must define its own footprint and clearance.

## 2026-10-17 - One human anatomy study supports the clinical-workspace intro
- Status: presentation superseded by "2026-10-17 - Anatomy becomes unframed transparent art in the left column"; location superseded by "2026-10-17 - Clinical introduction moves to its own page".
- Gaffer approved one anatomical body study in the left side of `#home-text` while keeping its headline, subheading and three explanatory columns intact. The figure is an editorial, synthetic educational metaphor and is labeled as not a diagnostic guide; it must not imply validated clinical evidence or alter diagnosis behavior.
- The native HTML/SVG instrument frame and scan line stay crisp at browser resolution. A generated still remains the fallback; one five-second Higgsfield MiniMax H3 2K clip supplies restrained motion, job `9d10b50c-e1df-4c08-8d6d-a43ddd7c4e47`, quoted at 10 credits. Do not infer additional render cost from concurrent account-balance changes.
- Motion pauses offscreen or by user control, and reduced-motion presents the still image. No further paid generation, publication or clinical feature expansion is implied.

## 2026-10-17 - Anatomy becomes unframed transparent art in the left column
- Gaffer rejected the dark instrument card around the human-body study. Use a transparent-background cutout as integrated visual art in the left column of `#home-text`, with no enclosing panel, border, caption rail, or baked-in video background. The headline, concise journey line, and three explanatory columns stay intact.
- The built-in image edit was rejected by its output filter. Gaffer explicitly approved local extraction of the existing PNG, with no external upload or additional generation cost. Keep the original atlas PNG and Higgsfield MP4 as historical source assets, but do not play the opaque MP4 in this section.
- Motion is a restrained CSS float and cyan pulse, paused offscreen or by the user and disabled under reduced-motion preference. The anatomy is conceptual illustration only, not clinical evidence or a diagnostic reference.

## 2026-10-17 - AADI uses google/gemini-3.1-flash-lite for both stages
- Status: route and model id superseded by "2026-10-17 - AADI calls the Gemini API directly instead of OpenRouter"; the model choice stays.
- Gaffer asked for the fastest Gemini, then chose `google/gemini-3.1-flash-lite` as the default for planning and assessment (`scripts/aadi-profile.json`, pinned in `tests/aadi-paid.test.ts`). It supersedes `google/gemini-2.5-flash` from the 2026-10-09 model override; OpenRouter, synthetic-only data policy, no ZDR, throughput sorting and the Google fast-copy providers are unchanged.
- Basis: one live run per model on the same fictional case. Model stages took 4.5 s against 5.6 s for 2.5-flash, at 0.0135 against 0.0169 USD, with the same verified therapy (ambroxol, paracetamol). `gemini-3.5-flash-lite` was slightly faster (4.3 s) but cost more (0.0202 USD) and proposed dextromethorphan for a productive cough. Evidence: `verify-report/full-check/2026-10-16/results/mira-live-3.json` to `-5.json`.
- Limits: a single run per model is not a benchmark, and the 5 s target is still missed because TheOracle retrieval takes 3.8 s warm and 12 s cold. Warming retrieval stays the larger latency fix.

## 2026-10-17 - AADI calls the Gemini API directly instead of OpenRouter
- Status: live. The open item below is closed: three live runs on 2026-10-17 passed (HANDOFF archive, "AADI calls the Gemini API directly, no OpenRouter").
- Gaffer rejected the OpenRouter route and chose a Gemini API key (`GEMINI_API_KEY`). The model stays Gemini 3.1 Flash-Lite, now under its bare Gemini API id `gemini-3.1-flash-lite`. This supersedes the OpenRouter, no-ZDR, throughput-sorting and Google fast-copy-provider parts of the 2026-10-09 override and of the entry above.
- Route: the engine's existing `openai` provider with `OPENAI_BASE_URL` set to Google's OpenAI-compatible endpoint, set by the launcher. A new `gemini` provider value was rejected because it would diverge `common/providers.py`, `common/guard.py` and `service/settings.py`, which `test_packaging.py` requires to match upstream. The only engine change is the Gemini price in `service/app.py`, already an allowed divergence. Consequence: the engine reports `provider=openai`.
- Privacy: prompts now go to Google under the Gemini API terms. A paid-tier key is required, because free-tier prompts may be used to improve Google products. The data policy stays `synthetic-only`.
- Gaffer approved repinning the `service/app.py` `packagedSha256` in `aadi/SOURCE.json`; done the same day. Open: the route is not yet verified live.

## 2026-10-17 - Short promo prelude before the hero tablet
- Status: superseded by "2026-10-17 - Promo film becomes the second editorial section".
- Gaffer approved trying `promo-vid.mp4` before the existing tablet arrival. The active prelude is a muted, full-viewport excerpt of about 3.8 seconds; the complete 8.8-second film stays optional through a link beneath the tablet.
- The prelude is skippable, never plays on reduced-motion or direct section anchors, and falls back to the original hero if playback is unavailable. It hands off to the existing GSAP tablet film and synthetic workspace simulation without changing clinical content.
- The authored asset lives in `apps/site/assets/` and is copied into `site/media/` by the site build. No new rendering credits, publication, commit, or clinical logic are part of this decision.

## 2026-10-17 - Promo film becomes the second editorial section
- Status: superseded by "2026-10-17 - Complete promo moves beneath the large wordmark".
- Gaffer rejected the fullscreen prelude and approved a dedicated, elegant film section immediately after the hero. This supersedes the active presentation and optional hero link from the decision above; the existing GSAP tablet arrival again plays immediately.
- Present the supplied film unframed in a spacious light section with restrained cyan accent and concise physician-authority copy. Play it muted only while in view, allow pause/play, and do not autoplay under reduced motion. Keep the original media unchanged and do not add a new render or clinical claim.

## 2026-10-17 - Hero identity introduces a short promo teaser before the tablet
- Status: the hero teaser is superseded by "2026-10-17 - Complete promo moves beneath the large wordmark".
- Gaffer approved the order neuron logo, arriving Sentrapedia wordmark, short promo excerpt, then the existing GSAP tablet simulation. Keep the complete supplied film in the separate second section. This refines, rather than removes, the editorial film decision above.
- Use the existing `promo-vid.mp4` for the hero excerpt; preserve a static reduced-motion path and media-unavailable fallback. An optional Higgsfield transition remains unsubmitted pending specific confirmation of the 4.5-credit quote; no paid render is part of the current implementation.

## 2026-10-17 - Approved paid signal bridge precedes the promo teaser
- Status: the bridge presentation is superseded by "2026-10-17 - Complete promo moves beneath the large wordmark"; the render and its cost stay on record.
- Gaffer approved exactly one Higgsfield Kling 3.0 Turbo render at 3 seconds, 720p, no audio, for 4.5 credits. Completed job `ace81f3e-3e74-4f0b-a61f-8be779e04902`; balance 370 to 365.5 credits. No second job or new preset was used.
- Place the rendered abstract signal as a short unframed bridge after the identity lockup and before the existing promo excerpt. The complete supplied film remains in its second editorial section, and the tablet simulation follows the teaser. Missing media falls back toward the tablet; reduced motion remains static. Visual quality and transition timing await foreground browser review.

## 2026-10-17 - Complete promo moves beneath the large wordmark
- Status: live, refined by "2026-10-17 - Film and typed explanation share two columns"; its muted-only rule is refined by "2026-10-19 - The promo film gets a sound button".
- Gaffer rejected the paid signal bridge presentation and approved placing the complete existing `promo-vid.mp4` directly beneath the large Sentrapedia wordmark in `#logo-middle`, before the physician-authorship and RSIA Melinda lines. This supersedes the separate second film section and hero promo teaser, not the retained source media.
- The hero returns to neuron logo, arriving wordmark, and the existing GSAP tablet simulation. The film has no surrounding frame or gray CSS background, remains muted and in-view only, and keeps pause/play and reduced-motion no-autoplay behavior. Preserve the `#product-film` anchor at its new location. No new render, clinical claim, commit, or publication follows from this decision.

## 2026-10-17 - Film and typed explanation share two columns
- Gaffer approved a bounded refinement inside `#logo-middle`: keep the complete promo unframed in the left column and place physician-led explanatory copy in the right column; on narrow screens the video precedes the copy. The authorship and origin lines stay below the pair.
- The heading and explanation type once on entry using the existing GSAP runtime, pause while offscreen, and render fully without JavaScript or under reduced motion. A complete screen-reader copy remains available throughout the visual effect. The film's muted in-view playback and pause control remain independent of the typing effect. No new paid media or clinical claim is implied.

## 2026-10-17 - Clinical introduction moves to its own page
- Gaffer approved moving the complete clinical-workspace introduction, including the transparent anatomy illustration and three explanation columns, from the homepage to `/ruang-kerja/`. The homepage hero now leads directly into the large wordmark and product film. Feature links route to the dedicated page.
- The existing promo stays unframed and uses a one-time GSAP video/caption/kicker entrance before the typing effect. Offscreen playback and motion pause; reduced motion keeps content static and readable. No new media or clinical claim is part of this decision.

## 2026-10-17 - Fast-assessment copies are a launcher knob; engine.py repinned

- Gaffer approved reading the number of raced copies from `AADI_FAST_COPIES` (engine default 3) and repinning `service/engine.py` in `aadi/SOURCE.json`, the same mechanism as `app.py`. `settings.py` stays byte-identical to upstream, so the knob lives in `engine.py` (`fast_copies()`), not in `Settings`.
- The launcher passes `fastCopies` from `scripts/aadi-profile.json`. Measured on 2026-10-17 (fictional cough case, 3 runs each): 1 copy costs one third of 3 copies (0.0050 against 0.0153 USD per case) with the diagnosis stage about 0.2 s slower and the same answer; it gives up the one-hiccup retry and the complete-regimen grace. Gaffer kept the profile at 1 copy on 2026-10-17; numbers in the HANDOFF entry of the same day.

## 2026-10-17 - The capsule owns its diverged AADI service files

- Status: the rule that `common/guard.py` and `service/settings.py` stay pinned is superseded by "2026-10-18 - The capsule owns the AADI settings and guard"; `common/providers.py` stays pinned.
- Gaffer chose option A for tech-debt row 15: the 14 files in `aadi/` that diverged from upstream are capsule-owned (`owner: capsule` in `aadi/SOURCE.json`). They keep `origin` and `sourceSha256` for history, but have no `packagedSha256` and are edited without a repin.
- Files without an owner stay byte-identical to upstream and pinned. `common/providers.py`, `common/guard.py` and `service/settings.py` may never become capsule-owned; `aadi/service/tests/test_packaging.py` enforces both rules.

## 2026-10-17 - One strict therapy-gate rule

- Gaffer agreed to tech-debt row 18: the gateway, the browser client and the presentation all call `applyTherapyGate` in `src/lib/theoracle-evidence-gate.ts`.
- The client re-checks therapy even when the server sent a gate report; a dose the evidence does not support is removed and its drug downgraded to `doseRemoved`.

## 2026-10-17 - Browser storage limits

- Gaffer agreed to tech-debt row 17: documents keep 20 revisions (was 50), the AADI source is stored as compact JSON, and saving warns once the workspace reaches 4 million characters so a backup can be exported before the browser quota fills.

## 2026-10-17 - Ruang Kerja follows the policy-page editorial language

- Gaffer requested a total visual redesign of `/ruang-kerja/` in the family of the policy pages. Keep the existing physician-centered copy, native disclosures, transparent anatomical cutout, pause control, and reduced-motion behavior; do not invent new clinical claims.
- Use the site's local Inter family, large editorial headline, restrained ink-and-tosca palette, thin rules, generous whitespace, and numbered reading rows. The illustration remains unframed in the left column. This is a presentation decision, not a change to the clinical workspace product or publication state.

## 2026-10-17 - Sejarah Sentra is a sourced editorial subpage

- Gaffer requested a new Sentra history subpage sourced from the founder's public account at `https://ferdiiskandar.com/kisah-sentra`. Summarize its origin, collaboration, and broader ecosystem in original wording; link to the complete account for attribution rather than republishing it.
- Use the established policy/workspace-page editorial visual family and preserve the physician-authority boundary. Do not promote incident-specific, mortality, safety-performance, or efficacy claims into public marketing copy without separate review. Update privacy and terms descriptions of external links to include the founder's site.

## 2026-10-17 - History is visible in the head menu and names its builders

- Gaffer approved a `Sejarah Sentra` link in both homepage head menus, after `Tentang`, while leaving the existing footer link in place.
- On the existing history page, name dr. Novia Dwi Anggraini as `Hands-on Builder / Penggerak Implementasi` and Joseph Arianto as `Liaison Officer`. Gaffer explicitly confirmed `Arianto` as the correct spelling. Present their contributions as editorial narrative rows rather than generic cards or a separate page.

## 2026-10-18 - The capsule owns the AADI settings and guard

- Gaffer (tech-debt row 31): Sentrapedia publicly describes agentic model use by task, with at least three models (Claude, OpenAI, Gemini). `service/settings.py` and `common/guard.py` become `owner: capsule` in `aadi/SOURCE.json` and keep their origin hashes; `common/providers.py` stays pinned. `aadi/service/tests/test_packaging.py` enforces both.
- Model prices belong in the guard's own `PRICES` table, not in `app.py`. Today's runtime calls Gemini only (`scripts/aadi-profile.json`).

## 2026-10-18 - The site's build output is not committed

- Gaffer (tech-debt row 33): "benar-benar membersihkan yang tidak terpakai". `apps/site/site/` is gitignored and rebuilt by `scripts/transform.mjs`; files with no source (theme, vendor copies, `public/child.png`) live in `apps/site/static/`, which the build copies first. The build never writes into `source/`.
- `test`, `verify` and `start` build first. The Vercel project is not Git-linked and has no build command, so a CLI deploy uploads `apps/site/site/` only after `npm run build`.
- Media no page loads are removed rather than kept beside the build; history and the LFS remote keep them.

## 2026-10-19 - The promo film gets a sound button

- Gaffer: "itu video section 2 kok gak ada suaranya", then chose a separate sound button: "Tambahkan tombol Suara/Bisukan terpisah di video section 2 (opsi 1)". `promo-vid.mp4` has an audio track; until now the film was muted with no way to hear it.
- The film still autoplays muted while in view, because browsers block autoplay with sound, and keeps pause/play and the reduced-motion rule. A separate "Suara"/"Bisukan" button beside "Putar" turns the sound on only after a visitor's click; turning sound on also resumes a paused film. The film's media file is unchanged.

## 2026-10-20 - MIRA is named AADI

- Gaffer: "Kemudian stop penggunaan kata MIRA< ganti dengan AADI (Augmented Artificial Intelligence Diagnosis Integration)", for everything including code. The full name appears once in the report subtitle and once in the "Tentang workspace ini" dialog; everywhere else "AADI".
- Saved answers are migrated when a workspace is read: marker and engine text become AADI, a doctor's edited text stays as written. Env vars, endpoint and headers changed without fallback; rollback to an older image is manual.
- The capsule owns every engine file that named MIRA, including `common/providers.py`. Upstream identifiers (source paths, `upstreamCommit`, the source name, `provenance/*.txt`, schema `$id`) keep the upstream's MIRA naming.

## 2026-10-21 - Back to consult-first; flow work parked

- Gaffer: the product concept returns to consult-first. One composer: the doctor presents the case, Sentrapedia answers from Indonesian guidelines, and the answer becomes the note.
- The Analisis tab stays the primary entry. Decision D2 is cancelled.
- Decision D1 stands: the BETA accepts real clinical content without patient identity; identified records stay out of scope.
- Parked until the consult answer is proven and real doctors have used it: the storage-format migration, the doctor flow (guided SOAP, section chips, completeness strip, practice-site default), the Puskesmas-flow phases, website and brand work, and the audit action items. `.claude/plans/puskesmas-flow-implementation-plan.md` is marked "STATUS: PARKED 2026-10-21 — do not execute." and kept.
- The flow work already built stays committed on `feat/puskesmas-flow` (through f3577885); nothing is reverted.

## 2026-10-21 - Single knowledge source

- Single knowledge source: `theoracle/ssot/sentrapedia-knowledge-ssot.json`. Structured clinical facts live only in the SSOT; guideline PDF texts are the citation library; both feed one index through `npm run knowledge:build`, which also derives the Pustaka Klinis catalogue. Nothing clinical is edited anywhere else.
- The index has two layers: one document per SSOT entry (origin `ssot`) and the guideline-PDF chunks of the former AnythingLLM export, carried over unchanged. `faa-aviation-medical-examiners.pdf` is left out (not Indonesian clinical guidance); the 154 disease markdown documents are dropped because the SSOT supersedes them.
- The catalogue leaves out SSOT entries of type "topik pedoman"; an entry without a category takes the chapter of its first ICD-10 code.
- `theoracle/provenance/`, `theoracle/sources/`, `data/dose-inventory/`, the hand-written catalogue and `scripts/add-theoracle-docs.mjs` are retired: archived in `D:\DEV\archive\sentrapedia-knowledge-2026-10-21.zip` and kept in git history.
- Gaffer accepted the rebuilt index as measured (recall@5 0.818 with gold mapped to SSOT names, against 0.864 before; dose recall 0.77 to 0.852; targeted 0.902 to 0.934). Evidence: `docs/verification/theoracle-eval-2026-10-21/`.
- The grounding bundle states that the corpus is derived from official guidelines and not yet clinically reviewed; review status lives in the SSOT.

## 2026-10-24 - Clerk closed-beta admission and principal isolation

- Gaffer approved Clerk and ordered implementation of `docs/specs/2026-10-23-clerk-beta-access-design.md`: request access -> explicit Dashboard approval -> personal invitation -> registration/legal acceptance -> synthetic-data beta consent -> login.
- Clerk owns identity/admission and native delivery, not an application password/approval database. Resource guards fetch current backend metadata; private suspension and versioned consent are independent. Readiness GET remains public, analysis POST is guarded.
- Browser persistence is namespaced by opaque principal, without automatic legacy-data assignment or claims of encryption. The scoped backup/restore/clear paths ship together. Clinical code and serialized workspace schema stay unchanged.
- Provisioning, sender/DNS settings, actual delivery proof and production edge cutover remain separate release gates. Preserve the Cloudflare gate until authorized cutover; restore it first when rolling back to an unauthenticated app image. Evidence: `docs/verification/clerk-beta-access-2026-10-24.md`.

## 2026-10-25 - The generated TheOracle vectors leave git

- Gaffer chose option A1 of `docs/plans/active/2026-10-25-theoracle-index-out-of-git.md`: "Jalankan opsi A1: vectors.f32 keluar dari git, fetch sebagai release asset di drferdi/Sentrapedia yang tetap private."
- `theoracle/index/vectors.f32` is no longer tracked and no longer a Git LFS file. Every rebuild used to store a whole new 53 MB LFS object, against an included quota of 10 GiB per account, not per repository; the 18 objects already in history stay where they are, because this repository never rewrites published history.
- The tracked `theoracle/index/manifest.json` is the pin. `scripts/install-theoracle-index.mjs` accepts a download only if its SHA-256 equals `manifest.vectors.sha256`, the same check `src/lib/theoracle-grounding.ts` runs before it answers a case.
- The artefact is an asset of the `theoracle-index` release of the private `drferdi/Sentrapedia`, named `vectors-<indexSha256>.f32`, so an upload never replaces an older index and an older commit keeps finding its own. Release assets are outside the Git LFS quota. This rests on that repository staying private, with the public code tree published as a separate mirror; if it is ever made public itself, the artefact must move to object storage first.
- `chunks.jsonl` stays in git. It is not a generated file: `scripts/build-theoracle-chunks.mjs` reads the 15,586 guideline-library chunks out of the current `chunks.jsonl`, and only the 2,285 SSOT rows come from the SSOT, so git history is that library's only backup. It is also cheap - 18 versions pack to 11.3 MB in total.
- The index is never rebuilt on the beta server. Its normal update path pulls the CI-built image and is unchanged; only `SENTRAPEDIA_BUILD=local` installs the artefact, in a throwaway `node:24-bookworm-slim` container because that host has no Node, with a read-only token in `/etc/sentrapedia/index.env`.

## 2026-10-25 - The Clerk merge waits for a real registration

- Status: superseded the same day it was written. Gaffer withdrew this hold without satisfying it - "Cabut tahanannya, lanjut merge Clerk sampai selesai" - and the Clerk branch was merged into `main` as `56abccd6`, published as PR #30 and merged in the product repository as `e8cb4037`. The `capsule.json` gap this entry names was closed with that merge in `5305816b`, as it required. This branch was merged on 2026-10-25 on Gaffer's "Merge" so the record is in the product line; the hold itself is not live.
- Gaffer, after `docs/plans/active/2026-10-24-clerk-integration-readiness.md`: "Tahan merge branch Clerk sampai ada user nyata yang berhasil registrasi di instance production mode public."
- `codex/sentrapedia-clerk-access-31bf87f9` is not merged into `main`. Authentication therefore stays out of the product line until the production Clerk instance runs `auth_access_control.sign_up_mode: public` and one real person has completed registration and login on it.
- The acceptance evidence is that person's own journey. A development instance, a test identity, a mocked email or the six built HTTP checks already recorded on that branch do not satisfy it.
- Accepted cost: the two lines keep diverging. Today the merge surface is two handoff documents with no code overlap at all, measured with `git merge-tree`; a later SSOT or workspace-UI change can create the code overlap that does not exist now. Re-measure before merging rather than trusting this number.
- Cloudflare Access stays in front of the beta, which is why no external person can reach `/sign-up` yet: the production sign-up mode and the edge cutover are the prerequisites of the very registration this decision waits for, and they remain separately authorised R3 steps.
- Unchanged by this decision: `capsule.json` on the Clerk branch still fails to declare Clerk as an external service while `project.contract.json` declares it. Fix it with the merge, not before.

## 2026-10-25 - Server-side persistence: build now, on Neon, with identity kept at the edge

- Gaffer lifted the 2026-10-21 parking of storage work: "Sekarang sudah harus di updatge kita segera BETGA dan sudah ada pilot test". Server-side sync is therefore in scope now, not after the consult answer is proven. Stated plainly for the record: this session has no evidence of a registered tester and did not check for one; the pilot is Gaffer's report.
- What the 2026-10-21 parking still covers, unchanged: the storage-format migration stays parked and the serialized format stays `version: 1`. This work adds a server, not a new local format. `docs/plans/active/2026-10-19-workspace-v2-migration.md` is not reopened.
- Database: **Neon Postgres**. Gaffer: "Neon pls". Supabase is declined, and with it the question of forwarding Clerk session tokens to the database (its row-level security only works that way), so that coupling is **declined by implication**.
- Correction to the proposal that offered the choice: it said Neon had "no RLS story out of the box". That was wrong. Neon is plain Postgres, so row-level security is available; what it lacks is a built-in mapping from a JWT claim to `auth.jwt()`. The equivalent without any token coupling is a transaction-local setting - `select set_config('app.user_id', $1, true)` inside the unit of work, with policies on `current_setting('app.user_id', true)`. So the database-level guard survives Gaffer's choice, and it needs no Clerk token at the database.
- Three conditions make that guard real, and all three belong in the migrations: every table gets `force row level security` as well as `enable`, because a table owner otherwise bypasses policies; the runtime role is a separate `nosuperuser nobypassrls` login that does not own the tables and holds DML grants only; and every policy carries both `using` and `with check` over the missing-ok setting, so an unset principal denies the row instead of exposing the table.
- **Patient identity: pseudonymisation at the edge.** Gaffer delegated this one - "chose the best practice untuk usaha sejenis" - so the choice is this session's, not his: the server stores the existing random local id as `patient_ref` and never a name, and the name stays in the browser. The reasons: it satisfies D1 without touching the serialized format (so the parked migration stays parked), it is the ordinary pattern for a local-first clinical tool that has no DPA and no validation, and dropping a field alone would not be enough because free text can carry a name - hence a scrubber at the boundary, not just a missing column. `patient_ref` must stay the random id and must never become a hash of the name, which a dictionary reverses.
- The consequence Gaffer should know before the pilot, not after: a doctor who signs in on a new device recovers every document but **no patient names**, because the map lived only in the lost browser and in the manual JSON export. Sync answers "I lost my notes", not "which patient was this". And pseudonymous longitudinal records are still personal data under UU PDP 27/2022 even when the key never leaves the edge; the server data is de-identified at rest only in that narrow sense.
- Scope confirmed by Gaffer ("Yes"): database and sync only. Auth, registration and the site-to-app link are already merged and are not rebuilt.
- Region is **not settled**. The question asked which region; the answer was "Yes". Verified meanwhile: Neon has no Jakarta region, the nearest is AWS Singapore `aws-ap-southeast-1`, and a project's region cannot be changed afterwards. So the residency question under KMK 951/2026 is vendor-independent and must be answered before any project is created - which is Gaffer's action, never an agent's.
- Whether document bodies sync at all, or only profile and personal templates, is **still open** and gates the `workspace_sync` table and the scrubber. Profile and templates alone do not close the data-loss risk, so the question matters.
- Evidence and build order: `docs/plans/active/2026-10-25-e2e-integration.md`.

## 2026-10-25 - The withdrawn Clerk hold is merged for the record

- Gaffer: "Merge", answering whether `docs/sentrapedia-clerk-hold-decision` should be merged, deleted or left alone. Merged locally as `008f1126`, a real merge commit with two parents; not pushed.
- The hold it records is not live and never became live in the product line: see the Status line under "2026-10-25 - The Clerk merge waits for a real registration".

## 2026-10-25 - Document bodies sync, held back rather than rewritten

- Gaffer: "Body dokumen ikut sync. Lanjutkan S2 scrubber lalu workspace_sync." So the `workspace_sync` table that `0001` deliberately omitted is in, and document bodies leave the browser.
- **Assumption stated rather than taken silently: "scrubber" is built as a guard, not a redactor.** A document whose free text carries identity is **held back whole**; its local copy is untouched and stays authoritative. Nothing rewrites clinical text. Three reasons, all from this capsule rather than from preference: `src/lib/theoracle-grounding.ts` already skips a matching passage instead of rewriting it; stored text is never translated in place (`.agents/AGENT-CONTEXT.md` section 8); and a redacted copy on the server would be a second, divergent version of one clinical note, which is a hazard in a tool a doctor reads later. A redactor also cannot be proved correct except by this same guard passing its output, so the guard is the prerequisite either way. If Gaffer wants held documents redacted and synced instead, that is an added transform on top, not a change to this.
- The detector is `containsIdentity` from `src/lib/aadi/contract.ts`, used verbatim. **No new pattern and no new row in `tests/fixtures/pii-parity.json`**: the rule is to add parity rows for a pattern change, there is none, and every row added there is asserted by pytest as well. `tests/sync-guard.test.ts` instead reads the fixture's 19 cases as inputs and uses its `client` column as the expectation, in two field positions each, so parity holds by construction.
- Only free text is scanned - title, context, message content, task text, review labels. Ids, timestamps and trace values are structural and are not, because a 13-digit epoch reads as a NIK; that is the false-refusal class removed from the engine on 2026-10-19 and it must not return by this door.
- The projection is an allowlist, never a spread, so a field added to `Message` later has to be considered before it can sync. **Excluded: `revisions`** (superseded clinical text), `originalContent`, `templateSnapshot`, and **`sourceText`**.
- **`sourceText` is the consequential exclusion and Gaffer should weigh it.** It holds the whole `AadiAnalysis`, the TheOracle grounding passages included, and that corpus is private data which never leaves the capsule ("public code, private data", 2026-10-19). Excluding it is the conservative default and fails safe. The cost: `applyTherapyGate` re-runs on every display, so a restored AI document has no evidence behind it and shows its doses as removed - "dosis tidak ditemukan di TheOracle, cek pedoman". A third option exists and is not chosen here: sync the gate's verdict without the passages. That is Gaffer's call.
- `patient_ref` travels on the row as well as inside the body, and `format_version` is on every row with a check constraint pinning it to 1, so a reader can refuse a version it does not know - the "ship the reader before the writer" rule of `docs/data.md`.

## 2026-10-25 - Neon is provisioned, and Neon's owner role is why the runtime role is mandatory

- Gaffer ordered the Neon setup himself, naming the org and project: `neon init -y --org-id org-falling-sky-24718992 --project-id young-sun-49978294 --branch production --services postgres`, then `neon deploy`, then wiring and an end-to-end proof. That instruction is the approval for provisioning, which no agent may do on its own.
- Project `young-sun-49978294` ("Sentrapedia"), Postgres 18, branch `production` (`br-royal-bread-ao6i68r2`), compute 0.25-2 CU, history retention 6 hours.
- **Region is `aws-ap-southeast-1`, Singapore - so the residency question of 2026-10-25 is now answered by fact rather than by choice.** Neon has no Jakarta region and a project's region cannot be changed after creation, so Indonesian residency is not available on this vendor. Whether that is acceptable under KMK 951/2026 is Gaffer's call and is not settled by this entry; moving would mean a new project and a data migration.
- **Verified, not assumed: Neon's default owner role `neondb_owner` has `rolbypassrls = true`.** It is not superuser, but it bypasses every row-level security policy, and `force row level security` does not restrain a BYPASSRLS role. So connecting the application with the `DATABASE_URL` that Neon pulls would have silently disabled all three policies - the same class of mistake as the Supabase service-role key caught earlier the same day. Condition 2 of the RLS design (a separate `nosuperuser nobypassrls` non-owner role) is therefore **load-bearing, not defence in depth**, and `SENTRAPEDIA_DATABASE_URL` must carry `sentrapedia_runtime`.
- Driver: **node-postgres (`pg`), pinned 8.23.1.** The installed Neon agent skill names node-postgres for long-running runtimes that reuse a pool and `@neondatabase/serverless` for serverless and edge; this app is a long-lived Next standalone process in Docker. The skill does not compare the two for this case, so the driver documentation was read as well: the serverless driver's HTTP transport has no interactive transactions, only fixed batches, and this design needs a principal set and then queried inside one transaction. Open question 8 of the plan is closed by that evidence.
- Connection strings follow the skill: the **pooled** `DATABASE_URL` shape for application traffic, the **unpooled** one for migrations only. The pooled path is safe here precisely because the principal is transaction-local; a session-level `SET` would not survive a transaction-mode pooler.
- `@neon/config` and `@neon/env` were installed as caret-ranged runtime dependencies by `neon init`. Pinned exact to match every other dependency in this capsule and moved to `devDependencies`: only `neon.ts` imports `@neon/config`, nothing imports `@neon/env`, and `neon.ts` is CLI configuration rather than application code, so the production image should not carry either. `neon config plan` still exits 0 that way.
- The `local-development` principal of the local auth mode is mapped to one reserved id, `user_localdevelopment`, instead of loosening `0001`'s check constraint to accept non-Clerk shapes. That mode already requires loopback and a development `NODE_ENV`.
- Neon agent skills and the Neon MCP server were missing entirely before this (no skill at user, root or capsule scope; `~/.claude.json` had no Neon entry). `neon init -y` installed the plugin `neon-postgres@neon` 2.3.0 at user scope with nine skills, and its MCP server is declared as HTTP at `https://mcp.neon.tech/mcp` with **no API key in any file** - the OAuth shape the Neon skill recommends for exactly that reason. `~/.claude.json` was not modified. The MCP server still needs Gaffer to authorise it through `/mcp`; an agent cannot.
