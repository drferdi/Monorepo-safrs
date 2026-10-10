# Sentrapedia design audit

Date: 2026-10-10 · Auditor: Claude (read-only audit, no source files changed)
Evidence folder: `verify-report/design-audit/` (ignored by the root `.gitignore`, line 22). Every file name below is relative to it unless it is a source path.

## Overall impression

Sentrapedia already reads as a calm, disciplined clinical tool: one 2px radius, colours confined to `:root` tokens, strong black rules under headings, and a Document Studio that is honest about provenance and review status. What holds it back is small, low-contrast type, a few WCAG AA failures that are cheap to fix, and a chat view where the composer stack takes the screen space a clinician needs to read the document.

## Scope and assumptions

The brief's placeholders were not filled, so I assumed the following:

| Item | Value used |
| --- | --- |
| Product | Sentrapedia, the clinical workspace capsule at `projects/healthcare/sentrapedia` |
| Audience | Indonesian clinicians (primary care first) drafting notes and analysing cases with fictional data |
| Stage | Refinement: HANDOFF says "local implementation complete, verified", not launched |
| Primary standard | The capsule's own recorded standard: Tosca action colour, Plus Jakarta Sans titles with Geist text ("Chief's type pair", `src/app/layout.tsx`), the "Swiss pass" in `src/app/globals.css` (one 2px corner, flat layers, strong rules), Indonesian UI with English medical terms (`docs/sentrapedia-ui.md`, `.agents/CONTEXT.md`) |
| Secondary reference | The house system in `packages/token/UI-RULES.md` and `docs/brand/`. This capsule is outside `packages/token/scope.txt` ("a standalone capsule owns its own token gate"), so divergence from it is listed separately as drift, not as defects |
| Accessibility bar | WCAG 2.1 AA as requested. Where the house floor (WCAG 2.2 AA) adds a criterion, the finding says so |

The brief's example of "IBM Plex for body" does not match any Sentra document. The house brand is Archivo plus JetBrains Mono, so I did not judge against IBM Plex.

### What was audited (fingerprint)

- Commit `ae58a789` on `codex/oracle-ii-grounding`, plus the uncommitted working tree. `git status --porcelain .` hash at start: `4a02b6cc…`. `src/app/globals.css` `c85bd0be…`, `src/app/layout.tsx` `a4c03482…`, `src/components/workspace.tsx` `f945e327…`. These three files did not change during the audit.
- **Codex was editing MIRA and the database during the audit.** Between 19:43:56 and 19:44:49 (Asia/Jakarta) it changed `src/lib/mira/{client,contract,gateway,presentation}.ts`, `src/app/api/mira/route.ts`, `src/components/document-studio.tsx`, `src/components/mira-case-form.tsx` and `src/lib/oracle-grounding*.ts`. The MIRA client now rejects a response without a `grounding` bundle. Consequences:
  - The 1440 and 768 analysis-result screenshots (`30`–`32`) were captured against the earlier contract. The 390 result could not be captured, because my recorded fixture no longer passes validation. This is not a 390px bug.
  - All Document Studio screenshots (`23`–`28`, last one at 19:44:02) predate the `document-studio.tsx` change at 19:44:49.
  - Findings about the analysis flow are marked **In flux (Codex)** and kept to presentation only.
- Dev server: `next dev` on `127.0.0.1:3101`, started from `.claude/launch.json` (`sentrapedia`). Lighthouse best-practices on a dev build includes dev-only noise.
- Every Playwright run intercepted `/api/mira` (recorded fictional payload, 502, or a request that never answers). No run reached the real MIRA service, and each run used a fresh browser profile.

### Method

1. **Screenshots** with Playwright 1.62.1 (monorepo root) driving the installed Chrome, at 390×844, 768×1024 and 1440×900, with `reducedMotion: reduce` except for the loading state. 124 screenshots cover 45 states. **Light mode only**: the app has no dark theme (see S-07).
2. **Automated checks**: axe-core 4.10.3 (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `best-practice`) on every primary state; Lighthouse 12.8.2 (accessibility and best-practices, mobile and desktop presets); a DOM metrics pass (target sizes, rendered font sizes, landmarks, radii); and a grep scan of `globals.css` and `src/**/*.tsx` for raw values. Both tools were installed in the session scratchpad, not in the project.
3. **Review by eye** of each screen against the framework in the brief.

Routes: `/` (the whole app, one route with many states), the 404 page, and `/api/mira` (not a screen).

## Accessibility results (tool output)

### Lighthouse 12.8.2 (`lighthouse-mobile.report.html`, `lighthouse-desktop.report.html`)

