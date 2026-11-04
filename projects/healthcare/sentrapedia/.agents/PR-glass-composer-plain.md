# PR text: fix/sentrapedia-glass-composer-plain-2026-11-04 → main

**Title:** The composer is one text box like Glass: the case strip and the case guide are gone

## Why

After PR #41 shipped the Glass workspace, Gaffer saw the running app and pointed at the two parts that are not in Glass: the guide under the composer ("Tanda bahaya", "Pertanyaan penting", "Kelengkapan kasus", "Susunan SOAP") and the L/P, Usia, TD, Nadi, Suhu, RR, SpO₂ strip with its toggle. Both are removed.

## What changed

- `src/components/composer.tsx`: no `CaseStrip`, no strip toggle, no `<CaseGuide>`; the `caseFields`, `autoFields`, `onCaseField`, `patientAge`, `patientSex` props are gone. The minimum-data line under the box stays.
- `src/components/workspace.tsx`: no manual-field state; `readCaseFields` on the typed text still feeds demographics and vitals into the sent case, and `missingMinimum` still gates the analysis.
- `src/components/case-guide.tsx` deleted; the strip/guide CSS blocks pruned from `globals.css`.
- Spec amended in place; decision in `.agents/DECISIONS.md` (2026-11-04); handoff entry added.

## Tests

- New `tests/ui/composer-plain.test.tsx` (3 cases, written RED first): text-only parsing and sending of age, sex and vitals; the missing-minimum alert with nothing sent; the `/` picker focus.
- `tests/ui/case-strip.test.tsx` and `tests/ui/case-guide.test.tsx` deleted; three strip cases in `chip-row` folded into one; two guide-dependent cases dropped from `tests/ui/normal-exam.test.tsx` (the lib test covers the template).

## Verification

`npx tsc --noEmit` 0 · eslint 0 errors (three pre-existing warnings) · Vitest 60 files / 638 tests · `npm run test:system` 67/67 · preview on port 3106: no strip, no guide, the alert names "Usia, Jenis kelamin, Tanda vital", a full case sends `POST /api/aadi`.

Risk tier R1 (UI behaviour inside the capsule; no auth, data or external-system change).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
