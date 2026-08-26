# KEDIRI — A Living Civilization
## Source-of-Truth Planning Package v0.1.0

This package freezes the approved planning work for the **Kediri: A Living Civilization** historical web experience.

## Read order

1. `docs/bibles/01-master-historical-narrative.md`
2. `docs/bibles/02-cinematic-scene-architecture.md`
3. `docs/bibles/03-historical-visual-asset-evidence-bible.md`
4. `docs/bibles/04-visual-design-art-direction-bible.md`
5. `docs/bibles/05-master-ux-ia-interaction-bible.md`
6. `docs/bibles/06-master-technical-architecture-content-data-model-bible.md`
7. `docs/implementation/MASTER_IMPLEMENTATION_PLAN.md`

After the planning canon, read the original research corpus in `research/original/` and the Sentra-GSAP implementation standard in `resources/sentra-gsap-monorepo-standard-v1.0.0/`.

---

## Authority order

When two files appear to conflict, use this hierarchy:

1. **Verified external primary/official evidence** used during historical review.
2. **Approved Historical Narrative + Evidence Bible.**
3. **Technical Architecture and Implementation Plan** for implementation ownership and sequencing.
4. **Visual / UX / Cinematic Bibles** for experience intent.
5. **Original research corpus** as input material that may contain unreviewed, disputed, outdated, or internally inconsistent claims.
6. **Agent assumptions** have no authority.

The original research files are intentionally preserved without correction. They are **research corpus, not automatically production truth**.

---

## Critical historical integrity rule

The current source corpus contains claims that require review before publication. Examples already identified during planning include:

- the incorrect arithmetic describing 2026 as Kediri's 1,142nd commemorative year; 879 → 2026 is 1,147 years;
- the exact historiographic / museum status of Prasasti Carama;
- details of the 1912 bridge lifting operation;
- the PG Meritjan mortar-production claim and exact calibres;
- the claim that Gudang Garam itself contributes 70.5% of Kota Kediri PDRB;
- supernatural narratives around Mpu Bharada, Jayabaya prophecies, Calon Arang, Lembu Suro, and the “Kediri Curse”.

These must enter the future CMS as reviewed atomic claims, not as unquestioned prose.

---

## Non-negotiable implementation principle

**History must never live inside animation code.**

The architecture is intentionally separated into:

`Historical Truth → Editorial Narrative → Experience Model → Motion Choreography → Presentation`

A historian must be able to correct a claim without editing GSAP. A motion designer must be able to redesign a scene without changing historical truth.

---

## Sentra-GSAP

The complete supplied Sentra-GSAP standard is included twice:

- original ZIP: `resources/sentra-gsap-monorepo-standard-v1.0.0.zip`
- extracted working copy: `resources/sentra-gsap-monorepo-standard-v1.0.0/`

Its rules are binding for GSAP architecture, ScrollTrigger ownership, responsive choreography, performance, QA, and verification.

---

## Package purpose

This ZIP is a **planning and governance package**, not yet the coded application. Its job is to stop a coding agent from starting from a blank template and silently inventing product, history, UX, motion, or architecture decisions.

The next implementation step is to create the repository according to `docs/implementation/MASTER_IMPLEMENTATION_PLAN.md`.
