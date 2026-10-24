# Sentrapedia templates, version history, review, and work queue

Status: IMPLEMENTED — the design was approved by Gaffer with "Comfirmed, Executive" on 2026-10-09; executed and reviewed solo as instructed, with no additional workers.
Risk: R2, an addition to the local storage contract. Executed solo per Gaffer's earlier instruction.

## Purpose and limits

Speed up documentation, preserve content before it changes, and let the user resume work easily. Keep the Tosca/neumorphic visuals, the home-page spacing, the four intents, and every flow that already works. All features run locally with no installation, AI, knowledge base, cloud, billing, or clinical inference. Data stays fictional; browser storage is not yet safe for real patients. Status and checklist values are the user's own work metadata, not clinical validation and not an audit signature.

## 1. Personal templates and favorites

- Reach "Kelola templat" next to the composer's template picker; the dialog creates, edits, duplicates and deletes templates.
- A template holds a name, a base mode out of the 14 that exist, a list of Markdown section headings, and writing instructions. Every input is plain text, not code and not an instruction for an external service.
- A personal structure produces a section skeleton whose content the user enters explicitly through the matching labels. A section with no content is stated as not yet available. The raw input and context remain available as the source. Writing instructions are recorded as a preference; the local application does not claim to understand them through AI.
- Favorites may cover both built-in modes and personal templates. Favorite chips appear near the composer in a limited number, with access to the full list.
- Choosing a template neither discards the prompt nor submits immediately. The chosen template is clearly visible and can be detached, and its identity, structure and preferences are copied into the source metadata when the draft is created. Editing or deleting a template does not change existing documents.
- Deletion requires confirmation inside the dialog; the related selection and favorites are cleared.

## 2. Version history and draft restore

- The "Riwayat" tab in Document Studio shows Jakarta time, the version label, the reason (edit/restore), and a content preview; the user can name a version and compare it with the current content.
- Save a version before any real content change, whether a full edit, a section edit, or a Markdown checklist inside the document. An edit that changes nothing adds no version.
- A restore shows the target content and asks for confirmation, saves the current content as a version first, then replaces the content with a copy of the chosen version. The source version is not deleted.
- Every edit or restore returns the status to Draf and clears the review marks. sourceText and originalContent still preserve the original source and baseline.
- Older documents have history only from the day the feature existed; never invent past versions or times.
- Keep at most 50 snapshots per document, with a notice at the limit; the original baseline is still stored separately. This is local recovery, not a permanent audit trail.

## 3. Review checklist before finalization

- A "Peninjauan" section in Document Studio, distinct from the Markdown tasks that already exist.
- Defaults: the Encounter identity and link are checked; the source and the content are reviewed; empty sections are noted; language and formatting are checked.
- The user can set the default list in the checklist manager. Each document gets its own snapshot of the list; changing the defaults does not change another document's checklist.
- An item may carry a target section for navigation; a general item points to the document or the source. Ticking an item adds no clinical information to the content.
- Ditinjau becomes available only once every required item is ticked; Final requires Ditinjau and a complete checklist. The same gate is enforced in the reducer, not only in the dropdown.
- Editing or restoring content cancels every checklist mark and the Ditinjau/Final status. An old final status stays readable; any later change follows the new gate.
- An empty checklist must not become a shortcut to finalization; at least one item is required. Extra items can be created or deleted before review, and the status returns to Draf if the list changes.

## 4. Clinical work queue

- Reach "Antrean kerja" from the sidebar and the Command Center; it opens a dialog/panel with three groups: "Sedang dikerjakan", "Perlu ditinjau", "Selesai".
- The queue status is set by the user per Encounter, separate from each document's Draf/Ditinjau/Final status. It signals nothing about recovery, diagnosis, urgency or clinical validation.
- A card shows the title, the Patient link or "Tidak terkait Patient", the time of the change, the number of drafts, and the last document status. Cards can be searched and filtered by Patient.
- Pinning an Encounter sorts it first. A manual follow-up task has text and a done tick; there are no scheduled notifications and no automatic recommendations.
- Clicking a card opens the Encounter together with its latest draft. Status, pins and tasks persist across a reload; deleting an Encounter or Patient clears the related items through the existing contract.

## Contract and file scope

- Keep storageKey and version 1; additions are optional, with safe defaults for existing data.
- lib/workspace.ts: types, reducer, restore/metadata validation, and the additions for templates, favorites, checklists, versions and the queue. Discard malformed new metadata on its own while keeping valid older records.
- lib/workflow.ts (new): pure helpers for template structure, snapshots/checklists, and queue filtering/sorting. It imports nothing from another capsule or from the root.
- components/template-library.tsx and components/work-queue.tsx (new): local dialogs built on the existing Dialog component.
- components/composer.tsx, document-studio.tsx, message-card.tsx, workspace.tsx, sidebar.tsx, command-palette.tsx: integration limited to this feature.
- app/globals.css: styles for the new components, based on local tokens, responsive, with keyboard focus and reduced motion.
- tests/workflow.test.ts (new), tests/workspace.test.ts and tests/studio.test.ts: contract and regression tests. CONTEXT/HANDOFF record the results and the limits.
- The JSON backup includes the new metadata. Do not claim backup import is available while no flow for it exists. A browser storage failure must be visible; never report content as saved when the save failed.

## Acceptance criteria and verification

1. Create, edit, delete and favorite templates; choose one without losing the prompt; the result preserves the source and invents no empty sections; a reload preserves the data.
2. A real edit creates a snapshot and an identical edit does not; a restore preserves the previous content; source and baseline do not change; reload and malformed metadata are tested.
3. Finalization is refused before the checklist is complete and Ditinjau is set; an edit, reset or restore cancels the marks; older documents stay readable.
4. The three queue groups, pinning, filtering, manual tasks, opening an Encounter, and relation cleanup all work after a reload.
5. Verify typecheck, then lint and the targeted tests; build and deploy dry run; a standalone copy is identical with no installation. Two consecutive verification failures follow Gaffer's circuit breaker.
6. Desktop and mobile browsers: every flow uses fictional QA data, keyboard/Escape, dialogs, overflow, an actual preview build, and the initial data is preserved. Test storage errors, and report it if an environment limit prevents the test.

## Proposed technical order

The storage contract and the tested helpers come first; then templates and favorites; history and restore; checklist and gate; the queue; integration and export; browser checks and the solo review. The plan and its closing evidence are in docs/plans/completed/2026-10-09-local-workflow-tools.md and docs/verification/2026-10-09-local-workflow-tools.md. Next is Gaffer's usage review.