| Preset | Accessibility | Best practices | Failing audits |
| --- | --- | --- | --- |
| Mobile | **100** | **96** | `errors-in-console`: `GET /favicon.ico` 404 |
| Desktop | **91** | **96** | `color-contrast` (`.nav-group-title` ×3), `target-size` (`button.small-icon` "Opsi untuk Encounter …"), `errors-in-console` (favicon 404) |

Mobile most likely scores 100 because the sidebar is closed on the home screen, so its labels are not tested (inferred, not separately verified).

### axe-core 4.10.3 (`axe-results-1440.json`, `axe-results-768.json`, `axe-results-390.json`, `axe-results-extra.json`)

| Rule | Impact | WCAG | Screenshots affected | Nodes | Where |
| --- | --- | --- | --- | --- | --- |
| `color-contrast` | serious | 1.4.3 AA | 34 | 102 | see contrast table below |
| `nested-interactive` | serious | 4.1.2 A | 6 | 144 | `08-slash-template-picker--*`, `09-command-center--*`: `<div role="option"><button>` in `src/components/composer.tsx:119` and `src/components/command-palette.tsx:30` |
| `aria-prohibited-attr` | serious | 4.1.2 A | 19 | 19 | `.message-header > .brand[aria-label="Sentrapedia"]` (a `<span>` with no role), all Document Studio and result shots |
| `listitem` | serious | 1.3.1 A | 3 | 12 | `29-mira-loading--*`: `<ol role="status">` breaks list semantics for its `<li>` |
| `aria-allowed-role` | minor | — | 3 | 3 | same `<ol role="status">` |
| `page-has-heading-one` | moderate | best practice | 19 | 19 | every chat-view state (`23`–`28`, `30`): the first heading is `H2: Catatan Klinis` |
| `landmark-one-main`, `region` | moderate | best practice | 3 | 9 | `06-not-found--*` (default Next.js 404) |

The patient form's empty-blur state (`15b-patient-form-submit-empty--*`) has zero violations.

Distinct contrast failures (ratios from axe; the last three rows were computed with the WCAG formula):

| Element | Foreground / background | Size | Ratio | Needs | Evidence |
| --- | --- | --- | --- | --- | --- |
| `.nav-group-title` (MULAI, ALAT KERJA, SISTEM) | `#667085` / `#f0f0f0` | 10px | 4.36 | 4.5 | `01-home-analisis--1440.png` |
| `.empty-text` "Belum ada Encounter" | `#667085` / `#f0f0f0` | 11px | 4.36 | 4.5 | `05-empty-workspace--1440.png` |
| Clinical Cockpit tab "Timeline" | `#667085` / `#f0f0f0` | 12px | 4.36 | 4.5 | `19-clinical-cockpit--1440.png` |
| Command Center `kbd` footer | `#a4aec0` / `#ffffff` | 10px | 2.23 | 4.5 | `09-command-center--1440.png` |
| Document footer "Tinjau sebelum digunakan" | `#a4aec0` / `#fcfcfc` | 10px | 2.17 | 4.5 | `23-doc-studio-draft--1440.png` |
| Queue "Tambah tugas" hint (computed) | `#a4aec0` / `#ffffff` | 10px | 2.24 | 4.5 | `11-dialog-work-queue--1440.png` |
| Sidebar `kbd` shortcut, shown on hover (computed; axe skips `opacity:0`) | `#a4aec0` / `#f0f0f0` | 10px | 1.96 | 4.5 | `35-hover-nav-item--1440.png`, `globals.css:68` |
| Input border, needed to see the field edge (computed, WCAG 1.4.11) | `#e4e4e7` / `#ffffff` | — | 1.27 | 3.0 | `15-dialog-patient-form--1440.png`, `10-dialog-templates--1440.png` |

Pairs that pass, for the record: text on Tosca (`#073b36` on `#40e0d0`) 7.58; accent ink on accent-soft 5.92; focus ring `#08786c` on canvas 5.23; error text on error tint 7.21; secondary text on canvas 7.18.

### Target size (`dom-metrics.json`)

| Group | Size | Under 24px (WCAG 2.2 AA 2.5.8) | Under 44px (house rule) |
| --- | --- | --- | --- |
| Sidebar row actions `.small-icon` (Opsi, Edit Pasien, Tambah daftar…) | 18×23 | 7 on every screen | yes |
| Document section "Edit", "Salin/Edit/Unduh" `.text-button` | 36×14 | 11 (`docstudio-390`) | yes |
| Footer links, "Tentang workspace ini" | 16–18px tall | 5–6 | yes |
| "Gunakan kembali prompt" | 23×23 | 1 | yes |
| Icon buttons, nav rows, chips, tabs | 30–38px | — | 37 (home, 1440) to 53 (Document Studio, 390) |

