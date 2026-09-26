## Summary

<!-- One sentence describing what this PR does -->

**Type:** `feat` / `fix` / `content` / `style` / `refactor` / `docs` / `chore` / `perf`
**Scope:** `hero` / `sim` / `audrey` / `trajectory` / `services` / `insights` / `story` / `seo` / `config` / `build`

---

## Changes

<!-- List the specific changes made -->

-
-

Closes # <!-- issue number, if applicable -->

---

## Quality Checklist

- [ ] `npm run lint` — zero ESLint errors
- [ ] `npm run build` — zero TypeScript errors, build completes successfully
- [ ] Tested in browser — no console errors on page load
- [ ] All 14 landing sections render correctly

---

## Content Checklist

*Complete this section for any PR that modifies copy, articles, or demo data.*

- [ ] New clinical claims (statistics, accuracy metrics) have been reviewed and approved by Chief (Dr. Ferdi Iskandar)
- [ ] New article added to both `app/insights/data.ts` **and** `app/sitemap.ts`
- [ ] Demo data in `SentraSim`, `ClinicalTrajectory`, or `ClinicalPrognosis` has been reviewed for clinical plausibility
- [ ] `public/llms.txt` updated if product metrics or team information changed
- [ ] `app/layout.tsx` JSON-LD `featureList` updated if new features were added

---

## SEO Checklist

*Complete this section for any PR that adds pages, changes routes, or updates metadata.*

- [ ] New route added to `app/sitemap.ts` with correct `changeFrequency` and `priority`
- [ ] `<meta>` description updated in page `Metadata` export
- [ ] OG image added or updated if applicable (`opengraph-image.tsx`)

---

## Security Checklist

- [ ] No hardcoded secrets, API keys, or credentials
- [ ] No new external domains added to `next.config.mjs` `remotePatterns` without justification
- [ ] No changes to the `headers()` security configuration in `next.config.mjs` without review

---

## Code Conventions

- [ ] All new component files have `"use client";` as first directive
- [ ] All new files include brand signature: `// Architected and built by Drferdi.`
- [ ] No hardcoded colour values — all colours reference CSS custom properties from `app/globals.css`
- [ ] New navigation anchors added to `lib/site-links.ts`

---

## Screenshots

*For any PR with UI changes, include before and after screenshots.*

| Before | After |
|--------|-------|
| <!-- screenshot --> | <!-- screenshot --> |

---

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_
