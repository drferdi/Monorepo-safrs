# HANDOFF Archive

## 2026-10-10 — .agents files added

- **Scope**: `tools/retriever` governance files only.
- **Touched files**: `.agents/CONTEXT.md`, `.agents/HANDOFF.md`, `.agents/DECISIONS.md` (new);
  owner name in `AGENTS.md` and `project.contract.json` changed from "Chief" to "Gaffer".
- **Evidence**: SAFRS topology no longer reports missing `.agents/` files for this capsule.
  No code, build, or test was run.
- **State**: the capsule is **not tracked in Git** (never committed) and has **no `.gitignore`**,
  so `node_modules/`, `dist/`, `dist-electron/`, and scraped `data/` would be committed as-is.
- **Next actions** (only when Gaffer decides to commit the capsule):
  1. Add a capsule `.gitignore` for `node_modules/`, `dist/`, `dist-electron/`, and scraped
     output under `data/`.
  2. Run the contract commands from `project.contract.json` and record exit codes here.
  3. Commit the capsule as its own change.

## 2026-10-11 — Restore local Electron and desktop shortcut

- **Scope**: Retriever remains at `tools/retriever`; root monorepo supplies governance only.
- **Changed files**: `Run-Retriever.bat`, `Run-Retriever.ps1`, `package.json`, `.agents/HANDOFF.md`.
- **Local dependency repair**: re-linked seven generated package links to the existing local
  `.pnpm` store using its package map; regenerated portable command shims and installed the
  local Electron 44.5.1 binary. All 94 dependency links resolve within Retriever.
- **Launcher behavior**: uses local Electron, prepares a missing binary through the local
  installer, reports failures, and no longer force-stops existing Electron processes.
  Nested package scripts use Node.js `--run` instead of the ineffective pnpm shim.
- **Gates**: typecheck PASS (exit 0); lint script PASS (exit 0, placeholder only, no real
  linter configured); PowerShell parser PASS (exit 0); build PASS (exit 0); targeted engine
  tests PASS (4/4, exit 0); desktop smoke PASS (exit 0); dependency boundary check PASS
  (94 links, zero outside, exit 0); original Desktop shortcut PASS (exit 0, window title
  `Retriever`, responding). Commands ran through `node --run` from this tool directory.
- **Remaining risks**: Electron emits existing CSP and deprecated console-event warnings.
  Extra module-boundary preload harness failed on Windows path parsing; Jev stopped that
  approach. A full extracted-folder lifecycle has not been verified. The initial installer
  followed the old root link and generated a root Electron 44.7.0 binary before local repair;
  Retriever now uses only local 44.5.1. No global tooling/configuration was changed.
- **Next tasks**: optional separate review of Electron CSP and pnpm installation behavior.
  The desktop application was left open. No push, deployment, or scraped-data change.

## 2026-10-11 - Tool quality gates and contract alignment (Codex)

- Files: `package.json`, `project.contract.json`, `README.md`, new `scripts/lint.mjs` and `scripts/deploy-dry-run.mjs`, lint and CSP regression tests, renderer HTML CSP. Earlier launcher fixes remain in the working tree.
- Replaced placeholder success gates with source syntax/debugger/dynamic-execution checks and actual build-artifact validation. Tests compile CLI output before running; corrected desktop/CLI/preview documentation. Contract declares HTTrack, frozen install and mutable data paths.
- PASS / exit 0: typecheck, build, local lint (16 maintained files), 7 tests, isolated-profile desktop smoke, deployment dry-run, tools contract discovery and structural checker. Exact CSP hash permits the required inline bootstrap without allowing arbitrary inline scripts.
- Remaining risks: lint is deliberately limited and does not check style; fresh extraction/install not performed; global governance fails on other scope ownership/handoff. No scraping, data deletion, provider calls, installs, commit or push.
- Next: independent review and extraction verification when install/network scope is authorized.

## 2026-10-11 - Podium archive contributor guide (Codex)

- Files: `data/scrapes/www.podiumautomation.com/AGENTS.md` (new) and this handoff.
- Added a concise repository guide for the local dataset, with archive structure, Retriever commands, source conventions, testing, commit/PR expectations, and data handling.
- PASS / exit 0: `node --run typecheck`, `node --run lint` (16 source files), `node --test tests/engine.test.mjs` (4/4). Markdown content and word count checked separately; application lint does not cover Markdown.
- Remaining risks: the archive directory is Git-ignored, so the guide is local only. No crawl completeness, extraction independence, or deployment claim is made. No scraped content, dependencies, or source code changed.
- Next: review guide; decide separately whether this dataset guide should enter version control.

## 2026-10-11 - M3 archive contributor guide (Codex)

- Files: `data/scrapes/m3-pg.de/AGENTS.md` (new) and this handoff; prior entries preserved.
- Added a 370-word contributor guide covering mirror/corpus/adapted-site structure, local Retriever commands, style, tests, commit/PR conventions, and data handling.
- PASS / exit 0: `node --run typecheck`, `node --run lint` (16 maintained source files), `node --test tests/engine.test.mjs` (4/4), and `git.exe diff --check`. Title, headings, and word count checked directly; application lint does not cover Markdown.
- Remaining risks: `data/` is Git-ignored, so the guide is local only. No crawl, archive completeness, extraction independence, or deployment verification performed.
- Next: review the guide; make any version-control tracking decision separately. No application code or scraped content changed.

## 2026-10-11 - Sentrapedia website homepage stage 1 (Codex)