WCAG 2.1 AA has no target-size criterion (2.5.5 is AAA), so these are failures only under the house floor (WCAG 2.2 AA) and Lighthouse's `target-size` audit.

### Token scan (`src/app/globals.css`, 796 lines; `src/**/*.tsx`)

| Check | Result |
| --- | --- |
| Hex colours outside `:root` | **0**. All 23 hex values live in the `:root` block (`globals.css:3-35`) |
| Raw colours in TSX | **0**. One inline style, `style={{ maxHeight }}` (`composer.tsx:84`), is computed |
| `rgba()` / `hsl()` literals | 0 (all tints use `color-mix` on tokens) |
| Use of the snapshot scales (`--space-*`, `--font-size-*`, `--radius-control`, `--motion-*`, `--target-min`) | **0** references. `sentra-tokens.css` is imported but its scales are unused |
| Raw `font-size` | 167 declarations, **15 distinct sizes**: 12px ×43, 10px ×38, 11px ×37, 13px ×13, 9px ×7, 16px ×7, 15px ×5, 14px ×5, 30px ×3, 18px ×3, 20px ×2, 5px, 19px, 24px, 25px |
| Raw spacing (`padding`/`margin`/`gap`) | 401 px values; **293 are off the 4/8/12/16/24/32 scale** (6px ×44, 10px ×38, 7px ×27, 5px ×24, 9px ×21, 14px ×20, 18px ×15, 22px ×13…) |
| Radius | `var(--radius)` ×66 (2px); also `50%` ×6, `0` ×3, `1px` ×2, `.5px` ×1. Rendered: every rounded element measured 2px |
| Durations | 18 distinct values (90ms–2s); `--motion-duration-*` unused |
| Font families | `var(--font-body)`, `var(--font-title)`, plus literals `"Helvetica Neue", Helvetica, Arial` (wordmark, `:58`) and `monospace` (`.draft-editor`, `:374`) |
| Gradients / blur | 6 `linear-gradient`s (button relief `:146-176`, rail fade `:216`, shimmer `:352`); `backdrop-filter: blur(4px)` on the dialog backdrop (`:386`) |

## Findings by screen

Legend: **Obj** = Objective (measured or tool-verified), **Jdg** = Judgment (design opinion). Severity: **Crit** = blocks the user or fails WCAG AA, **Mod** = hurts clarity or consistency, **Min** = polish.

### 1. App shell: sidebar, header, mobile drawer

First impression: the wordmark and the black nav list draw the eye first, which is correct for orientation. The canvas header is quiet. The drawer (`07-nav-drawer--390.png`) behaves well, with a scrim and the background made inert.

| # | Finding | Type | Sev | Evidence | Why it matters | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| S-01 | Group titles MULAI / ALAT KERJA / SISTEM fail contrast: 4.36:1 at 10px | Obj | Crit | Lighthouse desktop; `01-home-analisis--1440.png`; `globals.css:63` | Low-vision clinicians lose the navigation structure | Set `.nav-group-title` to `--color-text-secondary` (`#53565b`, 6.47:1 on `#f0f0f0`) and 11px minimum. Do the same for `.empty-text` and the Cockpit inactive tab |
| S-02 | Row actions (`…`, edit, add) are 18×23px | Obj | Crit (2.2 AA) | Lighthouse `target-size`; `dom-metrics.json`; `36-hover-sidebar-section--1440.png` | Misses on touch screens open the wrong Encounter's menu | Give `.small-icon` `min-width:24px; min-height:24px` (ideally 32px, as `.icon-button` has), and keep the 25px `.patient-row` height by overlapping the hit area with padding |
| S-03 | Encounter titles use US dates: "Encounter (10/08 09:03 PM)". The queue shows "8/10/2026, 21.03.00 WIB" for the same Encounter | Obj | Mod | `01-home-analisis--1440.png` vs `11-dialog-work-queue--1440.png`; `src/lib/workspace.ts:110` uses `en-US`, `src/lib/studio.ts:51` uses `id-ID` | In Indonesia "10/08" reads as 10 August. A wrong date on a clinical record is a safety risk, not just polish | Build the title with the `studio.ts` `Intl.DateTimeFormat("id-ID", …, hour12:false)` formatter plus "WIB". Existing titles are stored strings, so leave them unmigrated |
| S-04 | Shortcut hints in nav rows show only on hover, at 1.96:1 | Obj | Min | `35-hover-nav-item--1440.png`; `globals.css:67-69` | Shortcuts can't be discovered, and are unreadable when they appear | Use `--color-text-muted` for `kbd`, not `--workspace-ink-faint` |
| S-05 | Header breadcrumb truncates to "Pa…" / "Encounter (10/…" at 768 and 390 | Obj | Min | `23-doc-studio-draft--768.png`, `23-doc-studio-draft--390.png`; `globals.css` `.header-patient`/`.encounter-title` max-width 80/90px | The user can't confirm which patient's record is open, which matters before export | Below 900px, drop the greeting from the header (it repeats on home) and give the Encounter title the freed width |
| S-06 | Footer tagline and nav labels are English product chrome: "Empowering clinical teams with a unified workspace", "Voice mode", "Command Center", "Clinical Cockpit", "Sex" | Jdg | Min | `01-home-analisis--1440.png`, `15-dialog-patient-form--1440.png` | The policy keeps English *medical* terms; these are interface words, so the language switching feels unplanned | Translate the chrome (e.g. "Mode suara", "Pusat perintah", "Jenis kelamin"). Keep clinical terms such as SOAP, DDx and ICD-10 |

