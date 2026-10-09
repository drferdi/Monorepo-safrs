# Glass clinical workspace implementation plan

Goal: Recreate the supplied Glass screenshot as a standalone Next.js app with usable browser-local workflows.

Architecture: App Router shell, client workspace, typed patient/list/encounter state, persistent browser storage, deterministic document drafts, and optional browser speech recognition. No patient data or external API credentials are shipped. The user explicitly requested autonomous implementation until running, so additional design approval checkpoints are superseded for this task.

Design: Preserve the 256px gray sidebar, rounded near-white canvas, large negative space, centered two-line headline, 672px composer, horizontally scrolling action shortcuts, blue primary actions, lower promotional panel, and restrained footer. On small screens the sidebar becomes a drawer and the composer fits the viewport.

Files: `app/` owns routes and capsule-local styles/tokens; `components/` owns workspace, sidebar, composer, and dialogs; `lib/` owns models, reducer, document drafting, and storage validation; `tests/` owns state and draft contracts.

- [x] Define and test patient/list/encounter relationships, document output, and storage recovery.
- [x] Implement the screenshot layout and complete create/search/select/edit/delete workflows.
- [x] Implement all document modes, text/file context, specialty/model preferences, and transcript-to-note scribing.
- [x] Run typecheck, lint, targeted tests, production build, and browser interactions at desktop/mobile widths.
- [x] Verify extraction and deployment dry run; record results and honest backend limitations in capsule handoff.

Constraints: Local drafts preserve supplied facts and explicitly mark missing information; no invented clinical diagnoses, medication doses, guideline citations, or claims of live AI. Question mode produces a structured question brief and a source-search handoff. All modes can be edited, copied, and downloaded. Microphone recognition is browser-dependent, with pasted transcript fallback. Browser storage is for fictional data only, with a visible clear-data control.
