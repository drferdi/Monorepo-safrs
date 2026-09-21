# Context: Portfolio Dr. Novia

## Metadata
- Slug: portfolio-drnovia
- Created: 2025 (TBD exact date from git history)
- Lead Agent: Cursor (manual build, no shared packages)
- Domain: corporate / portfolio website
- Status: active
- Priority: p2
- Location: `projects/corporate/portfolio-drnovia/`
- Port: 4173
- Human Owner: Chief (dr. Ferdi Iskandar)

## Objective

Portfolio Dr. Novia is a standalone portfolio website for Dr. Novia Anggraini. It is a React 18 rebuild of a visual composition originally created in Framer, with strict requirements to preserve the original design while fixing runtime issues and ensuring reliable scroll behavior.

The project serves two purposes:
1. **Deliver a functional portfolio website** for Dr. Novia Anggraini that accurately represents her professional identity and work
2. **Demonstrate an alternative Sentra architecture pattern** — a completely standalone, dependency-free capsule that requires no package manager, no build toolchain orchestration, and no shared monorepo packages

Success criteria:
- Visual fidelity: 100% match to original Framer composition (colors, typography, spacing, section order, animations)
- Scroll reliability: smooth, consistent scroll behavior across Chrome, Firefox, Safari, and Edge
- Build determinism: identical `dist/` output for identical source input (reproducible builds)
- Deployment simplicity: single command `node server.js` serves production-ready site
- Performance: Lighthouse score > 90 for all categories on desktop and mobile

## Architecture Overview

Portfolio Dr. Novia uses a radically different architecture from other Sentra capsules. It is intentionally standalone — a rejection of the monorepo shared-package model in favor of simplicity and reproducibility.

### Technology Stack
| Layer | Technology | Purpose | Notes |
|-------|-----------|---------|-------|
| Framework | React 18 (vendored) | UI component framework | No npm install required; React bundled in `vendor/` directory |
| Scroll | Lenis 1.3.26 (vendored) | Smooth scroll with inertia | Custom integration: attached to `.framer-bpy7lj` DOM node, NEVER window-level |
| Motion | GSAP (optional) | Visual animations and transitions | Enhances but never owns scroll; strictly visual-only |
| Styling | CSS (original Framer CSS + scoped fixes) | Visual presentation | `styles/framer.css` = original composition baseline; `styles/novia.css` = scoped overrides |
| Build | Custom Node.js script | Deterministic static build | `node scripts/build.mjs` produces `dist/` |
| Server | Node.js static server | Production serving | `node server.js` on port 4173 |
| Container | Docker | Deployment packaging | Pinned base image via Dockerfile |

### Critical Architecture Constraints

1. **Framer Composition Preservation**
   - The original Framer visual composition (layout, CSS class names, asset references, section order) is the canonical design baseline
   - No redesign of colors, typography, spacing, or section order is permitted
   - `styles/framer.css` contains the original composition styling and must not be broadly rewritten
   - `styles/novia.css` contains scoped fixes for runtime issues and is the only permitted modification surface

2. **Lenis Scroll Attachment**
   - Lenis smooth scroll MUST be attached to the `.framer-bpy7lj` DOM node (the nested Content-Wrapper)
   - Window-level Lenis attachment breaks scroll behavior on this composition
   - The `.framer-bpy7lj` node is the scroll container that owns overflow
   - Native scroll fallback must function correctly if Lenis is unavailable (e.g., `prefers-reduced-motion: reduce`)

3. **GSAP as Visual Enhancement Only**
   - GSAP animations are strictly visual-only enhancements
   - GSAP must never own, intercept, or modify scroll behavior
   - GSAP animations must respect `prefers-reduced-motion: reduce` (disable or simplify)

4. **No Package Manager Dependency**
   - No `package.json`, no `pnpm install`, no `node_modules`
   - All dependencies (React, Lenis, GSAP) are vendored in `vendor/` or `lib/` directories
   - Build is deterministic: identical source produces identical `dist/`
   - No lockfile, no Turbo, no Biome — intentional simplicity

### Build Pipeline
```
src/
  app.js              → React mount, Lenis initialization, anchor behavior
  portfolio-markup.js  → Preserved portfolio markup structure
  components/          → React components (if any)
styles/
  framer.css           → Original Framer composition CSS (DO NOT REWRITE)
  novia.css            → Scoped fixes and overrides (safe to modify)
vendor/
  react.development.js  → Vendored React 18
  react-dom.development.js → Vendored ReactDOM 18
  lenis-1.3.26.js      → Vendored Lenis
  gsap.min.js          → Vendored GSAP (optional)
scripts/
  build.mjs            → Deterministic build script
server.js              → Static server for production
docs/
  quickstart.md         → Shortest path: clone → working portfolio
```

## Key Decisions