### 2. Home and composer (four intent tabs)

First impression: the 30px light headline wins, then the solid Tosca tab, then the composer. Reading order is right, but about 380px of empty space at 1440 (about 130px at 390) separates the headline from the input, so the one action on the page sits low.

| # | Finding | Type | Sev | Evidence | Why it matters | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| H-01 | Disabled send button still reads as enabled: Tosca at 0.7 opacity. The intended grey rule (`.send-button:disabled`) is overridden by the later `.composer .send-button` / `.composer .send-button:disabled { --control-surface: var(--color-action-primary) }` | Obj | Mod | `01-home-analisis--1440.png` vs `38-hover-send-enabled--1440.png`; `globals.css:140` vs `:143-147` and `:158-167` | Users can't tell "nothing to send" from "ready" | In `.composer .send-button:disabled` set `--control-surface: var(--color-background-surface)` and `color: var(--color-text-secondary)`. This is a specificity fix, not a redesign |
| H-02 | The microphone has the same solid Tosca fill (plus a gradient relief) as Send, so two primary-looking buttons sit in one toolbar | Jdg | Mod | `01-home-analisis--1440.png`, `globals.css:175-176` | Emphasis is split, and Send stops being the obvious next step | Give `.mic-button` the `.icon-tool` treatment the paperclip already has. Keep Tosca fill for Send and the active tab. (The mic relief is a recorded Chief decision, "yg mic biarkan"; confirm before changing) |
| H-03 | The same choice appears three times: intent tab → "Mode: …" dropdown → "Tindakan cepat" chips | Jdg | Mod | `01-home-analisis--1440.png`, `02-home-dokumentasi--1440.png` | Three controls for one decision slow new users, and the chips repeat the dropdown | Keep the tabs and chips. Show the "Mode:" trigger only when a non-default template is active (it then works as a status line) |
| H-04 | Large dead zone between the headline and the composer | Jdg | Mod | `01-home-analisis--1440.png`, `05-empty-workspace--1440.png` | On a laptop the input sits near the bottom fold, and the screen looks unfinished | Above 760px, replace `margin-top:auto` on `.home-content > .composer-area` (`globals.css:678`) with a fixed `--space-6` (32px), so the composer follows the description instead of sinking to the bottom. Keep `.home-headline` `min-height` (`:677`) so switching tabs still doesn't shift the input |
| H-05 | Headlines are numbered "01 — … 04 —" for four parallel intents that are not a sequence; "Keputusan Lebih Tepat" is a performance claim | Jdg | Min | `01`–`04-home-*`; `src/lib/studio.ts:8-11` | The numbers suggest a workflow order that doesn't exist. The claim conflicts with the capsule's own "no guideline-validation claims" boundary | Drop the "0n —" prefix. Rephrase the headline as a task ("Analisis kasus klinis.") rather than an outcome promise |
| H-06 | Uppercase tracked micro-labels: TINDAKAN CEPAT, MULAI, ALUR KASUS, CLINICAL COCKPIT, WORKSPACE ANDA | Jdg | Min | `01-home-analisis--1440.png`, `19-clinical-cockpit--1440.png`, `30-mira-result-top--1440.png` | At 10px, uppercase is harder to read and adds chrome without information | Sentence case at 12px in `--color-text-secondary` |

### 3. Document Studio (local draft)

