# Refactor DOM Handler Dedup Spec

Tanggal: 2026-06-18

## Rule

Do not change selector order or fallback semantics unless a failing test proves the current order is wrong.

## Current Behavior

- `lib/handlers/page-anamnesa.ts` fills anamnesis fields and autocomplete fields.
- `lib/handlers/page-diagnosa.ts` fills diagnosis fields, doctor and nurse fields, prognosis, chronic flags, and fallback selectors.
- `lib/handlers/page-resep.ts` fills static fields, medication rows, autocomplete fields, and scrapes prescription rows.

## Structural Improvement

Extract shared utilities only after tests cover the current selector behavior:

| New module | Responsibility |
| --- | --- |
| `lib/handlers/dom-field-resolution.ts` | visible element lookup and selector attempt metadata |
| `lib/handlers/fill-result-builder.ts` | consistent `mapped`, `skipped`, and reason-code assembly |
| `lib/handlers/autocomplete-fill.ts` | shared autocomplete wait and retry behavior |

## Acceptance Checklist

Lock the current selector behavior before extraction:

- Selector order remains stable.
- Hidden, disabled, and readOnly elements are skipped the same way.
- Temporary `data-sentra-target` tokens are unique, cleaned up, and do not collide.
- Resep fallback remains row-scoped; generic/global fallback only targets the first row where current tests require it.
- Dokter and perawat autocomplete skip semantics remain unchanged.
- Prognosa and chronic checkbox fallback behavior remains unchanged.
- Scrape resep output shape and skipped/failed/mapped semantics remain unchanged.

## Shared-vs-Page-Specific Boundaries

- `dom-field-resolution` may own visible lookup, selector attempt metadata, duplicate selector handling, and grouped selector splitting only if behavior is covered by tests.
- `autocomplete-fill` may own common wait/retry/select mechanics.
- Keep page-specific: diagnosa aggressive search, staff input ranking, chronic checkbox lookup, resep row selection/add-row/scrape, medication candidate ranking, and anamnesa field semantics.

## Safety Invariants

- Grouped comma selectors preserve existing per-selector and DOM-order behavior.
- Duplicate selectors remain harmless.
- jsdom/browser visibility differences must be tested before changing the visibility helper.
- Temporary `data-sentra-target` cleanup must happen on success and failure paths.

## Validation

- Add parity/golden tests before dedup for `success`, `failed`, `skipped`, reason-code assembly, selector attempt metadata, and fallback ordering across `lib/handlers/page-anamnesa.ts`, `lib/handlers/page-diagnosa.ts`, and `lib/handlers/page-resep.ts`.
- `npm run test -- lib/handlers/page-anamnesa.test.ts lib/handlers/page-diagnosa.test.ts lib/handlers/page-resep.test.ts data/field-mappings.resep.test.ts`
- After actual helper extraction, run `npm run test:e2e` only with explicit fixtures and assertions that target the extracted selector, autocomplete, and fallback behavior.
- `npm run typecheck`
- `npm run lint`
