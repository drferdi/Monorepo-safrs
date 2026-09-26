# Sidepanel UI Authority — READ BEFORE TOUCHING ANYTHING

Last updated: 2026-06-28 | Owner: Chief

> Capsule router: [`../../AGENTS.md`](../../AGENTS.md). This file may only ADD scoped
> context for the side panel.

**DO NOT REFACTOR, SIMPLIFY, OR RESTRUCTURE ANY FILE IN THIS DIRECTORY without explicit written approval from the user.**

This directory has been destroyed and recovered 4 times by automated refactoring. All refactor tasks on this directory are SUSPENDED until further notice.

## UI Authority Contract

The current UI authority is `clinical-trajectory-v2`.
The current built UI design explicitly confirmed by Chief is the authoritative baseline for this directory.

### Never replace the approved design

- Do **not** replace this sidepanel UI with any prior, alternate, simplified, or regenerated design.
- Do **not** "clean up" the layout into a different composition without explicit written approval.
- Do **not** assume another branch, stash, checkpoint, or remembered version is more correct than the design Chief has already approved.
- If a requested change might alter the approved render output, stop and ask before editing protected UI files.

The following must ALWAYS be present in the built extension:

### Three-button action bar (MANDATORY)

`TTVInferenceUI` renders exactly three buttons in `action-bar--tri-tabs`:

- `aria-label="Uplink"` — RME auto-fill
- `aria-label="Doctor"` — forward consult
- `aria-label="Trajectory"` — navigate to clinical trajectory

If any of these three buttons is missing, the UI is BROKEN. Do not commit.

### GCS on the left

The GCS vital input must appear on the LEFT side of the vitals grid (NOT moved, NOT removed).

### SBP + DBP on one row

Systolic and diastolic blood pressure must be combined in a single row.

## Protected files — DO NOT MODIFY without user approval

- `entrypoints/sidepanel/main.tsx` — main runtime mount
- `components/clinical/TTVInferenceUI.tsx` — core inference UI (> 3000 lines, do not slim down)
- `entrypoints/sidepanel/style.css` — panel CSS (> 2800 lines, do not slim down)
- `entrypoints/sidepanel/components/SentraAssistPanel.tsx` — approved panel shell
- `entrypoints/sidepanel/ApprovedSentraAssistApp.tsx` — not mounted in main.tsx's current runtime; file is intentionally retained (see legacy plan finding #4 and its test coverage)

## What you MAY do without approval

- Add new components inside `entrypoints/sidepanel/components/`
- Add new CSS classes to `style.css` (never remove existing ones)
- Add tests
- Fix bugs in logic that do NOT touch the render output of the protected files above

## Recovery reference

If UI is accidentally regressed, restore from:

- git commit `42be8f0` for `main.tsx`
- `git stash apply stash@{0}` for TTVInferenceUI and style.css
