# Roadmap — Sentra AI (sentra-main)

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_

---

## Active — Q1 2026

### Performance
- [ ] Lazy-load `SentraSim` (57.1 KB) + `ClinicalTrajectory` (27.5 KB) + `ClinicalPrognosis` (28.5 KB) via `next/dynamic` — these three components account for ~113 KB of the initial client bundle
- [ ] `@next/bundle-analyzer` integration for ongoing bundle regression monitoring

### Features
- [ ] Wire `ClinicalPrognosis` component into the landing page section sequence (component is complete — not yet added to `app/page.tsx`)
- [ ] Per-page Open Graph metadata for `/story` and `/insights/[slug]` (currently inheriting root layout metadata)

### Content
- [ ] Publish additional Insights articles — target: 5 total (3 published at v1.0.0)

---

## Q2 2026

### Testing
- [ ] End-to-end test suite with Playwright — verify all 14 landing sections render, all anchor navigation works, and `/insights/[slug]` resolves correctly for all published articles
- [ ] Visual regression testing for animation-heavy components (`SentraSim`, `Hero` phases)

### Observability
- [ ] OpenTelemetry SDK integration for Core Web Vitals (LCP, CLS, FID/INP) reporting

### Architecture
- [ ] Evaluate RSC migration for static-only sections (`About`, `Footer`, `FAQ`) to reduce client JS shipped to browser
- [ ] Nonce-based Content Security Policy to eliminate `unsafe-inline` and `unsafe-eval` from CSP

### Content
- [ ] Dedicated service detail pages: `/services/[service-id]` — one page per each of the 7 clinical protocols
- [ ] Case study section: documented pilot results from RSIA Melinda DHAI and Puskesmas Balowerti

---

## Q3 2026

### Internationalisation
- [ ] English language variant (`/en`) for international partners and investors

### Integrations
- [ ] Interactive Sentra platform demo (sandboxed embed or iframe from dashboard)
- [ ] Newsletter signup integration

### Accessibility
- [ ] WCAG 2.1 AA audit and remediation — focus on animation-heavy sections (motion preference support, keyboard navigation for `SentraSim`)

---

## Backlog (No Fixed ETA)

- [ ] Dark / light mode toggle — currently dark-only (`--sentra-bg: #0d0d0d`)
- [ ] Progressive Web App (PWA) manifest for installability
- [ ] Product demo video — add `public/*.mp4` + `<video>` when a shipped asset is ready (no demo file in repo today)

---

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_
