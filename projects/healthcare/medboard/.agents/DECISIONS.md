# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-10-07 — Crew rank, active hours, awards and three access levels

- Decision (Chief, question by question): three access levels CEO / Administrator / User, derived
  from the existing `role` column; only the CEO changes levels, touches CEO or Administrator
  accounts, and deletes accounts. CEO and Administrator show as coloured text on the card edge
  (replacing `ceo.png` / `admin.png`), never as a rank.
- Ranks Lv1–Lv9 need cases AND hours: Intern 0/0, Residen Yunior 25/50, Residen Senior 75/150,
  Residen Kepala 150/300, Fellow 300/600, Konsulen Muda 500/1000, Konsulen Madya 1000/2000,
  Konsulen Utama 2000/4000, Legendary 5000/10000. Awards at 25, 75, 150, 300, 500, 1000, 2000, 5000
  cases. Chief corrected the award list's "300" typo.
- A case is a clinical report, credited by the new `clinical_reports.author_username` (set from the
  session on save; old rows backfilled only on exactly one non-deleted `displayName` match). An
  hour is active dashboard time from a 60 s heartbeat on the WIB day; Asisten Medis time does not
  count. Rank and awards are derived on read, never stored.
- Stay on the existing PostgreSQL (Chief asked about Supabase; one database, no new service).
  Avatars stay per profession and gender. `public/ranks` renamed lowercase with `_`; `chief.png` is
  `residen_kepala.png`; Legendary borrows `konsulen_utama.png` with a ring until its own art exists.
- Mid-run (Chief): the home "Profesi" rows were removed as redundant; the Rank & award card sits
  above Aktivitas klinis.
- Final review fix: admin routes resolve the target by lowercase username before the hierarchy
  check (`7b3cf0c2`); before it an Administrator could reset the CEO password via `/Direktur/...`.
- Open for Chief: old reports left at the form's prefilled "dr. Ferdi Iskandar" will be credited
  to that account by the backfill; check `GROUP BY doctor_name` before `migrate deploy`.
- Evidence: migration rehearsed on postgres:16 (twin names NULL, unique name credited, unknown
  NULL, deleted twin ignored); two-tab beats credited once; route check on the rehearsal DB 4 FAIL
  then 5 PASS; suite 519/519; `pnpm run build` 0; Browser pane checks of home, Hub, Lab, ACARS.

## 2026-10-07 — Footer follows the Wine Diplomacy layout (after a pass on Inversa)

- Decision (Chief, with reference images on the desktop): first "Duplicate this footer design,
  adjust the text" with the Inversa footer (commit `59a4b2bd`: three framed columns with cross
  ticks, a full-width MedBoard wordmark in the accent, a base line), then "change and replace
  footer design using the attached footer design" with Wine Diplomacy (commit `def9740c`).
- Current footer: navy ground; a fine grid band (five cells per guide column, fading out) over
  six guide lines that run the whole height; the tagline "Sistem informasi klinis untuk
  puskesmas" on one line; a round back-to-top link in black neumorphism; three ruled columns
  (MedBoard identity with the white Sentra mark and "Dikembangkan oleh Sentra, Kota Kediri, Jawa
  Timur"; Tanggung jawab klinis with the disclaimer sentence and link; Legal as a 2x2 grid of
  Lucide icons in light circles); a `--primary-tint` bar where the reference has cream; a base
  line with the copyright, Sentra Hub and sentrahai.com.
- Adapted from the references on purpose: no capitals, no monospace, no condensed display face
  (MedBoard text rules and IBM Plex Sans only); the reference's contact and social links have no
  MedBoard data, so the columns carry clinical responsibility and the legal tabs instead; arrows
  are Lucide icons.
- Then (Chief: "warna di buat gradient dari putih ke warna footer") the ground is a gradient from
  `--surface` at the page edge to `--primary`, full navy before the tagline; the grid band and
  guide lines are masked to rise out of the white, so the page meets the footer without a hard
  edge (commit `ad705123`).
