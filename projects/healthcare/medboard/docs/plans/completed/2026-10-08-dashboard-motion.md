# Dashboard motion implementation plan

Goal: Implement the six approved effects in MedBoard's existing React dashboard, with a framework-independent browser animation core.

Architecture: A persistent shell coordinator owns navigation, cancellation and decorative overlays. Motion provides FLIP layout animation and interactive surfaces; existing Three.js provides a lazily loaded procedural portal. A local Motion Studio exercises each effect without patient or example clinical data.

Scope: Visual components, shell integration, home card presentation, targeted tests and capsule handoff only. Preserve authentication, database, clinical logic, navigation semantics and unrelated staged documentation. No dependency installation, experimental router APIs, production operations, commits or publishing.

## Design and acceptance

- Shared-panel morphs capture both layout states using FLIP and Web Animations. Document-native snapshots were replaced after review because they block shell hit testing. Route changes use the depth treatment; only the armed target pathname resolves the destination signal, with redirects released at the bounded animation timeout.
- Portal, depth and curved SVG effects cover/reveal major nonclinical sections. Clinical work areas use immediate navigation. Back/forward remains router-owned.
- Every new navigation cancels the prior visual transaction; stale completions cannot clean up a newer transition. Errors, timeout, reduced-motion changes and hidden tabs restore readable content.
- Home cards use Motion layout measurement for FLIP and fine-pointer tilt/highlight. Interactive descendants retain ordinary keyboard and pointer behavior.
- Overlays are decorative, noninteractive and scoped away from the navigation shell. GPU rendering stops when idle and resources are disposed.
- Motion Studio includes all six effects, layout reordering, keyboard-accessible controls and real destination links. It displays no invented operational metrics.
- Browser core uses DOM handles and callbacks so Vue and Angular adapters can reuse it; this repository remains a React application.
- Remotion's selected router skill was read. No video composition or export was requested, so no Remotion runtime is added to the dashboard.

## Review focus

1. Modified clicks, downloads, external URLs and onClick cancellation preserve Link behavior.
2. Rapid navigation, redirects and slow route rendering cannot leave a cover or frozen snapshot.
3. Reduced motion, coarse pointers, hidden tabs and WebGL loss keep content and controls usable.
4. Focus is restored only for actual navigation, without stealing focus from destination forms.
5. Auth/session and clinical data remain outside the visual system.

## Tasks

- [x] Add tested route policy and transaction cancellation/commit gate. Run a targeted failing test, then implement and observe it pass.
- [x] Add framework-independent frame, depth, SVG curtain and procedural portal effects; implement the shell provider, viewport and Link adapter.
- [x] Integrate shell links and home Motion surfaces. Add Motion Studio with all six previews and FLIP layout controls.
- [x] Run capsule typecheck, targeted tests, relevant design tests, build and deploy dry run. The capsule contract declares standalone lint not applicable because there is no ESLint configuration; never install a linter implicitly.
- [x] Exercise local browser navigation, all effects, reduced motion, rapid clicks, keyboard and narrow viewports. Run standalone extraction verification when available.
- [x] Review the bounded diff and record exact results/remaining limitations in the capsule handoff. Preserve existing handoff context and unrelated files.

Execution: inline in the current capsule. Source paths selected for modification have no existing working-tree changes; unrelated staged documentation is outside this task. Jev returned proceed_full in active mode.

Completion: TypeScript and 42 targeted tests pass; full capsule tests and production build pass. Independent final source review has no Critical/Important findings. Structural and extracted install/typecheck/test/build/deployDryRun/run/smoke/cleanup pass (`output/motion/standalone.log`). Browser evidence is component-harness scoped; database-backed authentication, other browser engines and measured frame budgets are outside the verified evidence. Details: `docs/development/dashboard-motion.md` and `.agents/HANDOFF.md`.
