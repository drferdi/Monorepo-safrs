# Local Workflow Tools Implementation Plan

Execution: Chief confirmed spec and instructed execution on 2026-10-09; solo, no additional workers. Use executing-plans task-by-task.

Goal: Four persistent local workflow tools with no clinical inference.
Architecture: Optional version-1 metadata with validated restore, pure workflow helpers, and capsule-local dialogs. Snapshot/checklist guards are enforced by reducer, with React integration and existing token styles.
Tech stack: Existing Next/React/TypeScript/Vitest; no dependency additions.
Spec: docs/specs/2026-10-09-local-workflow-tools.md

Constraints: Preserve source/baseline, legacy records, Tosca visuals, and local-only fictional data. No installs, providers, workers, or external mutations. Two consecutive verification failures halt execution.

Review focus: Invalid metadata must not erase legacy records; edit/restore reset checks and status; restore retains current content; template selection preserves prompt; delete removes references; persistence failures remain visible.

- [x] 1. Add lib/workflow.ts types/helpers and tests/workflow.test.ts covering template sections, review completeness, revision snapshots, queue filtering, and metadata validation. Extend lib/workspace.ts optional schema/actions; reducer guards and restore normalization. Verify targeted tests.
- [x] 2. Create components/template-library.tsx and template controls in composer. Persist personal templates, built-in/personal favorites, checklist defaults; capture selected template snapshot in source. Tests cover blank sections and immutable prior documents.
- [x] 3. Extend Document Studio/MessageCard with revision listing/naming/comparison/confirmed restore and per-document editable review checklist. Add snapshot metadata on generated documents; final status reducer gate applies only with complete required checklist. Legacy final records remain readable.
- [x] 4. Create work-queue dialog with three manual groups, pin, query/patient filter, tasks; wire sidebar and Command Center; opening card selects Encounter and last document. Tests cover pin/filter/deletion/persistence.
- [x] 5. Add scoped responsive CSS. Typecheck, lint modified TS files, targeted tests, build, deploy dry run from preinstalled extraction. Compare source hashes. Browser desktop/mobile flows, reload, keyboard/Escape; preserve original QA data; save screenshots. Solo review and update CONTEXT/HANDOFF with limits.

Verification root: C:/Users/drfer/AppData/Local/Temp/sentrapedia-identity-20261008-220319 (preinstalled identical independent capsule). Commands: npx --no-install tsc --noEmit; npx --no-install eslint <changed TS files> --fix; npm test -- tests/workflow.test.ts tests/workspace.test.ts tests/studio.test.ts; npm run build; npm run deploy:dry-run.


Status: CLOSED after solo implementation and observed final gates on 2026-10-09. Evidence: docs/verification/2026-10-09-local-workflow-tools.md. Final build: 6I7GNHw6WblHE_NKJOZ4x; 45/45 tests; 37 matching source/config files. Chief instruction forbids additional workers, so review is solo. No installation or external mutation. Main checkout dependency limitation and browser quota-banner coverage limit remain documented.