First impression: the document title and section headings lead, with the status pill and Dokumen/Sumber/Perubahan/Riwayat/Peninjauan tabs above. This is the strongest screen: provenance and review are visible and honestly labelled ("bukan validasi klinis"). The weakness is space. The composer stack below takes about 270 of 900px at 1440 and about 45% of the screen at 390.

| # | Finding | Type | Sev | Evidence | Why it matters | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| D-01 | In chat view the composer still carries the four intent tabs and the quick-action chips: about 270px of 900 at 1440, about 370px of 844 at 390 (tab row at y≈462 to the hint line at y≈830) | Obj (measured from screenshots) | Mod | `23-doc-studio-draft--390.png`, `23-doc-studio-draft--768.png`, `30-mira-result-top--1440.png` | Clinicians read and check the draft here. Less than half of a phone screen is left for the document | CSS only: `.chat-composer .intent-groups, .chat-composer .action-rail-wrap { display:none }` below 1200px. The "Mode:" trigger already allows switching |
| D-02 | Section "Edit", "Salin / Edit / Unduh" are 14px-tall text buttons | Obj | Crit (2.2 AA) | `dom-metrics.json` (`docstudio-390`); `23-doc-studio-draft--390.png` | These are the main actions on the document, and they're hard to hit on touch | `.text-button { min-height: 24px; padding-block: 5px }`. Use 32px inside `.studio-toolbar` |
| D-03 | Footer hint "Tinjau sebelum digunakan" at 2.17:1, 10px | Obj | Crit | axe on `23-doc-studio-draft--1440.png` | The one safety reminder on the document is the least readable text on screen | `--color-text-secondary`, 12px |
| D-04 | No `<h1>` in chat view; the brand `<span aria-label>` is ignored | Obj | Mod | axe `page-has-heading-one`, `aria-prohibited-attr` (19 shots) | Screen-reader users can't jump to the record; the label is dropped | Render the Encounter title in the header as `<h1>` (same style); add `role="img"` to `.message-header .brand` or remove its `aria-label` (there is visible text next to it) |
| D-05 | Placeholder sections fill the page: "Belum tersedia — lengkapi dan verifikasi oleh klinisi." repeats 4–6 times | Jdg | Min | `23-doc-studio-draft--768.png` | It hides the few filled sections | Collapse empty sections into one line, "Belum diisi: Assessment, Tata Laksana, …", each name linking to its editor |
| D-06 | The review checklist uses the word "Wajib", which follows house form rules | Obj | (works) | `27-doc-studio-review--1440.png` | — | Keep. Use the same pattern in the Pasien form (E-03) |

### 4. Case analysis (MIRA): In flux (Codex)

Captured at 1440 and 768 before the contract change: `29-mira-loading--*`, `29b-mira-loading-late--*`, `30`–`32-mira-result-*`, `33-mira-error--*`. Presentation findings only. Content and data mapping are not judged.

| # | Finding | Type | Sev | Evidence | Why it matters | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| M-01 | `<ol role="status">` in the thinking card breaks list semantics | Obj | Crit (1.3.1 A) | axe `listitem` + `aria-allowed-role`; `src/components/thinking-card.tsx` | Screen readers announce neither a list nor the progress | Wrap the list: `<div role="status" aria-live="polite"><ol>…</ol></div>` |
| M-02 | The step list advances on a 340ms timer ("Literatur dan pedoman klinis ditelusuri", "Bukti ilmiah sedang disintesis") that isn't tied to real progress | Jdg | Mod | `29-mira-loading--1440.png`, `29b-mira-loading-late--390.png`; `docs/sentrapedia-ui.md` "340 ms per langkah" | A clinician may believe guidelines were searched when the request is still pending, which over-claims in a clinical setting. The house rule allows progress display only when it is measured | Coordinate with Codex: show only steps the gateway confirms, or one honest status ("Menunggu analisis…") with a skeleton |
| M-03 | Error text "Analisis belum tersedia. Keluhan tetap tersedia." says what still works, but not what failed or what to do | Jdg | Min | `33-mira-error--1440.png` | Users don't know whether to retry or switch to Dokumentasi | Add the cause class (layanan tidak menjawab / respons ditolak) and one action, "Coba lagi" |
| M-04 | Result view: the "Alur kasus" rail sits in the right margin, away from the column it controls; the document strip is short (see D-01) | Jdg | Min | `30-mira-result-top--1440.png` | The eye jumps across 250px of empty canvas | Revisit after Codex lands. D-01 alone recovers most of the space |

### 5. Dialogs and pickers

First impression: consistent and recognisable. Every dialog has a 30px light title, a muted subtitle, and the 2px black rule. Command Center (`09`) and the slash picker (`08`) are fast and well signposted.