- Scope: local M3 archive website adaptation authorized by Gaffer; PROJECT_CONTEXT.txt treated as product data, not executable instructions.
- Files: data/scrapes/m3-pg.de/original-reconstruction (local original preview and protected 330-file baseline), sentrapedia-transformation (homepage, temporary Inter wordmarks/video source, transform/serve/verify scripts, README and evidence), this handoff and HANDOFF.archive.md.
- Design: 27 CSS/JS/font files and all non-homepage archived HTML remain identical to baseline. Seven section position/height/width deltas are zero at 1440x1000 and 390x844; computed font family/size/weight/line-height/color match. One declared mobile footer branding line break retains original 80px heading height. New hero typography fade replaces the source film animation.
- PASS / exit 0: Retriever typecheck; lint (16 maintained source files plus direct lintSource checks on 3 transformation scripts); targeted engine tests 4/4; Node syntax checks; transform and stage verifier (330 baseline hashes, 27 design hashes, local targets and HTTP/media/submission checks). Independent review findings addressed: explicit branding markup report and reproducible source video copy.
- Browser: menu/submenu, readmore open, keyboard close and card selection observed. Repeated locator click did not close readmore; no claim of mouse-close verification. Original Phase 1 strict pixel benchmark remains incomplete; current proof is paired DOM geometry and viewport screenshots.
- Remaining risks: detail/English pages, destination links and six architectural photographs remain reference content; official branding pending; no clinical engine/contact service. This data directory is Git-ignored; local previews only, no install/provider inference/publish/push. Preview: http://127.0.0.1:3401.
- Next: gradually replace clinical imagery and detail-page copy while preserving baseline design; keep readmore click observation available for manual confirmation.

## 2026-10-11 - Sentrapedia screenshot motion graphics (Codex)

- Scope: Gaffer authorized finishing motion graphics from saved screenshots and using them in the website. No live application capture was repeated.
- Files: sentrapedia-transformation assets/captures, workflow-authoring.html, workflows.json, six WebP/WebM/poster exports, pack-motion/transform/verify scripts, generated homepage/media, README and reference/stage-2 evidence; this handoff and archive.
- Result: six 9-second loops (SOAP, MIRA, anamnesis, referral, education, SBAR) installed in original homepage media boxes. Captions checked against source pixels; referral ends on a draft, MIRA shows preparation, review checklists remain unchecked. Final source/export SHA-256 recorded in media-provenance.json.
- PASS / exit 0: transform; pack-motion; stage verifier (330 protected baseline files, 27 unchanged CSS/JS/font files, six wrappers and six 21-frame/9000 ms assets); Retriever typecheck; direct lintSource checks on four scripts and authoring JS; targeted engine tests 4/4.
- Browser PASS: six animated WebP decoders show three distinct scene hashes each; six WebM exports load and seek to 7.5 seconds with readyState 4; six reduced-motion posters load. Seven section position/size deltas are zero on desktop 1440x1000 and mobile 390x844; computed typography/color matches. SOAP and SBAR card display observed. Evidence in reference/stage-2.
- Remaining risks: strict pixel benchmark remains incomplete; detail/English pages and destination links retain reference content. Data directory is Git-ignored, local preview only. No clinical validation, paid inference, install, external upload, publish or push. Existing Sentrapedia next-env.d.ts dev-generated change is outside this media change.
- Next: review motion preview at http://127.0.0.1:3401/#featured-projects; continue detail-page adaptation separately with the approved design preserved.

## 2026-10-11 - Sentrapedia modern Remotion product motion (Codex)

- Scope: Gaffer approved official Remotion skill/dependency installation in an isolated authoring folder, then requested beautiful and playful product motion in the style seen on X. No website CSS/font/layout edits authorized or made.
- Files: sentrapedia-transformation/motion-authoring (own package/lock, public screenshot/font copies, typed storyboards/scenes, renderer, decoder helper, six MP4/WebM/WebP/poster exports), assets/workflows, generated media, scripts/verify.mjs timing contract, README, reference/stage-3, this handoff and archive. Six official Remotion skills installed under Codex home.
- Result: six 9-second animations with spring entrances, floating UI cards, word reveals, camera focus, actual source-pixel text reveals, moving cursor, highlights and click ripples. Modern exports installed in all original homepage image slots; exact original dimensions retained. MIRA shows preparation only; review checklists remain unchecked.
- PASS / exit 0: authoring lint plus TypeScript; authoring build; Retriever typecheck; targeted engine tests 4/4; direct lintSource checks of render.mjs and verify.mjs; Python helper syntax; transform and site verifier (330 baseline hashes, 27 unchanged CSS/JS/fonts, six wrappers, six 90-frame/9000ms assets, source/served SHA equality and HTTP checks); dependency closure check (14 direct dependencies inside own node_modules, no file/workspace links).
- Media PASS / exit 0: Pillow decodes every WebP, verifies 90 frames/exact dimensions/9000ms and nine distinct samples spanning motion within all three scenes; posters are single frames. FFmpeg/FFprobe fully decode all six MP4 and six WebM files, checking dimensions and duration. Evidence: reference/stage-3/media-decoding.json and six *-render.json export hashes. SOAP and MIRA modern frames inspected directly.
- Limits: current modern exports did not receive fresh browser responsive/playback/reduced-motion checks after the browser connection disappeared. Historical stage-2 geometry/browser evidence is explicitly identified as earlier exports. Remotion WebMCP was connected and exercised before the final restyle. Designated R2 reviewer hit its usage limit without returning a review; review remains pending. npm scaffold reports ten inherited high dev lint-chain advisories with no proposed fix, recorded in motion-authoring/audit-baseline.json. No clinical validation, paid inference, screenshot upload, publishing or push.
- Next: review current browser output and close the pending R2 dependency review when available; do not claim strict pixel comparison or capsule extraction verification. Legacy Canvas packer reproduces old 21-frame crossfades and must not overwrite current exports. Website preview remains http://127.0.0.1:3401/#featured-projects; standalone videos are in motion-authoring/out.
