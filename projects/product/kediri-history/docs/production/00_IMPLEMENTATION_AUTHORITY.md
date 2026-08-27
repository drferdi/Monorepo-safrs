# 00 — IMPLEMENTATION AUTHORITY
## Kediri — A Living Civilization

This folder is the **highest implementation authority for the `/journey` experience**.

If prototype code, old comments, legacy prompts, previous agent decisions, or generic framework conventions conflict with these files, this production contract wins unless it conflicts with higher-level historical/evidence canon.

## Non-negotiable authority order

1. Historical/Evidence canon
2. `08_MASTER_PRODUCTION_NARRATIVE.md`
3. `01_SCENE_MANIFEST.yaml`
4. `02_NARRATIVE_BEATS.yaml`
5. `03_TRANSITION_MAP.yaml`
6. `04_VISUAL_ACCEPTANCE.md`
7. `05_REDO_REGISTER.md`
8. Existing implementation

## Core rule

**DO NOT SOLVE CREATIVE DIFFICULTY BY SIMPLIFYING THE DESIGN.**

If an approved cinematic requirement cannot be implemented reliably:
- STOP;
- identify the blocker;
- show the affected scene and requirement;
- propose options;
- wait for approval.

Do not quietly replace a difficult handoff with a crossfade.
Do not replace directed cinematography with generic section animation.
Do not replace production copy with summaries.
Do not replace approved imagery with invented assets.

## Product definition

This is not a history website with animation.

It is a historically responsible public digital institution presented through a cinematic interactive medium.

The unit of implementation is the **shot**, not the section.

Every scene must define:
- frame composition;
- dominant subject;
- camera intention;
- light/material behavior;
- temporal beats;
- hold state;
- historical argument;
- outgoing handoff;
- incoming handoff.

## Asset epistemic integrity

Approved by the Chief on 2026-08-28. These rules bind every cinematic raster asset in the Journey, existing or future.

### Rule 1 — No historical text baked into raster

**Historical text must never be baked into cinematic raster assets when the text carries factual, chronological, geographical, evidentiary, or epistemic meaning. Such information must remain semantic DOM content.**

This covers, without limitation: years and dates, place and polity names, ruler and author names, inscription transcriptions, evidence-class labels, and research-status labels.

Rationale: text inside a raster cannot be read by assistive technology, cannot be localized, cannot be corrected without regenerating the asset, and cannot be separated from the History/Tradition layer distinction that `04_VISUAL_ACCEPTANCE.md` requires.

### Rule 2 — Interpretation may not impersonate evidence

**AI-generated or reconstructed historical imagery may provide atmosphere or interpretation, but may never impersonate documentary evidence or an authenticated historical object.**

An interpretive asset must be labelled as interpretive, and must not be composed so that a reasonable visitor would read it as a photograph of a surviving artefact.

### Rule 3 — Pseudo-script is prohibited

**Never render writing that is made to "look ancient" when the characters are not a correct transcription of a verified source.**

Decorative glyphs standing in for Kawi, Sanskrit, or any historical script are a **hard rejection**, not a note. If a verified transcription is unavailable, the asset carries no script at all and the writing enters through the DOM layer.

## GSAP requirement

GSAP is mandatory for Journey choreography.

GSAP must own narrative progression, not merely decorative fades.

Required:
- GSAP
- ScrollTrigger
- scoped lifecycle
- coordinated scene timelines
- responsive choreography
- reduced-motion behavior
- explicit cleanup

Rejected:
- generic IntersectionObserver reveal architecture
- repeated `opacity + y` entrances as the primary motion system
- dozens of unrelated ScrollTriggers
- nested Journey scrolling
- animation state that owns historical facts

## Review authority

Implementation agents may mark work:

`READY_FOR_REVIEW`

They may not mark cinematic work:

`APPROVED`

Approval belongs to the Chief/reviewer.

## Stop rule

Never implement beyond the active batch.

A batch must pass:
- functional QA
- GSAP QA
- visual checkpoint review
- transition review
- copy review
- human approval

before the next batch begins.