| # | Finding | Type | Sev | Evidence | Why it matters | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| E-01 | Slash picker and Command Center nest a `<button>` inside `role="option"` (144 nodes) | Obj | Crit (4.1.2 A) | axe `nested-interactive`; `composer.tsx:119`, `command-palette.tsx:30` | Screen readers announce each item twice or not at all; Tab order breaks the listbox model | Put `onClick` on the `role="option"` element itself, drop the inner `<button>`, keep `aria-activedescendant` on the input (the pattern `composer.tsx:86` uses for the Mode menu; that menu was never opened during the audit, so this is a code read, not an axe result) |
| E-02 | Command Center footer and `kbd` at 2.23:1 | Obj | Crit | axe on `09-command-center--1440.png` | The keyboard help is unreadable | `--color-text-muted` (4.97 on white) |
| E-03 | Pasien form: requirement shown by a "*" in accent ink only (`.required`, `globals.css:400`); submit stays disabled with no reason; leaving the empty name field shows no message | Obj | Mod | `15b-patient-form-submit-empty--1440.png`; `src/components/forms.tsx:19` | Users can't tell why "Buat Pasien" doesn't work | Replace `*` with "Wajib". Keep the button enabled; on submit, focus the name field, set `aria-invalid`, and show "Isi nama Pasien." under it |
| E-04 | Input borders are 1.27:1 against white | Obj | Mod (probable 1.4.11 failure) | `15-dialog-patient-form--1440.png`, `13-dialog-settings--1440.png` | Fields are hard to locate in bright clinic light | Add a `--workspace-control-border` token at about 3:1 (e.g. `#8a8f98`, 3.25:1 on white) for inputs only; keep `--color-border-subtle` for dividers |
| E-05 | Dialog backdrop uses `backdrop-filter: blur(4px)` | Jdg | Min | `09`–`22-dialog-*`; `globals.css:386` | It's a glass effect the Swiss pass otherwise avoids, and it costs GPU time on low-end clinic PCs | Remove the blur; `--workspace-overlay` alone separates the layers |
| E-06 | Work queue cards repeat Pasien, timestamp, "0 draf · Belum ada dokumen", a status select and an input per card | Jdg | Min | `11-dialog-work-queue--1440.png` | Cards are about 280px tall, so only two fit and scanning is slow | Collapse the select and input behind the card's title row; show the timestamp in the id-ID format (S-03) |
| E-07 | Command Center rows put a ↗ icon on every item, and category labels at 9–10px | Jdg | Min | `09-command-center--1440.png` | The icon adds no meaning, and the labels are hard to read | Remove the icon; set category labels to 11px secondary |

### 6. Clinical Cockpit and Focus Mode

| # | Finding | Type | Sev | Evidence | Why it matters | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| C-01 | Inactive tab "Timeline 4" fails contrast (4.36:1, 12px) | Obj | Crit | axe on `19-clinical-cockpit--1440.png` | — | Same token fix as S-01 |
| C-02 | The empty context message "Belum ada konteks. Tambahkan lewat Edit konteks." is set in link-coloured text but is not a link | Jdg | Min | `19-clinical-cockpit--1440.png` | Users click it and nothing happens | Make "Edit konteks" in the sentence the button, or set the sentence in `--color-text-secondary` |
| C-03 | Focus Mode cleanly removes navigation and panels | Obj | (works) | `20-focus-mode--1440.png` | — | Keep |

### 7. System states: empty, storage error, 404, loading

| # | Finding | Type | Sev | Evidence | Why it matters | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| Y-01 | A failed browser write shows a banner and a toast with the same text; the toast's glyph is a success **check** | Obj | Mod | `34-storage-write-error--1440.png`; `src/components/workspace.tsx` (toast always renders `<Check/>`) | A green check on "Perubahan belum tersimpan" tells the user the opposite of what happened | Pass a tone to `notify` and use an alert glyph for errors; skip the toast when the persistent banner is shown |
| Y-02 | The 404 is the default English Next.js page: no landmark, no way back | Obj | Mod | `06-not-found--1440.png`; axe `landmark-one-main`, `region` | It's a dead end in an otherwise Indonesian app | Add `src/app/not-found.tsx` inside `<main>`: "Halaman tidak ditemukan." plus a link back to the workspace |
| Y-03 | Empty workspace: "Belum ada Encounter" (11px, 4.36:1) without an action | Obj + Jdg | Crit (contrast) / Min (copy) | `05-empty-workspace--1440.png`, `05b-empty-workspace-nav--390.png` | First-run users get no next step | Fix the contrast (S-01) and add one action, "Mulai Encounter" |
| Y-04 | Missing favicon (404 in console) | Obj | Min | Lighthouse `errors-in-console` | Lowers best-practices to 96; the tab has no icon | Add `src/app/icon.png` from the approved logomark (`src/assets/sentra-logomark-approved-reference.png`) |
| S-07 | No dark mode. `sentra-tokens.css` ships a `[data-theme="dark"]` block, but nothing sets it, and the `:root` overrides in `globals.css` are light-only | Obj | Min | `src/app/globals.css:3-35`, `src/app/layout.tsx` | Clinicians on night shift get a bright UI. If dark is turned on later, the Tosca overrides won't re-resolve | Out of scope for now. If wanted, author a `[data-theme="dark"]` override block next to `:root` |

