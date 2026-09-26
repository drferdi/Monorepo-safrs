# Refactor Inventory

Tanggal: 2026-06-18
Scope: behavior-preserving modernization for Med Assist.

## Baseline Checks

| Check              | Command             | Result                                     |
| ------------------ | ------------------- | ------------------------------------------ |
| TypeScript         | `npm run typecheck` | Pass on initial probe                      |
| ESLint             | `npm run lint`      | Pass on initial probe                      |
| Unit/runtime tests | `npm run test`      | Pass on initial probe: 46 files, 327 tests |

## Dirty Worktree Guard

These files had pre-existing changes before refactor planning:

- `components/clinical/ClinicalDifferential.tsx`
- `entrypoints/background.ts`
- `entrypoints/content.ts`
- `utils/types.ts`
- `components/clinical/ClinicalDifferential.autoselect.test.tsx`
- `tests/runtime/background.exec-scrape.test.ts`
- `tests/runtime/content.exec-scrape.test.ts`

Do not revert, stash, reset, or overwrite these changes. Read before editing.

## Oversized Modules

| File                                           | Approx lines | Current behavior                                                                      | Refactor direction                                                |
| ---------------------------------------------- | -----------: | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `components/clinical/TTVInferenceUI.tsx`       |         3267 | TTV form, alerts, canonical triage, doctor consult, render                            | Extract pure helpers and local hooks first                        |
| `components/clinical/ClinicalDifferential.tsx` |         2463 | Differential UI, therapy state, transfer state, fallback diagnoses                    | Extract helper module and transfer view model                     |
| `entrypoints/background.ts`                    |         1945 | Service worker route registration, bridge sync, tab injection, transfer orchestration | Split route registrars by message group                           |
| `lib/emergency-detector/clinical-patterns.ts`  |         1803 | Clinical pattern registry                                                             | Split registry data from query helpers only if tests cover output |
| `lib/handlers/page-resep.ts`                   |         1392 | DOM fill and scrape logic for resep page                                              | Extract field resolution helpers                                  |
| `lib/handlers/page-diagnosa.ts`                |         1259 | DOM fill logic for diagnosa page                                                      | Share selector and result helpers                                 |
| `lib/api/bridge-client.ts`                     |         1234 | Bridge config, readiness, schema guards, consult, sync, canonical evaluate            | Split internals behind stable facade                              |
| `components/clinical/ClinicalTrajectory.tsx`   |         1204 | Trajectory fetch, chart, canonical fallback, render                                   | Extract chart config and format helpers                           |
| `lib/api/sentra-api.ts`                        |         1136 | CDSS API facade and local fallback                                                    | Split only after prescription parity tests cover fallback pathway |
| `entrypoints/sidepanel/style.css`              |         5537 | Global sidepanel styling                                                              | Split by surface with screenshot parity                           |

## Stale Or Dead Candidates

| Candidate                           | Evidence from initial probe                                                                  | Action                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `lib/settings-store.ts`             | Only self-references for `useSettingsStore`, `PiecesSettings`, and `sentra-settings-storage` | Safe deletion candidate after import proof          |
| `@pieces.app/pieces-os-client`      | Only appears in `package.json` and lockfile                                                  | Separate dependency removal migration               |
| `components/cdss/*`                 | Exported and internally linked, not mounted in sidepanel                                     | Public-hold until product decision                  |
| `components/clinical/ResepForm.tsx` | Exported component with no runtime mount found in initial probe                              | Public-hold until import proof and product decision |
| Auto-generated doc comments         | 231 generated doc-comment markers found                                                      | Cleanup only when touching nearby code              |

## Duplicated Or Parallel Paths

- Message paths: `@webext-core/messaging`, raw `chrome.runtime.sendMessage`, raw `chrome.tabs.sendMessage`, and `window.postMessage`.
- Storage paths: `utils/storage.ts`, `lib/store.ts`, `lib/settings-store.ts`, `lib/theme-store.ts`, `lib/api/auth-store.ts`, `lib/api/bridge-client.ts`, scraper local/session storage.
- Clinical type shapes: `VitalSigns`, alert severity types, patient context types, and trajectory types appear in multiple folders.
- Fallback clinical paths: local fallback, canonical bridge fallback, legacy prescription fallback, and DOM selector fallback are valid behavior and must be documented before simplification.

## Refactor Rule

Every refactor pass must state:

1. Current behavior.
2. Structural improvement.
3. Validation command proving behavior stayed stable.
4. Rollback path limited to files touched in that pass.
