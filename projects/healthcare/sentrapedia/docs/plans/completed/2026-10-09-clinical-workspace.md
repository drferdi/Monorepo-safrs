# Clinical Workspace Implementation Plan

> Execute inline with superpowers:executing-plans. Chief explicitly selected no additional workers.

**Goal:** Implement the five approved Sentrapedia workflow/design ideas locally.
**Architecture:** Extend optional document metadata in the existing reducer; pure helpers own grouping, section offsets, comparison and timelines. Small client components consume those helpers. Workspace coordinates navigation and callbacks.
**Tech Stack:** Existing Next.js, React, TypeScript, Lucide, CSS, Vitest.
**Spec:** `docs/specs/2026-10-09-clinical-workspace.md`.

## Global constraints

No installs, providers, KB, root dependencies, clinical inference, or additional workers. Preserve records and source text. User's implementation approval and inline choice authorize the execution; no extra implementation checkpoint is needed.

## Ordered tasks

- [x] 1. `lib/workspace.ts`, new `lib/studio.ts`, `tests/studio.test.ts`: optional source/baseline/review fields; guarded status transitions; lossless section edits, intent groups, contextual fields, timeline filtering. Write and observe targeted tests before implementing.
- [x] 2. New `components/clinical-panel.tsx`: collapsible context and patient-filtered timeline, using explicit supplied labels and raw source. Integrate in `components/workspace.tsx` without changing patient/encounter ownership.
- [x] 3. `components/composer.tsx`: replace long mode rail with four intent groups and mode selector; local slash picker, preserving unsent text. All 14 modes remain reachable.
- [x] 4. `components/message-card.tsx`, new `components/document-studio.tsx`: sections, editing, immutable source side-by-side, baseline comparison, status transitions. Existing checklist, copy, editing and download remain functional.
- [x] 5. New `components/command-palette.tsx`; `components/sidebar.tsx`, `components/workspace.tsx`: command palette, keyboard actions, focus mode, panel dialogs on smaller screens.
- [x] 6. `app/globals.css`: scoped cockpit, studio, responsive, focus and reduced-motion styles, consuming existing semantic tokens.
- [x] 7. Run typecheck → lint → targeted tests, build and dry run in independent preinstalled extraction. Compare source hashes. Browser-test all five features and migration-related behavior; document self-review, limits, screenshots, HANDOFF and CONTEXT. No commit or external publication is requested.

## Review focus

Legacy records without metadata; edited final documents reverting to draft; source text untouched during section edits; unrelated/unlinked patient timelines; hidden mobile panels and modal shortcut/focus isolation.

## Ledger

- Planning: source schema and component contracts inspected. Main node_modules remain incomplete; use existing independently installed extraction with identical lockfile, without installing packages. Source-only runtime health remains a separate baseline issue.
- Ruling: perform final review inline, because Chief explicitly requested no additional workers. Independent reviewer coverage will not be claimed.

- Complete: 32 tests plus typecheck/lint/build/dry-run passed in independent extraction; final build `n5GFGZS4Ho1TjNkiMpZoc`. 32 files match exactly. Seven viewports passed; tablet clipping was corrected. Inline review and migration/browser checks recorded in HANDOFF. Chief's no-install constraint leaves main checkout dependencies as an inherited limitation. No worker, install, commit or publication.