## Consistency table

| Element | Issue | Fix |
| --- | --- | --- |
| Type scale | 15 raw sizes (5–30px); 0 uses of `--font-size-*`; 10–12px make up most of the visible text (home 1440: 43 of 57 text nodes; Document Studio 390: 69 of 97) | Define 5 capsule tokens (`--fs-caption 11`, `--fs-label 12`, `--fs-body 14`, `--fs-title-section 18`, `--fs-title-page 30`), replace raw values, and set a 11px floor for text |
| Spacing | 293 of 401 spacing values off the 4px grid (5, 6, 7, 9, 10, 14, 18, 22px) | Map to `--space-1..6` from the existing snapshot; there is no visual reason for 7px vs 8px |
| Muted text | `--color-text-muted` passes on canvas (4.85) but fails on the sidebar surface (4.36); `--workspace-ink-faint` is used for text at about 2:1 | Rule: on `--color-background-surface` use `--color-text-secondary`; restrict `--workspace-ink-faint` to borders and icons |
| Dates | `en-US` 12-hour in Encounter titles, `id-ID` 24-hour WIB in the queue and timeline | One formatter (`studio.ts`) everywhere |
| Primary emphasis | Tosca fill on the active tab, mic, Send, primary buttons and the account avatar | Reserve fill for Send/primary and the active tab; the mic becomes a tool icon |
| Disabled state | Send keeps Tosca at 0.7 opacity; dialog primary ("Buat Pasien") keeps Tosca at reduced opacity; other buttons use `opacity:.5` | One disabled recipe: surface fill, secondary text, no opacity trick |
| Required fields | Pasien form uses "*", Document review uses "Wajib" | Use "Wajib" everywhere |
| Status feedback | Toast shows a check for both success and failure | Toast tone: success = check, error = alert glyph and `role="alert"` |
| Section labels | Some uppercase (TINDAKAN CEPAT), some sentence case (Ringkasan sumber, Status pekerjaan) | Sentence case everywhere |
| Text buttons | `.text-button` is 14px tall in the document, while `.button` is 36px elsewhere | `.text-button` min-height 24px |
| Motion | 18 durations; `--motion-duration-*` unused | Use `--motion-duration-fast` (90ms) and `-default` (160ms) plus one for the 320ms submenu |
| Documentation | `.agents/CONTEXT.md` and `docs/sentrapedia-ui.md` still say "Arial/Helvetica body" and a "rounded document canvas"; the code uses Geist + Plus Jakarta Sans and `border-radius:0` on `.main-canvas` | Update the two docs to the Chief type pair and the Swiss pass. Note that `next/font/google` needs network access at build time |

## Drift from the house system (information only, not defects)

The capsule is outside `packages/token/scope.txt`, and these choices are recorded as Chief/Gaffer decisions. They are listed so the trade-off stays visible if Sentrapedia ever joins the token gate.

| House rule (`packages/token/UI-RULES.md`) | Sentrapedia today | Recorded basis |
| --- | --- | --- |
| Archivo, one family, vendored, three weights | Plus Jakarta Sans 300 titles + Geist text through `next/font/google`; Helvetica wordmark | `layout.tsx` "Chief's type pair" |
| Vermilion `--color-accent` for chrome | Tosca `#40e0d0` for actions and chrome | `docs/sentrapedia-ui.md` |
| `--radius-structure: 0` for panels and surfaces | 2px on dialogs, cards, composer, chips | `globals.css` "Swiss pass … one sharp corner" |
| Buttons with a 3px solid ledge, no blur | Gradient relief with soft shadows on Send, mic, intent tabs | `globals.css:143-176` (Chief: "Kurangi neumorfisme") |
| 44px minimum target | 30–38px controls | none recorded |
| No uppercase tracked labels implied by the type rules; sentence case | Uppercase group labels | none recorded |
| Cards are not the default unit | Queue items and settings options are cards | none recorded |
| 12-column grid, column 8 empty | Single centred column (780px max) | none recorded |

