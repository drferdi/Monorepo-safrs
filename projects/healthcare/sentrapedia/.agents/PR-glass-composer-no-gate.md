# PR text: fix/sentrapedia-glass-composer-no-gate-2026-11-04 → main

**Title:** No minimum-data gate before an analysis, like Glass

Builds on `fix/sentrapedia-glass-composer-plain-2026-11-04` (the plain composer); opened against `main` it carries both.

## Why

After the strip and the guide were removed, the composer still answered a bare complaint with "Analisis belum dijalankan. Lengkapi data minimal: Usia, Jenis kelamin, Tanda vital." Glass never holds a question back: it answers with what it has and names what is missing in the answer. The engine contract never required those fields (`isValidCase` needs only a chief complaint), and the report already lists "Data yang perlu dilengkapi" from `missingInformation`. The gate was a UI rule from 2026-10-21, now reversed.

## What changed

- `src/components/workspace.tsx`: `generate()` sends the case as typed; the `minimumBlocked` state is gone. `readCaseFields` still fills demographics and vitals from the text when present.
- `src/components/composer.tsx`: the `minimumMissing` prop and its alert are gone.
- `src/lib/soap.ts` and `tests/soap.test.ts` deleted: every export was dead once the guide left.
- Spec amended; decision in `.agents/DECISIONS.md` (2026-11-04, no minimum-data gate); handoff entry added.

## Tests

`tests/ui/composer-plain.test.tsx` case 2 rewritten RED first: a bare complaint produces one POST with `ageYears: null`, `sex: "unknown"`, empty vitals, and no alert.

## Verification

`npx tsc --noEmit` 0 · eslint 0 errors (three pre-existing warnings) · Vitest 59 files / 629 tests · `npm run test:system` 67/67 · preview on port 3106: "Nyeri kepala hebat sejak 2 jam" alone sends `POST /api/aadi` with no alert.

Not verified: the real engine's answer to a case with no age; a refusal there surfaces as the existing analysis error.

Risk tier R1.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
