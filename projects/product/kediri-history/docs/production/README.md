# Kediri Production Implementation Pack v1.0.0

This pack converts the Kediri Journey from instruction-driven execution into contract-driven implementation.

## Purpose

Use these files as the implementation authority for the cinematic Journey. They are designed to reduce creative ambiguity and prevent an implementation agent from simplifying approved direction into generic webpage patterns.

## Installation

Copy the contents of this package into:

`D:\DEV\Monorepo\projects\product\kediri-history\`

The canonical implementation authority then becomes:

`docs/production/00_IMPLEMENTATION_AUTHORITY.md`

## Operating rule

Claude/Codex/Fable must never be asked to "make it more cinematic" in the abstract.

They must:
1. read the authority file;
2. execute only the approved batch;
3. obey scene, narrative, transition, and visual acceptance contracts;
4. provide screenshot proof;
5. mark work READY FOR REVIEW, never self-approve;
6. stop at the batch gate.

## Files

- `00_IMPLEMENTATION_AUTHORITY.md`
- `01_SCENE_MANIFEST.yaml`
- `02_NARRATIVE_BEATS.yaml`
- `03_TRANSITION_MAP.yaml`
- `04_VISUAL_ACCEPTANCE.md`
- `05_REDO_REGISTER.md`
- `06_BATCH_PLAN.md`
- `07_AGENT_EXECUTION_PROMPT.md`
- `08_MASTER_PRODUCTION_NARRATIVE.md`
- `09_ASSET_REGENERATION_BRIEF.md` (SUPERSEDED — retained as direction guidance only)

## Important

The 27 image filenames are intentionally not invented in this pack. The agent must inspect the real asset folder and bind the actual files to the locked scene IDs before implementation.

**Canonical image source:** `project-images/`. `apps/web/editorial-preview/journey/` contains webp derivatives of those same files and is not an independent source; it must never override `project-images/`.

`image_verified` may only be set after direct visual inspection of the actual file.

Authority Rules 1–3 in `00_IMPLEMENTATION_AUTHORITY.md` — no historical text baked into raster, no interpretation impersonating documentary evidence, no pseudo-script — bind all future assets. The existing approved set predates them; where it conflicts, the defect is recorded in `baked_text_audit` and handled by art direction and DOM layering rather than by replacing the asset.