- Then (Chief: "See earlier. Decide better. mengganti sistem informasi klinis etc") the copy names
  the work, not a category: tagline "Dari anamnesis sampai rujukan, di satu meja kerja" (both
  features exist: anamnesis extraction, ICD "Rujuk?"); identity "Dibangun oleh Sentra untuk
  puskesmas"; notice "AI di MedBoard memberi saran. Keputusan klinis tetap menjadi tanggung jawab
  tenaga kesehatan yang merawat pasien."; browser title "MedBoard — Sentra" and an Indonesian
  description in `layout.tsx` (commit `48d202da`). Left alone: the e-mail sender name
  "Puskesmas Dashboard" in `src/lib/server/email.ts` (an outbound identity, Chief's call).
- Correction (Chief: "Dari anamnesis sampai rujukan, di satu meja kerja ganti menjadi See Earlier.
  Decide Better."): "See Earlier. Decide Better." was Chief's tagline itself, not an instruction;
  the footer tagline now reads it (commit `dd0ecc1f`). The rest of `48d202da` stays.
- Identity line (Chief, 2026-10-07): "Dibangun oleh Sentra HAI untuk layanan kesehatan primer di
  Indonesia." replaces the two lines naming puskesmas and Kota Kediri; HAI joins the text-case
  acronyms. Chief asked for the columns "sejaja dan simetris": each spans two guide columns with
  no gap, the guide lines run down as side rules, one inner inset for every column and the base
  line, the Sentra mark sits at 24 px in the MedBoard heading row (commit `0295dce8`).

## 2026-10-07 — The dashboard wears the official MedBoard Brand Kit v1.0

- Decision (Chief: "ambil logo dll yang terbaik untuk mengisi dashboard design medboard"):
  header = official horizontal black lockup, 120 px wide (the kit's digital minimum); footer
  MedBoard heading = white mark; tab icons = the kit's `06_NEXTJS_READY` favicon.ico, icon.png,
  apple-icon.png. This supersedes `554b5f21` (one Sentra mark for header and favicon), written
  before a MedBoard brand existed; the Sentra mark stays on the team lab page.
- Files are byte copies, pinned to the kit's `asset-manifest.json` hashes in
  `brand-assets.test.ts`. The lockup canvas is 43% empty on the right, so the `<img>` uses an
  `#svgView(viewBox(...))` fragment instead of an edited copy.
- Not taken: Open Graph/Twitter images (need a `metadataBase` for the pilot domain, and the site
  is `noindex`), the web manifest (no install-as-app requirement yet), the blue-cyan accent and
  Inter (the palette and IBM Plex Sans stay; chart palette is an open decision), the sign-in
  screen (Sentra lockup, the company identity).
- Evidence: brand test red 4/4 then green; suite 483/483; build exit 0; browser: lockup 120x20
  at the header centre, footer mark's left edge on the text edge, three icons served 200.

## 2026-10-07 — Sentra Network map: OpenFreeMap Positron, Kota Kediri, zoom

- Finding: keyless CARTO tiles (basemaps.cartocdn.com) now draw only an "API key required"
  watermark; the map showed no streets.
- Decision (Chief chose "OpenFreeMap Positron" over OSM-with-grey-filter and CARTO-with-key):
  grey open source vector basemap, no key, commercial use allowed, self-hostable on the VPS later.
  Dependencies approved by Chief: maplibre-gl 5.24.0 (BSD-3-Clause) and
  @maplibre/maplibre-gl-leaflet 0.1.4 (ISC). maplibre-gl 6.x was tried first: it loads its worker
  from a separate .mjs that Turbopack does not emit (404, "Worker failed to load"); 5.x runs the
  worker from a blob URL. CSP: connect-src adds https://tiles.openfreemap.org; worker-src
  'self' blob:.
- Chief: "Map center di kota kediri" -> KEDIRI_CENTER [-7.8111, 112.0047] (Wikipedia), zoom 13;
  staff markers still use DEFAULT_CENTER (Puskesmas Balowerti).
- Chief: "Cara mendekatkan dan menjauhkan map? please build" -> black neumorphic Plus/Minus
  (ui-btn--ghost, Lucide) outside the Leaflet container (L.DomEvent.disableClickPropagation
  stopped clicks before React's root listener); `.mapEmpty` gets pointer-events: none (it covered
  the map and swallowed the wheel); data-lenis-prevent on the map wrapper.
- Chief's ACARS subtitle: "ACARS — Active Communication and Coordination Radar System, sebuah
  sistem yang dirancang untuk memfasilitasi kolaborasi klinis internal secara aktif."
- Evidence: staff-map-basemap.test.ts red before each change, 5/5 green; suite 488/488; build 0;
  browser: map renders Kediri with attribution; buttons 13->14, 13->12->11; wheel 13->15->13
  with scrollY 0. The Browser pane pauses requestAnimationFrame when unfocused, so MapLibre draws
  only when a frame is forced (screenshot); not an app fault.
- Evidence: footer tests failed first for each layout; suite 477/477; browser: tagline one line
  at desktop, back-to-top returns to scroll 0, legal links still switch the tab in place, 375 px
  with no horizontal scroll.

## 2026-10-07 — Navy footer in the MedBoard palette; footer links switch the legal tab

- Decision (Chief: "Coba buatkan footer yang profesional, modern menggunakan warna medboard
  ini"). `AppFooter` is a `--primary` navy band: the Sentra mark (drawn white with a CSS filter,
  the PNG is dark) and MedBoard name, "Sistem informasi klinis untuk puskesmas.", the
  clinical-responsibility notice (taken from the Disclaimer AI tab) marked by the one `--accent`
  rule, Legal and Sentra link columns, and the copyright line. Text colours are `color-mix` of
  `--text-on-accent` into `--primary`; two columns below 768 px.
- Fixed with it: on /legal a footer link changed only the hash and the tab stayed put (a Next
  Link that changes only the hash fires no hashchange; observed in the browser). Legal links are
  plain anchors and the page listens to hashchange; the tabs moved to `src/lib/legal-tabs.ts`
  and the `as LegalTab` cast is gone.
- Kept: the copyright holder "Sentra Healthcare Solutions", as across /legal; the AHU legal
  entity is Sentra Artificial Intelligence (open item for Chief).
- Evidence: footer and legal-tab tests failed first; suite 476/476; browser: /hub to
  /legal#privacy opens Privasi data, then Keamanan and Ketentuan switch in place; 375 px with the
  rail collapsed has no horizontal scroll (commit `cc904de9`).

## 2026-10-07 — Official Sentra documents: cards and signed-in PDF downloads

- Decision (Chief: "tambahkan dokumen dokumen resmi Sentra, buatkan card, nama dokumen
  profesional (bahasa inggris), short description, button download"; then chose "Tetap diunduh
  utuh", "Phantom stock: tidak", "Lewat route ber-login", "Di luar git, runtime/"). Sentra
  Organisation has a Dokumen resmi section with five cards (`OFFICIAL_DOCUMENTS` in
  `src/lib/hub/organisation.ts`); the Legal section's source list moved there.
- The PDFs are never committed: the monorepo origin drferdi/Monorepo-safrs is public, and the
  decree and the Statement of Incorporation carry the founder's NIK, NPWP, birth date and home
  address (the two cards say "Memuat data pribadi pendiri"). Each server holds them in
  `runtime/organisation-documents/` (git-ignored; on the VPS `/var/lib/medboard/runtime`).
- `GET /api/hub/documents/:id` (logic in `src/lib/server/official-documents.ts`) serves only a
  listed id, only to a signed-in crew session (automation token refused), as an attachment with
  `Cache-Control: private, no-store`; a missing file answers 404. Any signed-in role may download.
- The phantom stock draft (PSA-2026-01) stays off the page, as decided earlier.
- Evidence: route tests (401 without session, 401 with automation token only, 200 PDF with
  headers, 404 for unknown id and missing file) and the data and page tests failed first; suite
  471/471; in the browser all five downloads returned the exact source byte sizes and an
  unauthenticated request got 401 (commit `b9448de8`).

## 2026-10-07 — Sentra Organisation rebuilt from the 2026 company documents

- Decision (Chief: "Halaman Sentrahub, Sentra Organisation, overhaul: ambil informasi dari lampiran
  pdf, buatkan diagram motion"; then chose "Semua kecuali data pribadi", "Hapus, ikuti charter",
  "Peta organisasi bergerak"). Sources: Operating Charter ORG-2026-01, Financial Architecture
  FIN-2026-01, Phantom Stock draft PSA-2026-01 (all rev 1.3, 16 Aug 2026), Legal Transition Guide
  rev 1.3, AHU decree and founding statement of 4 Sep 2026 (PDFs on Chief's desktop, not copied).
- Then (Chief: "Partisipasi tidak perlu, hapus") the participation section went, with its data:
  safe-profit split, founding-team pool, phantom stock vesting and terms, and PSA-2026-01 from the
  source list. `organisation-tab.test.ts` failed on it first and now guards that none of it returns.
- Then (Chief: "Di rapikan, sejajar dan simetris") the independent panel became three equal tiles
  on subgrid rows and lost its caption; (Chief: "Boyong Baskoro, Sp.OG -> hapus") the clinical
  validator tile names dr. Dibya Arfianda only, and "Boyong" is in the removed-names test (red
  first, commit `d516596c`).
- Then (Chief: "Semua deskripsi ... gunakan skills humanizer") every description on the tab was
  rewritten in plainer Indonesian: no "X, bukan Y" contrasts, no "Mesin ...:" label pattern,
  semicolons split into sentences. Names, figures, dates, the legal disclaimer's content, KBLI
  labels and document titles were kept as the documents give them (commit `974e52c6`).
- Then (Chief: "Menghasilkan uang? gunakan kata kata lain") the finance product roles use
  business wording: Sentra/ui is "Penopang arus kas" with the shortest path from project to
  revenue; casual phrasing ("mau memakainya", "bukti alatnya") is gone (commit `eb850fd0`).
- Then (Chief: "Sentra Assist ganti menjadi Asisten Medis dan MedboaRD") the healthcare product
  is "Asisten Medis dan MedBoard", spelled with the MedBoard brand casing. Only the hub data
  changed; code comments that cite the Sentra Assist extension stay. `organisation.test.ts`
  pins the four product names and failed first (commit `b0d6e4a8`).
- Then (Chief: "Ganti lebih profesional, masa pakai kata kambing hitam") the intro reads
  "Sentra dijalankan dengan kepemimpinan manusia dan dukungan AI ... setiap kegagalan ditinjau
  bersama sebagai bahan perbaikan tanpa menyalahkan individu" (commit `0e8566e9`).
- Then (Chief: "keuangan, mulai dari healthcare dulu, academy, finance, baru ui") the finance
  products run Asisten Medis dan MedBoard, Tutor Smartboard, Payroll Automation, Sentra/ui in
  cards, legend, stacked columns and both tables. Series hues keep their fixed order, so the
  healthcare product now wears series 1 (blue). Test pins the order and failed first
  (commit `3815b08a`).
- Publishing: drferdi/Medboard `main` moved to `0237cf48` (PR #3, next 16.3.8 and audit
  overrides). The publish commit now takes package.json, pnpm-lock.yaml and pnpm-workspace.yaml
  from Medboard so that PR is kept; the monorepo copy still pins 16.3.6 until Chief approves the
  bump here.
- The tab (`src/app/hub/OrganisationTab.tsx`, data in `src/lib/hub/organisation.ts`) has four
  sections: Struktur (moving map: founder chip, five charter roles, governed AI layer, independent
  panel; lines draw once with pathLength, the selected person's line lights in the accent, no
  spring/scale/slide; container-query list below 720 px), Keputusan & ritme, Keuangan
  (2027-2030 revenue stacked columns, EBITDA as numbers, falsification gates), Legal (entity,
  KBLI, six transition gates, source documents).
- Removed: the old four divisions and their members (dr. Auliya, dr. Armando, apt. Umul,
  Nurmayatul, Oriza, Michael Subrata), the "Sentra Healthcare Solutions" footer, `public/org.png`
  (no longer referenced) and the orphaned organisation CSS in `hub.module.css`.
- Never shown: NIK, NPWP, birth date, home address, the registration request number, profit
  shares; the company address is reduced to Kota Kediri. Guarded by `organisation-tab.test.ts`.
- Facts shown as the documents give them, mismatches left for Chief: the decree says Perseroan
  Perorangan (usaha mikro, modal Rp10 juta) while the PSA says "PT" and "President Director"; the
  decree names the founder by the legal name, the charter as dr. Ferdi Iskandar (the page uses the
  charter).
- Chart colours: four series hues (#2a78d6, #eb6834, #1baf7a, #eda100) scoped as `--series-*` on
  the tab root, validated with the dataviz palette validator for white (contrast warn for aqua and
  yellow: legend and tables carry the values). token-guard asked to move them to `globals.css`;
  kept local because the global palette is Chief's choice (open item).
- Evidence: `organisation.test.ts` recomputes the derived figures (Rp9.010bn plan, revenue rows →
  1.53/5.28/15.77/42.26, EBITDA −7.7) and failed first (module missing); the removed-names test
  would fail on HEAD (8 hits); browser checked at desktop and 375 px.

## 2026-10-07 — Open rail shows Klinis by default

- Decision (Chief: "Klinis terbuka di sidebar dari awal / default state"): pages outside the rail
  (home, /legal, profile) open Klinis instead of no section; this replaces the default taken in
  "Open rail follows lab.xevrion.dev". `openNavSection()` in `src/components/shell/nav-items.ts`;
  a section open by default shows its items without lit branch, current item or section bar.
  The narrow icon rail for new users is unchanged.
- Evidence: `shell.test.ts` failed first (not a function), passes after; suite 456/456; tsc 0;
  build 0; browser: /legal opens Klinis with 7 items and none current, /hub opens Sentra HQ with
  Sentra Hub lit.

## 2026-10-07 — Legal page follows the Railway retirement; first production build with Atlas

- Decision: the `/legal` Keamanan "Infrastruktur" list follows Chief's earlier "Railway retired"
  decision: Biznet Gio VPS (Ubuntu 24.04, Caddy), Node.js 24 (package.json engines), systemd
  restart on failure after 5 s. Facts from the committed `docs/deploy-vps.md`.
- Decision (Chief: "Domain Railway sudah tidak di gunakan"): the origin
  `primary-healthcare-production.up.railway.app` is removed from `src/lib/server/api-cors.ts`,
  `src/app/api/clinical/differential/evaluate/route.ts`, the Socket.IO list in `server.ts` and
  the CSP `connect-src` in `next.config.ts`, because a released `*.up.railway.app` name can be
  claimed by another Railway project. `src/lib/server/allowed-origins.test.ts` (group
  `allowed-origins`) failed 4/4 before, passes 4/4 after; on `next start` a preflight from the
  Railway origin gets 403, `medboard.sentrahai.com` still 204. Kept: the `RAILWAY_*` environment
  detection in `api/health`, `security-audit.ts` and the admin badge (inert off Railway).
- Decision (Chief: "efek neumorfisme" on the four /legal tabs): they are the kit's `ui-chip`
  (black neumorphic, 13 px, open tab pressed in with the Lucide check, `aria-pressed`) instead of
  inline accent pills; `legal-page.test.ts` renders the page and failed on the inline buttons.
- Publish: Medboard commit `3ee9335d` (tree of monorepo `a068e6a6` plus README.md and logo .webp
  from `da3868a5`, parent `da3868a5`); the push is Chief's.
- Evidence: `src/app/legal/legal-page.test.ts` (design group) failed 2/2 before, passes after;
  suite 455/455; tsc 0; `pnpm run build` exit 0 four times, `/atlas` and `/legal` static. Build warns
  4 times about whole-project tracing from `src/lib/icd/dynamic-db.ts` and
  `src/lib/lb1/rme-export.ts` (dynamic `fs.existsSync`); inferred harmless for the VPS deploy,
  which ships the archive and does not use standalone output (not checked on the server).

## 2026-10-07 — Atlas: male muscles borrowed into the female body

- Chief, after the filled-in female body still looked odd ("lucu banget"): "benahi apapun caranya",
  then "ototnya mana". The odd look came from muscle only on the legs (donor set) and bare upper body.
- Decision: 309 male muscles (head, neck, trunk, arms, feet) copied into the female body under a new
  system `borrowed-muscle` ("Otot dari referensi pria"), on by default. Upstream Human Atlas refused
  this on purpose (male muscle reads as male); Chief ordered it. The donor leg set and the body's own
  eye and knee muscles are kept; muscles with the same name are not doubled (psoas, piriformis...).
- Method (`scripts/atlas/borrow-muscles.mjs`, run after `import-human-atlas.mjs`): each vertex follows
  its three nearest male bones, weights 1/d²; exact similarity fits (Horn) to the 178 bones upstream
  borrowed (vertex order kept, worst RMS 0.6 mm), box fits for spine, sternum and hip bones; normals
  recomputed; 5 new gzip chunks (about 9.4 MB, LFS). ATTRIBUTION.md records the adaptation.
- Limits: BodyParts3D has no rectus abdominis, so the mid-abdomen shows the viscera (same in the male
  body); hand muscles follow upstream's finger bones, which reach up to 28 mm past the skin.

## 2026-10-07 — Atlas: white stage; the female body opens whole

- Chief: background transparent like the other pages, no grey disc under the body. The canvas is
  transparent (`alpha: true`, clear alpha 0); the grey floor, pedestal and rings are gone.
- Chief: "anatomi wanita nya kok jelek banget". Same as upstream Human Atlas: the HuBMAP female source
  has no skull, ribs, arms or feet and almost no muscle. Decision: the female body starts with
  `borrowed` (180 bones from the male reference), `donor-muscle` (76 leg muscles, Andreassen) and
  `integumentary` (see-through skin) on (`Edition.shown`). They stay listed under their own names
  ("Tulang dari referensi pria", "Otot tungkai (donor)"), so the borrowing stays visible; upstream
  kept them off for that reason. Tap picking skips the skin while solid structures show.

## 2026-10-07 — Atlas Anatomi: Human Atlas inside MedBoard (/atlas)

- Decision (Chief: "Buatkan halaman khusus Atlas", all features working, names in professional
  Indonesian/Latin, MedBoard design). Source https://github.com/slorksmo/Human-Atlas at
  `5bb5713a` (code MIT, © 2026 ashemag, licence in `src/lib/atlas/LICENSE-human-atlas.txt`; anatomy
  data CC BY 4.0, `public/atlas/ATTRIBUTION.md`, credited in the page's "Sumber" dialog).
- Chief's answers (AskUserQuestion): `three` 0.159.0 + `@types/three` 0.159.0, pinned exactly (the
  scene patches three shader chunks by name); geometry in Git LFS under `public/atlas/models`
  (gzip chunks only, about 69 MB; `.gitattributes` rule); names without a published Latin label are
  machine-translated Latin, shown marked "Latin belum diverifikasi".
- Names: `public/atlas/terms.json`, 4,521 English source names → `{la, id, verified}`. `verified` is
  true for 464 names whose Latin equals the Wikidata `la` label of the same FMA concept (CC0, joined
  on FMA ID, P1402); the rest were translated to TA98/TA2 Latin and Indonesian by Claude subagents
  (laterality agreement, Roman-numeral series), spot-checked. Display: Latin title, Indonesian under
  it, English source name in the detail. Search matches Latin, Indonesian, English and atlas ID,
  word starts ranked first. Arabic and its RTL plumbing were dropped.
- Port: `src/lib/atlas/*` (data model, layout, tap, download, WebMCP tools), `src/app/atlas/*` (scene,
  page, module CSS). Not ported: shadcn/base-ui kit, Tailwind, Vite/Cloudflare files. Layout uses a
  container query on the stage (cards stack below 900 px of stage width), so it follows the rail,
  not the window. Reduced motion: explode jumps, orbit damping off.
- Evidence: suite group `atlas` 14 tests (inventory and every gzip chunk, names complete, search,
  explanations, layout no-overlap, tap, agent tools, page rules); browser pane: both bodies load to
  100%, tap select, search "jantung" → Cor, isolate, explode 100% inventory, hover tooltip in Latin,
  Sumber dialog, narrow layout with Sistem sheet.
- Limits: at 375 px the open rail still leaves the page about 80 px (shell issue awaiting Chief);
  `pnpm run build` not run (demo on 4345 runs from this folder).

## 2026-10-07 — MedLink transcript and ePuskesmas summary (OpenRouter free)

- Decision (Chief: "sekalian transcript, gunakan openrouter free; dokter ngomong dia mencatat, pasien
  ngomong dia mencatat; AI meringkas ke susunan ePuskesmas"). In the video room the doctor's screen
  records both microphones: the local LiveKit microphone is "Dokter", a remote one is "Pasien"
  (`ConsultCapture.tsx` inside `VideoRoom`, doctor role only). Audio is cut at pauses into
  utterances of 1-15 s, silence and coughs dropped, encoded as 16 kHz mono WAV
  (`src/lib/telemedicine/transcript-audio.ts`) and sent one at a time per speaker to
  `POST /api/telemedicine/transcribe` → OpenRouter chat completions with `input_audio`
  (`thinkingmachines/inkling-small:free`, fallback `inkling:free`; OpenRouter has no STT endpoint).
- "Ringkas ke ePuskesmas" sends the transcript (long numbers removed) to
  `POST /api/telemedicine/summarize` → `google/gemma-4-31b-it:free` (fallback
  `nemotron-3-super-120b-a12b:free`) with JSON output. The answer is read into the ePuskesmas
  pages, kept separate: Anamnesa (field names of `AnamnesaFillPayload`, including `lainnya`
  terapi/edukasi/rencana), Diagnosa (`DiagnosaFillPayload`: icd_x, nama, jenis, kasus; codes missing
  from the 2010 catalogue dropped), Resep (nama_obat, signa as "3x500mg", jumlah). Each page has
  its own Copy button (`TranscriptPanel.tsx`, right column of the room).
- Assumptions (mine, reported): the transcript starts only when the doctor ticks "Pasien setuju
  percakapan dicatat" and presses "Mulai transkrip"; nothing is stored (lost when the page closes);
  no automatic RME fill yet.
- Risks for Chief: free models allow 20 requests a minute and 50 a day (1000 a day once 10 credits
  were ever bought). One request per utterance means roughly 60-120 requests for a 10-minute
  consult, so a free account stops partway through the first consult and 1000/day covers about
  10 consults; a longer pause (about 2 s) and merging same-speaker chunks would cut that several
  fold (Chief's call). Capture does not pause itself after repeated 429s; the free providers publish no
  data policy and free endpoints may require allowing logging or training in the OpenRouter
  privacy settings, so patient voice may be kept by the provider; this departs from the earlier
  "AI tanpa identitas" rule by Chief's choice. Indonesian transcription quality is unverified. Suspected on first live use: Gemma may reject a
  system role (merge the prompt into the user message) and inkling is a reasoning model (may need
  reasoning effort low and max_tokens).
- Needs `OPENROUTER_API_KEY` (added to `.env.example`). Routes are crew-only and audit sizes only.
- Evidence: `transcript-audio.test.ts` 6, `epuskesmas-summary.test.ts` 6, `openrouter.test.ts` 4,
  `src/components/telemedicine/transcript-room.test.ts` 3 (moved out of `[id]/`, where node --test
  read the brackets as a glob and silently ran nothing). Browser pane with stubbed appointment and
  session: panel, consent gate, 400 on bad audio, 401 without session, 502 without key.

## 2026-10-07 — MedLink: studio green room, then the work in tabs

- History: a numbered five-step flow was built first (Chief approved it), then Chief asked for
  thin cards with a device-check connector, rejected that ("enggak lah ya desainnya"), chose the
  "Ruang tunggu ala Meet" preview and asked for it to look like a professional studio.
- Decision: `/telemedicine` opens on `MedLinkStudio.tsx`, one thin card: a 16:9 preview stage
  (grid backdrop when off, mirrored self-view, name tag, round mic and camera mute buttons) and a
  "Cek perangkat" column joined by a connector line, dot to dot: Kamera (device picker), Mikrofon
  (device picker and level meter), Speaker (test tone), Koneksi (round trip to
  `/api/auth/session` every 15 s, `latencyLabel`). The online switch ("Mulai online") sits under
  the checks. Below the studio, tabs in working order: Permintaan, Jadwal (the booking form),
  Konsultasi (active sessions, "Masuk"), Riwayat; each count appears once, on its tab.
- Camera and microphone open only on "Nyalakan kamera" and are stopped on device switch and when
  the page is left. Helpers in `src/lib/telemedicine/device-check.ts` (+test).
- Removed as before: KPI cards, command desk, developer pathway, credit line, floating badge.
  Kept: data loading, sockets, polling, the Assist consult dialog and the EMR transfer toast.
- Evidence: `medlink-page.test.ts`, `device-check.test.ts` (red first); Browser pane with a stubbed
  camera stream (canvas + oscillator), not a real webcam.

## 2026-10-07 — ICD page: taller list, thin scrollbar, Copy buttons, "Sentra Algorithme"

- Results list on desktop: as tall as the detail panel, at least 75vh (was max 60vh); mobile keeps
  60vh. Scrollbar 4 px, `--border` thumb, no arrows (`::-webkit-scrollbar`; `scrollbar-width`
  only where that pseudo-element is unsupported, since Chromium ignores it once the standard
  property is set).
- Each code in "Versi ICD" has a black neumorphic "Copy" button (`CopyCode` in `IcdTimeline.tsx`,
  24 px high, 13 px from `.ui-btn`). The label stays "Copy"; only the icon turns to a check (or a
  cross on failure) for 1.5 s, so the line never re-wraps.
- The AI pick button reads "Sentra Algorithme" (Chief's spelling), "Sentra Algorithme memilih…"
  while loading.

## 2026-10-07 — ICD referral: "Rujuk?" button and WHO-block relatives

- Decision: under the ICD versions a line with an arrow leads down to a "Rujuk?" button
  (`IcdReferral.tsx`, keyed per code, closed by default, fade without height animation). Pressing
  it shows the authority line and "Bisa dirujuk, masih berkaitan".
- Source of related codes (Chief chose "Blok ICD WHO"): first the categories of the code's WHO
  ICD-10 2010 block (`src/lib/icd/who-blocks.ts`) that hold no 144 diagnosis, nearest category
  first, so BPJS takes the referral without TACC; then the SKDI 2/3A/3B list as before; up to 8.
  Chapters R, U, V-Z get no block neighbours. Asma J45 → J44, J46, J43, J47, J42, J41, J40.
- Fix: a 144 entry now makes its whole category FKTP work (J45.9 covers J45 and J45.0); before,
  J45 said "Tidak termasuk 144". SKDI exclusions keep the exact rule.
- Limits: names of block relatives are the catalogue's English titles; wide blocks (A30-A49)
  give loose neighbours (A49.3 → A48, A44, Nocardiosis). Block table typed from the WHO list;
  `who-blocks.test.ts` checks order, no overlap, and that every catalogue category has a block.

## 2026-10-07 — ICD code panel: referral help under the ICD versions

- Decision: under "Versi ICD" the code panel shows "Rujukan" (`src/app/icdx/IcdReferral.tsx`,
  `src/lib/icd/referral.ts`, `referral` in `icdCodeDetail`). Data only, no AI (Chief approved
  "Ya, kerjakan"). A code in the 144 FKTP list (`public/data/144_penyakit_puskesmas.json`) is
  "Kewenangan FKTP", referred only with TACC (Time, Age, Complication, Comorbidity). A code with
  SKDI competence 2, 3A or 3B (`public/data/penyakit.json`) is "Kewenangan RS". Related
  hospital-level diagnoses come from the same organ system, never 4A, not in the 144 list, and must
  be in the ICD-10 2010 catalogue; up to 8; each opens its own code.
- Correction to the proposal: a code in neither list stays neutral ("Rujuk sesuai indikasi
  klinis"); not being among the 144 does not make it hospital work. The same-category rule was
  dropped.
- Limit: `penyakit.json` holds about 22 hospital-level entries and none for the respiratory
  system, so J18.9 or J06.9 show no related list. "Gigi dan mulut" has no 144 counterpart.
- `FKTP` and `TACC` added to the acronym list in `text-case.test.ts`.
- Evidence: `src/lib/icd/referral.test.ts` 7/7, `icdx-page.test.ts` referral test (red before the
  panel existed); I10 → FKTP with I21, I50, I25, I20; K35 → RS 3B; checked in the Browser pane.

## 2026-10-07 — ICD code panel: subcodes and a two-stop moving timeline

- Decision (Chief: "pilih A00 maka di kolom kanan ... di bawahnya ada timeline", then "cukup timeline
  ICD yang di gunakan di Indonesia, pcare, dan ICD reference yang paling banyak di gunakan dunia",
  "timeline nya harus Motion", "jangan merah, gunakan warna tosca, cukup PCare BPJS, Epuskesmas,
  E-Claim"): choosing a code opens it in the right panel with its chapter, parent category and
  subcodes (`GET /api/icdx/code`, `icdCodeDetail` in `dynamic-db.ts`), then `IcdTimeline` with two
  short stops (Chief: "buat ringkas, misal Worldwide ICD"): "2010 ICD Indonesia ✓ A00" over
  "PCare BPJS · ePuskesmas · E-Claim", and "2019 Worldwide ICD A00" (WHO ICD-10 2019 code). The full 1900–2022 history strip at the page bottom is gone.
- Motion (`motion/react`): the rail draws down (scaleY), the two stops fade up in turn, the status
  line last; ease-out, no spring; still under prefers-reduced-motion. Replays per code (`key`).
- New token `--tosca: #0f766e` (about 5:1 on white) for the systems line.
- Asumsi to confirm with Chief: "most used in the world" is ICD-10 (2019 is WHO's last ICD-10
  edition); "E-Claim" follows Chief's spelling (BPJS writes "E-Klaim"). The 2019 catalogue file is
  not in the repository, so the worldwide code falls back to the 2010 code (`worldwideCode`); it is
  exact only where `database/icd102019en.xml` is present.
- Evidence: the panel, timeline, motion and tosca tests in `src/app/icdx/icdx-page.test.ts`
  failed before, pass after; browser: rail scaleY 0.67 at 200 ms, stops at opacity 0.38/0 at 250 ms.

## 2026-10-07 — ICD Coding page made compact; ICD editions as a timeline

- Decision (Chief: "design di rubah agar lebih ringkas, misal riwayat versi di buat timeline"):
  `src/app/icdx/page.tsx` rebuilt on `icdx.module.css` and MedBoard tokens, replacing about 800
  lines of inline styles, the numbered stream phases and the old gold palette (`--c-asesmen`).
- Layout: search field; a typed code shows one compact conversion line ("Bisa dipakai di PCare" or
  "Tidak ada di ICD-10 2010"); a dense results list (code, name, "Bab J" instead of "CHAPTER J")
  beside a sticky detail panel; the AI pick sits above the list. ICD editions 1900–2022 are one
  horizontal timeline, the catalogues in use (2010, 2016, 2019) ringed in accent, one note line
  for the chosen edition (2010 by default).
- Behaviour kept: lookup, normalisation hint, typo redirect, AI pick, PCare verdict.
- Evidence: three page tests in `src/app/icdx/icdx-page.test.ts` failed before, pass after.

## 2026-10-07 — ICD search forgives typos; AI picks the best code on request

- Decision (Chief: "salah tulisan namun mirip dapat di arahkan ke nama diagnosis, lalu dari banyaknya
  diagnosis yang muncul AI membantu mencarikan mana yang terbaik"), pulled forward from the phase 1
  and 2 spec (`docs/superpowers/specs/2026-10-07-icd-coding-phase1-design.md`).
- Typos: `src/lib/icd/fuzzy.ts` matches each typed word to the vocabulary of the 2010 catalogue
  plus the Indonesian KKI names (`public/data/penyakit.json`) by Damerau distance (0 mistakes up to
  3 letters, 1 up to 7, 2 beyond); every word must match. Ranking: fewest mistakes, name starting
  with the typed word, fewest detail words ("unspecified"/"NOS" not counted), so "Pneumonia" and
  "pnemonia" both open with J18.9. The page says "Menampilkan hasil untuk pneumonia".
- AI: `POST /api/icdx/rank` (signed-in crew only, existing `isCrewAuthorizedRequest`) sends DeepSeek
  chat only the typed text, with digit runs removed, and up to 30 result codes whose names come
  from the server catalogue. Codes outside that list are dropped. Only on the doctor's click, never
  per keystroke. "Saran AI. Keputusan kode tetap pada dokter."
- Evidence: `src/lib/icd/{fuzzy,ai-pick}.test.ts` and the catalogue tests in
  `src/app/icdx/icdx-page.test.ts` failed before, pass after. Live DeepSeek answer not verified
  (no key on the demo server).

## 2026-10-07 — ICD Coding: database line and LB1 generator removed

- Decision (Chief: "DB: 2010=D:\DEV\... Dan fungsi nya, termasuk 04. LB1 Generator hapus saja"):
  the page no longer shows the database line or the "Dynamic database" badge, and the lookup no
  longer returns `loadedFrom`/`extensionSource` at all (they sent absolute server paths to the
  browser). The "04. LB1 Generator" section and its client state are gone from `/icdx`.
- Kept: `/api/report/automation/{run,history,preflight,status}` and `src/lib/lb1/**`. No caller is
  left in `src`, but they drive the ePuskesmas RPA and `icd10-2010.ts` normalisation is still
  used by the ICD lookup; deleting the backend is Chief's call.
- Evidence: `src/app/icdx/icdx-page.test.ts` (new group `icd-coding`) failed before, passes after.

## 2026-10-07 — Audrey's voice column is a dot-matrix orb (idle, listening, thinking)

- Decision: the portrait in the voice column becomes a dot-matrix orb after
  rareui.com/components/matrixorb (Chief: "Ilustrasi wajah ganti dengan berikut ... (warna
  sesuaikan)"; "Ada 3 macam ya, idle, listening, thinking"). Dots are MedBoard `--accent` straight
  on the white card (Chief: "Jangan ada block warna hitam begitu" removed a black panel); the stage
  label sits under the orb.
- States: idle for idle, ready and error; listening (bloom from the centre) for recording and for
  speaking; thinking (bright spot circling) for connecting and processing. Speaking shares the
  listening bloom because Chief named three states (asumsi; Chief may want a fourth).
- Written from the reference's visible behaviour, not copied: Rare UI's licence requires a visible
  credit link for copied components. If Chief wants the original code, add that credit.
- Rejected on the way, same day: a neural point cloud of her portrait ("serem", "block warna")
  and relief lines of her face (replaced before Chief saw them by the orb request).
- About block in Swiss style (Chief: "rubah menjadi swiss style design", after rejecting a tinted
  card with letter tiles): one black hairline, an asymmetric 4/8 grid, a 56 px AUDREY wordmark,
  the name in one flowing line with accent initials (stacked was rejected: "mendatar saja") (`audrey-identity.ts`; the stack reads out
  as the full name), Chief's description of 2026-10-07 word for word at 14 px, the name linking to ferdiiskandar.com in a new tab (18 px was "terlalu besar"), and three numbered
  pillars under thin rules across the full width ("memanjang from left to right"). No box, tint or icon. `AUDREY` joined the acronym list.
- Evidence: `src/app/voice/visual/matrix-orb.test.ts` (5) and `audrey-page.test.ts` (three-state
  mapping, orb colours, Chief's copy) failed before the change and pass after it.

## 2026-10-07 — Consult Audrey redesigned: chat column, voice column, question templates

- Decision (Chief: "redesign total, simplified namun lengkap"; when asked for a direction:
  "kolom chat, kolom voice, ada template tanya misal dosis obat, penyakit dll"): one identity
  row (avatar, status, motion switch, end session), a chat column (3/5) and a voice column (2/5),
  one disclaimer line. Supersedes the 2026-10-06 attachment layout (stage beside stream).
- Chat uses the existing Audrey text route `POST /api/perplexity` (persona prompt), no new
  backend. Six templates in `audrey-templates.ts` (Dosis obat, Penyakit, Diagnosis banding,
  Rujukan, Interaksi obat, Edukasi pasien); choosing one selects its first [slot].
- Voice logic (socket, mic worklet, playback, push-to-talk, interrupt) is unchanged; Space is
  push-to-talk except in fields and on a focused button.
- Removed: emblem, tagline, Alpha badge, floating badges, rings, glow. Audrey's translate/scale/
  rotate keyframes became one opacity "breath" on a 1 px halo (steady console rule).
- Evidence: Audrey tests rewritten red first (missing templates module), 8/8 after; suite
  359/359; in the browser "Dosis obat" fills the field with "[nama obat]" selected and typing
  replaces it. Not run: sending a chat (would reach the external model), a live voice session.

## 2026-10-07 — Field underline: 1 px and slower

- Decision (Chief: "setiap kolom yang ada garis bawah motion, buat agar lebih tipis dan lebih
  halus"): every typing field (`.ui-input` in ui.css and the app-wide group in globals.css) draws
  a 1 px base line and a 1 px Oxford focus line as two background layers (no border, so they
  never stack to 2 px), growing from the left over 600 ms on cubic-bezier(0.22, 0.61, 0.36, 1),
  the curve the sign-in column already used. Was 2 px over a 1 px border in 220 ms ease-out.
- Evidence: in the browser all 15 fields on /emr report 0 px border, `0% 1px, 100% 1px`, 0.6 s;
  the focused complaint field reaches 80% at 250 ms and 100% after.
  `design-tokens.test.ts` asserted the old 2 px / 220 ms spec and failed; it now asserts the new
  spec and also that no later rule re-adds a `border-bottom` that would stack. Suite 356/356.

## 2026-10-07 — Profile page: activity heatmap, Asisten Medis, Critical Mind library, tidy case

- Decision (Chief): the "Sedang online" box became lab.xevrion.dev/lab/contribution-heatmap,
  counting clinical reports per WIB day for the doctor (Chief chose "Laporan klinis"); later
  "Biar kan memanjang horisontal": it is a full-width row, the whole year without a scrollbar.
  New `GET /api/report/clinical/activity?dokter=` returns counts only (`select createdAt`).
  Thresholds 1/5/10/20 reports a day (the lab's 1/4/7/10 are for commits). The socket
  `user:join` stays (others' rosters); the roster on this page was removed.
- Decision (Chief): every "Assist" on the profile page reads "Asisten Medis"; the work flow is an
  interactive diagram (`AsistenMedisFlow`, steady: no motion, colour only). The zip path stays.
- Decision (Chief): the Critical Mind tab is the library of dr. Ferdi Iskandar's thinking from
  github.com/drferdi/MyMindMemory (four DOI publications; static data in
  `src/lib/critical-mind/library.ts`, a new writing needs a code change). The engine notes it
  replaced went. The adaptive-engram 2026-06-08 file in the repo is empty; its description comes
  from the README title and topics.
- Decision (Chief): text in all caps or all lower case is tidied (input on blur + display);
  mixed case is never touched; name fields title-case with dr./drg./Sp.XX/S.Ked. Input side is
  global (`TidyCaseOnBlur` in layout) with `tidyModeFor` skipping codes, identifiers, accounts,
  links, searches and `data-tidy="off"`. Display side at 7 points: EMR incoming consult and
  accepted consult complaint, telemedicine complaint and patient name, clinical report complaint
  and working diagnosis, home logbook patient and diagnosis. Stored data is never rewritten.
- Decision (Chief): "Status Hari Ini" deleted; the role and position badges and the official
  link tiles and the Akses Layanan badges (Kemenkes, EMR, BPJS) on the profile are black neumorphic (`ui-badge--neu`, `home-link-tile`).
- Decision (Chief): the rail's team section is "Sentra HQ".
- Evidence: red-first tests for HQ, library, activity days (00.30 WIB lands on 7 Oct), tidy case
  and field rules; suite 356/356; in the browser a typed "DEMAM TINGGI" becomes "Demam tinggi"
  on blur and React keeps it ("Demam tinggi x" after typing on).

## 2026-10-07 — Open rail follows lab.xevrion.dev/lab/sidebar-submenu

- Decision (Chief named the reference): the open rail is the lab's sidebar sub-menu, one section
  open at a time with its items on a tree and the branch to the current page lit in the
  section's tone. Geometry and motion copied verbatim (TITLE 44, ROW 38, TRUNK 8, BEND 7,
  REACH 22; 0.32 s fold, spring bar 0.35 s / bounce 0.12, path draw, item stagger), confined to
  the rail. Type follows MedBoard tokens (16/14 px, not the lab's 17/15); icons stay Lucide.
- Default taken (not answered by the reference): the open section and lit item come from the URL
  (`findNavSpot`), pages outside the rail open none; a closed section title opens its first
  page; the 56 px icon rail (Ctrl+B, narrow by default for new users) stays, its active icon now
  in the section tone with a 3 px bar instead of a filled square. Tones are tokens: Klinis
  `--accent`, Tim `--primary`, Laporan `--success` (the lab's third hue is purple; MedBoard has
  no purple token).
- New dependency `motion` 14.0.0 (MIT; brings framer-motion, motion-dom, motion-utils), exact
  pin like Lenis, installed with `--ignore-scripts`.
- Evidence: `findNavSpot` test failed first (not a function), passes after; suite 337/337;
  in the browser the bar slides 44 to 88 px with the folds summing to a steady height, and the
  lit trunk stretches 12 to 88 px.

## 2026-10-07 — Sign-in from sentra-smartboard-login; Lenis smooth scroll

- Decision (Chief): sign-in uses the dark neural field ("Tetap gelap"), the opening plays once
  per session, Indonesian copy, MedBoard brand; the column header is the official Sentra
  Artificial Intelligence lockup (mark path verbatim from `docs/brand/02-logo-variations`), its
  wordmark enlarged and animated at Chief's request; the access card is Swiss style.
- Decision: Microsoft sign-in, "Remember me" and "Forgot password" were not ported (no backend).
- Decision (Chief: "Ya, seluruh MedBoard"): `lenis@1.3.26` (MIT) for page scroll, with
  `allowNestedScroll`; off under reduced motion.
- Decision: the 1 px slow underline applies to the sign-in column only; the kit stays 2 px
  (pinned by `design-tokens.test.ts`).

## 2026-10-07 — Internal files untracked; Railway retired; Medboard is one clean commit

- Decision (Chief: "Untrack + .gitignore"): agent notes, `AGENTS.md`, generated reports and
  internal design docs stay on disk but out of git; `.gitignore` lists them by section.
- Decision (Chief: "Hapus semuanya"): `database/` reference copies, unused modules and
  unreferenced public assets are deleted, not archived.
- Decision (Chief: "Sudah ganti ke vps server kok yang baru bizznet"): Railway config removed;
  docs describe only the Biznet Gio VPS. Evidence: Railway health 404, VPS health 200.
- Decision (Chief: "Ganti dengan 1 commit bersih"): drferdi/Medboard `main` is a single
  parentless snapshot (`git commit-tree` of the capsule tree), pushed with `--force-with-lease`.
  PNGs are LFS in the capsule's own `.gitattributes` and their objects are pushed with
  `git lfs push`, because the earlier split published 130-byte pointers.

## 2026-10-06 — Deploys carry real LFS images; profession logos are grey on transparent

- Decision: the VPS deploy packs Git LFS files of `public/` from the working tree in a second
  tarball and refuses to continue if a pointer is left, because `git archive` writes pointers
  (root `.gitattributes` puts `*.png` in LFS) and the live site served 130-byte avatars and logos.
- Decision (Chief: "cari logo asli nya masing masing lalu reformat ke dalam design warna logo
  grey", then "background di buat transparansi", "kualitas logo perhatikan"): profession logos
  are muted grey emblems, 128×128 PNG, transparent outer background, made from sources of at
  least 190 px. IBI and PPNI come from seeklogo and perawat.org because ibi.or.id shows a bot
  check and ppni-inak.org did not open; Chief approved every download.
- Evidence: live `/avatar.png` = 131 bytes vs 231,887 locally; guard red on 17 pointers, green
  after overlay; `crew-access.test.ts` red first (ENOENT `ppni.jpg`); commits `7bc0895f`,
  `842461d5`.

## 2026-10-05 — MedBoard host is medboard.sentrahai.com

- Decision (Chief): `crew.puskesmasbalowerti.com` is retired; MedBoard is
  `medboard.sentrahai.com`. Default app base URL (WebAuthn rpID), CORS, Socket.IO origins, CSP
  `connect-src`, `.env.example` and the VPS runbook follow. Other legacy origins
  (`puskesmasbalowerti.com`, the Railway app) were left in the lists; Chief did not ask.
- Evidence: passkey helper test for the default rpID red first; commit `4362337a`.

## 2026-10-05 — Leave Railway for an Indonesian VPS

- Decision (Chief: Railway "terlalu mahal"; chose "VPS Indonesia"): MedBoard is to run on an
  Ubuntu VPS in Indonesia (4 GB RAM) behind Caddy, with local PostgreSQL and a systemd unit;
  runbook `docs/deploy-vps.md`. Railway bills about $10 per GB RAM per month; a 2–4 GB VPS in
  Indonesia costs about Rp 87–160 ribu per month (prices from provider listings, 2026-10).
- Rationale: MedBoard needs an always-on process (Socket.IO, presence timer) and Chromium, so
  serverless does not fit; data stays in Indonesia (PP 71/2019 for public-scope systems is an
  assumption to be confirmed by Chief); the whole `runtime/` folder now persists, not only the
  bridge queue.
- Evidence: no code change needed (`TRUST_PROXY_HEADERS`, `HOST`, `PORT`; CORS already lists the
  crew domain); runbook bash snippets pass `bash -n`; `git archive` package checked (6.8 MB, no
  `node_modules`, only `.env.example`). Not yet run on a real server.

## 2026-10-05 — "Asisten Medis" name; registration survives retries; ACARS lists Assist users

- Decision (Chief: "ganti semua istilah ghost protocol menjadi Asisten Medis"): copy and code
  identifiers say Asisten Medis; stored values (`sourceOrigin: 'ghost-protocols'`,
  `engineVersion 'ghost-iskandar-v1'`) stay, because saved records and the extension send them.
- Decision (Chief chose "Approve atomik, Ditolak boleh daftar ulang, Pendaftaran tak hilang saat
  redeploy"): only a `PENDING_REVIEW` request blocks a new one; approval skips creating a user that
  already exists; the request and profile files go on the Railway volume through
  `CREW_ACCESS_REGISTRATION_REQUESTS_FILE` and `CREW_ACCESS_PROFILE_FILE` (Chief sets them).
- Decision (Chief chose "Heartbeat + ACARS"): one presence store on `globalThis` (server.ts and
  route bundles do not share module state) merges dashboard sockets and Asisten Medis heartbeats
  (`/api/presence`, crew cookie, TTL 90 s, pruned every 30 s). ACARS shows the source. Triage goes
  only to dashboard users, because an Assist-only user has no socket to receive it.
- Evidence: `crew-access` suite (registration 3, presence 9, route 4, client 3) red first; Browser
  pane demo with synthetic users. Commits `98cd6fec`, `083e20c6`, `9c08db4b`.

## 2026-10-05 — IBM Plex Sans on the Carbon type scale; alerts without colour blocks

- Decision: Chief asked for IBM Plex Sans across the whole dashboard with professional sizing, and
  for alerts without filled colour blocks. The font is the self-hosted variable IBM Plex Sans
  (`@fontsource-variable/ibm-plex-sans`, already a dependency), replacing Poppins. Sizes follow
  IBM Carbon's productive scale: 12 / 14 / 16 / 20 / 24 / 28 / 32 only (display 36+ kept), body
  14px at line-height 1.43, uppercase tracking at most 0.1em. Alerts carry severity with a 2px
  left rule and a severity word, never a background fill, gradient, pulse or emoji.
- Rationale: Carbon is the system Plex was drawn for. The floor is 12px, not 14px: the old
  "minimum 14px (WCAG best practice 2026)" comment had no decision behind it and is not a WCAG
  rule, and over 200 inline sizes were 7–10px. No monospace still holds (2026-03-06).
- Evidence: `5d0259fe` (1,029 sizes mapped by script, excluding `src/lib/cdss`, `src/lib/report`,
  email templates, tests) and `ef28a942`; Browser pane check on a local dev server, with no page
  overflow or clipped text on five pages at 1563px and on two pages at 1100px; lint,
  test:capsule, build, deploy:dry-run green.

## 2026-10-04 — MedBoard's diagnosis engine is retired for MIRA; clinical rules realigned

- Decision (Chief): "diagnosis system medsmartboard ini istirahatkan, fully using diagnostic engine
  MIRA". Chosen shape: Assist forwards its MIRA differential with the consult; MedBoard shows it.
  The engine is gated at the route level by `LEGACY_CDSS_ENGINE_ENABLED` (off when unset):
  `/api/cdss/diagnose` and `/api/clinical/differential/evaluate` answer 503 `{ retired: true }`
  after auth with a 'failure' audit; `/api/consult` skips the engine; `GET /api/cdss/diagnose`
  tells the EMR page to disable its CDSS button. The engine code and its tests stay.
- Consequence accepted by Chief: MedBoard's PE/anaphylaxis Symphony gates and adult vital red flags
  no longer run on consults; safety alerts come from Med-Assist.
- `mira_differential` is validated (zod) and dropped when malformed; it travels on the doctor
  socket and to the intelligence dashboard (source 'mira'). No schema change, so the pending-list
  path does not carry it.
- Clinical rules (Chief chose the research recommendations, 2026-10-04): trajectory SBP low bands
  follow NEWS2 (<=90 critical, <=100 high, <=110 moderate; Med-Assist core uses < 90); a missing
  AVPU is no longer scored as 'A' (schema and patient-sync); momentum worsening for SBP, DBP,
  temperature and glucose means moving away from the normal-range midpoint, so 'shock' (SBP down,
  HR and RR up) is reachable. The deterioration denominator was already present-only here.
- Evidence: red-then-green tests in `momentum-engine.test.ts`, `trajectory-analyzer.test.ts`,
  `unified-vitals.test.ts`, `mira-differential.test.ts`, `consult-intelligence-events.test.ts`,
  `MiraDifferentialCard.test.tsx`, the differential route test and two safety-net cases;
  `test:capsule`, lint, build exit 0. `momentum-engine`, `prediction-engine` and `unified-vitals`
  tests existed but ran in no suite; they now run in intelligence-route.

## 2026-10-04 — MedBoard accepts Med-Assist payloads; the dashboard stays authoritative for now

- Decision (Chief): align MedBoard with Med-Assist by accepting Assist payloads first. The shipped
  contract (`authoritative_engine: 'dashboard'` in Med-Assist `bridge-client.ts`) stays; flipping
  authority and the clinical rule differences between the two engines are separate decisions.
- Both engines descend from the Jewel/Sentra Nada trajectory engine (Med-Assist
  `symphony-trajectory-core.ts` header); the upstream package no longer exists in the repository.
- Assist's trajectory summary carries no momentum data, so it reaches the CDSS prompt as its own
  "Ringkasan Trajectory dari Assist" block instead of filling `CDSSTrajectoryContext` (Chief chose
  the separate block, R3).
- The reports a test run writes are git-ignored and listed as mutable state; the committed
  safety-net report was still the legacy 21/25 run.
- Evidence: `assist-acceptance` suite (consult events, anamnesis extract, engine prompt) and
  `diagnose-parser.test.ts` failed before the changes and pass after; `test:capsule`, typecheck
  and build exit 0; a 2600-character extract against `start:local` returns 200 with a token and
  401 without.

## 2026-09-27 — Autocomplete tests send a clinician session

- The three "Autocomplete klinis" tests failed with 401, not with a wrong chain:
  `/api/cdss/autocomplete` requires a crew session (`isCrewAuthorizedRequest`) and the tests sent
  none. With a DOKTER session the route returns the chains the tests claim (Nyeri Pinggang with
  CVA Test; Nyeri Punggung), so only the request header changed, no assertion.
- Every failing test in `scripts/test-cdss.ts` now sets exit code 1 (27/27 pass).

## 2026-09-27 — CDSS diagnosis access comes from the clinical role only

- Decision (Chief, option A): `POST /api/cdss/diagnose` and
  `POST /api/clinical/differential/evaluate` admit a session only when its role is clinical
  (`DOKTER`, `DOKTER_GIGI`, `PERAWAT`, `BIDAN`, `APOTEKER`, `TRIAGE_OFFICER`). The profession no
  longer grants access.
- Rationale: every profession in `CREW_ACCESS_PROFESSIONS` is clinical and a missing profession
  defaults to `Bidan`, so the old "role or profession" rule let ADMIN, CEO, and ADMINISTRATOR
  sessions run diagnoses. The behaviour was inherited unchanged from legacy.
- Evidence: `scripts/test-cdss.ts` "Auth CDSS diagnose" tests (ADMIN/CEO/ADMINISTRATOR with a
  clinical profession get 403; DOKTER_GIGI and TRIAGE_OFFICER get 200) and the differential test
  in `src/app/api/clinical/anamnesis/extract/route.test.ts` failed before the change and pass
  after it. A failing `Auth ` test now sets exit code 1.

## 2026-09-27 — Migrated from abyss-monorepo into SAFRS

- Decision: The legacy folder `abyss-monorepo/apps/healthcare/medboard` was copied as it is
  to `projects/healthcare/medboard`. Source: legacy commit
  `762e48cb4bb1967e2132e7b530e8f2a7f4231c59`.
- Not copied: `.agent/`, `.claude/`, `CLAUDE.md`, `.env*` files other than `.env.example`,
  `node_modules/`, `.next/`, `runtime/consult-accepted.jsonl`.
- Toolchain: fresh pnpm 11.21.0 lockfile with `nodeLinker: hoisted`, Node 24. `next` raised to
  16.3.6; overrides `postcss >=8.5.23`, `sharp >=0.35.4`, `deepmerge-ts >=8.0.1`, and
  `effect >=3.20.0` clear the `pnpm audit` findings. `scripts/prisma-generate.mjs` replaces a
  `node -e` one-liner in `postinstall`.
- `test` is `test:capsule`: the main suite plus `test:cdss:engine`, `test:news2`, and
  `test:symphony:safety-gates`. `run` is `start:local` on 127.0.0.1:4344 without a database
  or migrations.
- `docs/TESTING.md` was renamed to `docs/testing.md` (the layout the repository checks).
- Known test gaps are left as they were in legacy on Chief's instruction (2026-09-27: "biarkan
  dulu, buat catatan"); see `docs/testing.md` "Known gaps" and `HANDOFF.md`.

## 2026-10-08 — Dashboard motion preserves clinical navigation

- Use existing Motion/Three.js dependencies plus framework-independent DOM effects; no new packages.
- Clinical work routes, including calculator and ICD coding, navigate immediately in both directions.
  Nonclinical navigation uses portal, depth or SVG curtain; shared-panel morphs use element-local FLIP.
- Avoid document View Transitions in the shell: captured document contents can temporarily block clicks.
  Preserve interactive navigation, abort superseded visuals and cap decorative presentation at 1200 ms.
- An armed exact-target pathname releases the transition render gate; redirects release at the deadline.
  Query/hash and replace/object/as links remain router-owned and cancel active decorative transactions.
- OS reduced motion is mandatory; Studio offers an additional session-lifetime preference. Core effects
  are portable, while this capsule integrates React only; Vue/Angular adapter examples are documentation.
- A local component harness verifies visuals without changing production authentication or using data.
  Evidence: completed motion plan, `output/motion/standalone.log` and capsule HANDOFF completion entry.

## 2026-10-08 - Cinematic Smooth is the recommended motion preset

- Chief requested a smooth wow option; curate the existing effects through two profiles rather
  than add dependencies. Cinematic Smooth is the initial default, with Balanced available for
  shorter transitions and static ambient artwork. Both preserve immediate clinical navigation.
- Store only the validated profile enum in medboard.motion-preset.v1 in browser-local storage;
  restore before paint. OS reduced motion always wins; the Studio switch remains session-only.
- Bound pointer tilt, reuse the lazy portal context, skip optional shader depth in Balanced, and
  pause ambient artwork when offscreen/hidden. Preset changes flush pending intent then cancel
  decorative visuals. This is presentation-only and does not change clinical/auth/data contracts.
