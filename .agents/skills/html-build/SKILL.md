---
name: html-build
description: >-
  Migrate a static/captured HTML marketing page into a production Vite+React
  site with pixel-faithful design, then optionally rebrand and translate copy
  wave-by-wave. Use when the user says /html-build, "html-build", or asks to
  rebuild HTML into React without redesigning.
disable-model-invocation: true
---

# /html-build

Migrasi **teknologi**, bukan redesign. HTML (+ CSS + asset) asli = single source of truth visual.

Communicate in **Bahasa Indonesia**; address user as **Chief**. Keep code identifiers in English.

## Parse

Accept `/html-build <path> [options]`.

| Form | Meaning |
|------|---------|
| `/html-build` | Show usage |
| `/html-build D:\path\to\site` | Full migrate → runnable Vite+React |
| `/html-build <path> --rebrand <Brand>` | After migrate (or on existing build): replace copy wave-by-wave |
| `/html-build <path> --lang id` | Translate all visible UI copy to Bahasa Indonesia |
| `/html-build <path> --e2e` | Run migrate + rebrand + lang without stopping between waves |

If path is missing: `Usage: /html-build <path> [--rebrand <Brand>] [--lang id] [--e2e]`

## CRITICAL CONSTRAINTS (non-negotiable)

HTML asli adalah referensi absolut.

**DO NOT:**
- Rewrite / improve / translate copy (unless `--rebrand` / `--lang` explicitly requested)
- Redesign layout, colors, typography, spacing, radius, shadow, icons, images, hierarchy
- Replace assets; invent missing content; add/remove sections
- Rename buttons/menus for “clarity”
- Add Tailwind / MUI / Ant / Bootstrap if they risk visual drift
- Prefer React “best practice” over original look/behavior

**If React practice conflicts with original look → original wins.**

## Phase checklist

Copy and track:

```
html-build progress:
- [ ] 1 Audit (no edits)
- [ ] 2 Visual analysis
- [ ] 3 Tech choice + approval gate
- [ ] 4 Implement Vite+React
- [ ] 5 Responsiveness (original breakpoints only)
- [ ] 6 Visual + text validation
- [ ] 7 (opt) Rebrand waves
- [ ] 8 (opt) Bahasa Indonesia
- [ ] 9 Final report
```

---

### 1 — Audit (MUST finish before any edit)

1. List project tree; find main HTML.
2. Inventory CSS, JS, fonts, images, SVG, video.
3. Map sections, nav, forms, modals, carousels, tabs, animations, links.
4. Note broken/missing assets (404, `/_next/...`, missing video) — do not invent replacements.
5. Internal summary only; **no file edits yet**.

### 2 — Visual analysis

- Desktop / tablet / mobile from original CSS.
- Preserve layout hierarchy and class names.
- Do not “optimize” design.

### 3 — Tech choice

**Default (recommended):** Vite + React (JS unless TS is required), plain CSS / original stylesheets.

Approach for captured Next/Webflow/SSR HTML:
1. Archive untouched capture → `original/`
2. Copy assets → `public/assets/` (keep relative font `url(...)` working)
3. Strip runtime scripts that cannot run outside their framework (Next flight, broken chunks)
4. Split body into `src/html/<Section>.html` (verbatim markup)
5. Compose one balanced HTML string in `App` (`dangerouslySetInnerHTML` + `display: contents` wrapper if needed so unclosed outer wrappers stay valid)
6. Re-port only visible interactions (accordion, tabs, marquee, viewport CSS vars)

Present approach briefly; if Chief has not already approved this workflow, ask once for path/location then proceed under these defaults.

### 4 — Implement

- Modular section files; exact text + class names + assets.
- Preserve semantic tags when they do not change look.
- Keep original URLs unless `--rebrand` changes destinations.
- Forms: same labels, placeholders, validation structure.
- Animations: keep timing; if original JS is dead, approximate with CSS that does not change layout.
- Link original CSS from `index.html` / `public` — do not rewrite tokens.

### 5 — Responsiveness

- Use **existing** breakpoints/classes only.
- No new breakpoints unless original has none and mobile is broken (minimal fix; document it).

### 6 — Validate

Before declaring migrate done:
1. `npm run build` (or project equivalent) passes
2. Dev server runs; spot-check sections top→bottom
3. Visible-text inventory vs original: **0 unintended diffs** (unless rebrand/lang)
4. No console errors that break UI; no broken local images that exist on disk
5. Primary interactions work

### 7 — Rebrand (only with `--rebrand` or Chief request)

- **Text (+ href destinations) only.** Design/CSS/class/assets untouched.
- Work **wave-by-wave** (Header+Hero → Testimonials → Demo → … → Footer) unless `--e2e`.
- Log every change in `REBRAND.md`.
- Avoid false celebrity endorsements: if quotes change, also change attribution names (photos may wait for later image-swap).
- Prefer brand voice from Chief’s product docs when available.
- After each wave (non-e2e): short table before/after; ask to continue unless `--e2e`.

### 8 — Bahasa Indonesia (only with `--lang id`)

- Translate **all visible** UI strings (headings, body, CTAs, FAQ, alts, aria-labels, `lang="id"`).
- Keep product/tech terms when intentional: brand name, BYOK, Brief, LLM, sandbox, local-first, etc.
- Update dynamic strings in hooks (e.g. pricing toggle labels).
- Verify no leftover English CTAs/headings in `src/`.

### 9 — Final report

```markdown
1. Teknologi
2. File dibuat/diubah
3. Komponen / section modules
4. Interaksi yang dipertahankan
5. Validasi responsive
6. Konfirmasi: design tidak diubah; text status (asli / rebrand / ID)
7. Gap yang tidak 100% (missing assets, dead framework JS, deferred image-swap)
```

## Suggested tree

```
<site>/
  original/           # untouched capture
  public/assets/      # css, fonts, images
  src/
    html/             # verbatim section markup
    hooks/            # accordion, tabs, marquee, …
    lib/              # viewport CSS vars, …
    App.jsx
    main.jsx
  REBRAND.md          # if rebranding
  package.json
  vite.config.js
  index.html
```

## Anti-patterns

- Redesigning while “migrating”
- Loading broken Next/Webflow runtime chunks and calling it done
- Extra wrapper DOM that breaks flex/grid (prefer single composed HTML or `display: contents`)
- Translating/rebranding without being asked
- Stopping after scaffold only — deliver a **runnable** site