| Date | Decision | Rationale | Owner | Impact | Status |
|------|----------|-----------|-------|--------|--------|
| 2025 | Vendored React 18 | Eliminates package manager dependency, version drift, and supply-chain risks. Guarantees reproducible builds across environments. | Chief | Dependency model | Enforced |
| 2025 | Preserve Framer composition | Visual identity was already finalized and approved by Dr. Novia. Redesign risks client dissatisfaction and timeline extension. | Chief | Design scope | Enforced |
| 2025 | Lenis on `.framer-bpy7lj` | Discovered through extensive debugging that window-level Lenis attachment breaks scroll on this specific Framer composition structure. The Content-Wrapper node must own overflow. | Chief | Scroll behavior | Enforced |
| 2025 | No lockfile / no Turbo / no Biome | Intentional simplicity for a single-page portfolio. Build toolchain overhead exceeds value for a static site with < 50 components. | Chief | Tooling scope | Enforced |
| 2025 | Scoped CSS fixes only | `styles/novia.css` is the designated modification surface. `styles/framer.css` preservation ensures Framer composition integrity. | Chief | CSS maintainability | Enforced |

## Current Focus

### Active Development Streams (as of 2026-09-14)

1. Scroll and Runtime Stabilization
   - Verify Lenis smooth scroll consistency across all major browsers
   - Test native scroll fallback with `prefers-reduced-motion: reduce`
   - Validate scroll behavior on mobile devices (touch scrolling)
   - Fix any remaining runtime errors in console

2. Build Pipeline Determinism
   - Ensure `node scripts/build.mjs` produces identical `dist/` for identical source
   - Verify all assets (images, fonts, videos) are correctly copied to `dist/`
   - Test `dist/` by running `node server.js` and verifying functionality

3. Asset Optimization
   - Image compression without visual quality loss (WebP generation)
   - Video re-encoding for web delivery (MP4, reasonable bitrate)
   - Font subsetting if using custom fonts (reduce file size)
   - Lazy loading for below-the-fold images and videos

4. Deployment Preparation
   - Docker image build and test
   - Hosting platform selection and setup (Netlify, Vercel, or VPS)
   - Domain configuration for Dr. Novia
   - SSL certificate setup
   - Performance testing: Lighthouse audit target > 90 all categories

## Blockers & Dependencies

| # | Blocker | Severity | Dependency | ETA | Owner | Impact if Unresolved | Mitigation |
|---|---------|----------|------------|-----|-------|---------------------|------------|
| 1 | Hosting and domain setup | High | Domain registration and hosting platform account | TBD | Chief | Website inaccessible to public; portfolio cannot be shared | Evaluate Netlify (free tier sufficient), Vercel, or existing Hostinger account |
| 2 | Asset optimization | Medium | Image/video compression tools and processing time | TBD | Chief | Large assets cause slow initial page load; poor Lighthouse score | Batch process with Sharp (images) and FFmpeg (video); automate in build script |
| 3 | Browser compatibility validation | Medium | Access to Chrome, Firefox, Safari, Edge for manual testing | TBD | Chief | Scroll or layout issues in specific browsers damage professional impression | Use BrowserStack or similar for cross-browser testing; prioritize Chrome and Safari |
| 4 | Mobile responsiveness | Medium | Framer composition may not be inherently responsive | TBD | Chief | Poor mobile experience reduces professional credibility | Add responsive breakpoints in `styles/novia.css`; test on actual mobile devices |

## Related Projects

| Project | Relationship | Data Flow | Notes |
|---------|-------------|-----------|-------|
| [Golden Path](golden-path.context.md) | Architectural contrast | None | Dr. Novia uses standalone vendored approach; Golden Path uses full @safrs/* monorepo stack. Both are valid Sentra patterns for different use cases. |
| [SentraBot](sentrabot.context.md) | No direct dependency | None | Different domain (healthcare vs. corporate portfolio) and architecture (monorepo native vs. standalone). |
| [Avery](avery.context.md) | No direct dependency | None | Different domain and architecture. |
| [Control Center](control-center.context.md) | Monitored service (future) | Dr. Novia will expose health endpoint -> Control Center | Low priority monitoring for a static site (HTTP 200 check sufficient). |

## Session Log

| # | Date | Agent | Mode | Summary | Outcomes |
|---|------|-------|------|---------|----------|
| 001 | 2026-09-14 | Vida (external) | Observation | Discovered during workspace scan as corporate capsule | Confirmed standalone architecture; no shared packages; vendored dependencies |

## Knowledge Base

### Key Documents

| # | Document | Path | Type | Sensitivity | Last Modified |
|---|----------|------|------|-----------|---------------|
| 1 | Dr. Novia README | `projects/corporate/portfolio-drnovia/README.md` | Product | Internal | 2025 |
| 2 | Dr. Novia AGENTS.md | `projects/corporate/portfolio-drnovia/AGENTS.md` | Governance | Internal | 2025 |
| 3 | Quickstart Guide | `projects/corporate/portfolio-drnovia/docs/quickstart.md` | Documentation | Internal | 2025 |

### Extracted Insights

- **Two Architectures, One Monorepo**: The existence of both Dr. Novia (standalone vendored) and Golden Path (full SAFRS stack) within the same monorepo demonstrates Sentra's architectural flexibility. Not every project requires the full monorepo toolchain. The decision matrix should be: standalone for simple/static sites, SAFRS for complex/dynamic products.
- **Framer Preservation Pattern**: The strict Framer composition preservation rules (`styles/framer.css` untouchable, `styles/novia.css` as fix surface) is a pattern that may apply to other client projects where design was finalized in a design tool before handoff.
- **Vendored Dependencies as Risk Mitigation**: Vendoring React, Lenis, and GSAP eliminates supply-chain attacks (e.g., malicious npm packages), version drift, and "works on my machine" issues. The tradeoff is manual update effort and larger repository size.