## What works well (keep)

- **Colour discipline.** Every hex value sits in one `:root` block; components use only semantic variables; there are no `rgba()` literals, and tints are `color-mix()` on tokens (token scan).
- **One radius.** Every rounded element measures 2px (`dom-metrics.json`). No pills, no mixed curves.
- **Visible, high-contrast focus.** A 2px `#08786c` ring at 5.23:1 with offset (`42-focus-action-chip--1440.png`, `40-focus-composer--*`, `44-focus-in-dialog--*`).
- **Strong rules as structure.** The 2px black rule under the home greeting and every dialog title gives the app a recognisable signature without decoration (`09`, `13`, `15`).
- **Honest provenance in Document Studio.** Source, change, history and review tabs, the "bukan validasi klinis" disclaimer, and the "Wajib" checklist (`27-doc-studio-review--1440.png`).
- **Responsive without overflow.** No horizontal scroll at 390 (`dom-metrics.json`); the drawer has a scrim and an inert background (`07-nav-drawer--390.png`); dialogs fit the 390px screen with even margins and scroll internally (`12-dialog-knowledge--390.png`).
- **Labelled landmarks** on the main screen: `aside(Navigasi workspace)`, `nav(Navigasi utama)`, `main`, `header`, `footer`.
- **Error copy that says what still works.** The storage banner says what failed and the one action (export a backup) (`34`); the analysis error keeps the typed complaint (`33`).
- **Lighthouse mobile accessibility 100**, and Tosca fills carry dark text at 7.58:1.
- **Fast keyboard paths.** Command Center (Ctrl/Cmd+J), the slash picker, and Focus Mode are well signposted (`08`, `09`, `20`).

## Top 5 recommendations (user impact vs effort)

| Rank | Change | Impact | Effort | Findings |
| --- | --- | --- | --- | --- |
| 1 | **Fix the muted-text tokens.** On the sidebar surface, use `--color-text-secondary` for group titles, empty text and inactive tabs; stop using `--workspace-ink-faint` for text (`kbd`, "Tinjau sebelum digunakan", "Tambah tugas") | Clears every axe `color-contrast` failure (102 nodes) and lifts desktop Lighthouse from 91 | XS: about 6 CSS lines in `globals.css` | S-01, S-04, D-03, E-02, C-01, Y-03 |
| 2 | **Enlarge small targets.** `.small-icon` to at least 24×24 (prefer 32), `.text-button` min-height 24px (32 in the studio toolbar) | Reliable touch use of the per-Encounter menus and document actions; passes WCAG 2.2 2.5.8 and Lighthouse `target-size` | XS–S: CSS, check the sidebar row height | S-02, D-02 |
| 3 | **Fix picker semantics.** Remove the nested `<button>` inside `role="option"` in the slash picker and Command Center; wrap the thinking-card list in a status region | Screen-reader users can choose templates and commands; clears 4.1.2 and 1.3.1 failures | S: two components, an existing pattern at `composer.tsx:86` | E-01, M-01 |
| 4 | **Slim the chat-view composer.** Hide the intent tabs and quick chips in `.chat-composer` below 1200px | Gives back about 150–200px for reading the draft, the most frequent task in chat view | XS: two CSS selectors | D-01 |
| 5 | **One date format.** Build Encounter titles with the `id-ID` 24-hour WIB formatter already in `studio.ts` | Removes 10/08 vs 8/10 ambiguity on clinical records | XS: one line in `src/lib/workspace.ts:110` (new Encounters only) | S-03 |

Next in line: the disabled Send state (H-01, specificity fix), the toast tone (Y-01), the Pasien form "Wajib" and validation (E-03), and an Indonesian 404 (Y-02).

## Reproducing this audit

Scripts live in the session scratchpad (`capture.cjs`, `metrics.cjs`, `extra.cjs`), outside the repository. They need the dev server on port 3101, Playwright from the monorepo root, the installed Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`, and axe-core/Lighthouse installed in a scratch folder. Limitations: the "Mode: …" dropdown and the per-Encounter "…" options menu were not opened, so they have no screenshots or axe results; the 390 analysis result is missing (see Fingerprint). `next dev` rewrote `next-env.d.ts` (dev types path) when the server started; it was restored with `git restore` after the audit, so the tree is as found. `capture-log-*.txt` lists every captured file and the two non-blocking notes: Send is not reachable by Tab while disabled (expected), and "Berlangganan" is hidden on the home screen at all three widths, so the upgrade dialog was not captured.
