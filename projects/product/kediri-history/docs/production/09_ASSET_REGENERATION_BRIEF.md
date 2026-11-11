# 09 — ASSET REGENERATION BRIEF · **SUPERSEDED**

> **SUPERSEDED by the Chief's final asset authority decision of 2026-08-28.**
>
> Regeneration is **cancelled**. `project-images/` is the authoritative production
> image directory and the approved image set must not be modified or replaced.
> Assets are **directed**, not regenerated — see the `crop_*`, `object_position_*`,
> and `baked_text_audit` fields in `01_SCENE_MANIFEST.yaml`, and the ASSET
> EPISTEMIC INTEGRITY section of `05_REDO_REGISTER.md`.
>
> This file is retained only as the record of the composition and epistemic
> constraints that were specified. Its per-scene reasoning about what may and may
> not appear inside a raster remains valid as **direction guidance** and as the
> standard any future asset would have to meet. Nothing in it authorises producing
> a new image.

## Batch A · Scene 01–04

Original authority line, now void: Chief decision 2026-08-28 — Option A, regenerate, do not retouch.

Binding rules for every asset in this brief: Authority Rules 1–3 in `00_IMPLEMENTATION_AUTHORITY.md`.

This brief is a **generation contract**, not narrative canon. It does not add, remove, or reinterpret any historical claim. Meaning stays in `08_MASTER_PRODUCTION_NARRATIVE.md`; this file only constrains what may appear inside a raster.

---

## Universal constraints — apply to all four assets

**Absolutely prohibited inside the image:**

- any numeral, in any script, anywhere in frame — including dates, years, inventory numbers, and incidental signage;
- any glyph, character, letter, or writing-like mark, whether Latin, Kawi, Devanagari, Javanese, or invented;
- any place name, polity name, personal name, or cartographic label;
- any evidence-class, status, or caption text;
- pseudo-script of any kind — decorative marks made to read as ancient writing. This is a hard rejection, not a note.

Rule 3 has no exception clause. If a verified transcription of a real source is unavailable, the asset carries **no writing at all**. The writing enters through the DOM.

**Required of all four:**

- output 1536×1024 (3:2), plus a 768×512 `-w768` derivative, `.webp`, matching the existing pipeline;
- a composed frame with one dominant subject and deliberate negative space where the editorial plate will sit — the plate is DOM, so the image must leave room for it rather than fill every region;
- a distinct silhouette. `04_VISUAL_ACCEPTANCE.md` SILHOUETTE TEST: with all text hidden, the four scenes must remain distinguishable from one another;
- an outgoing visual element that the next scene can grow from, per `03_TRANSITION_MAP.yaml`;
- interpretive framing. Under Rule 2 the asset may carry atmosphere, but must not be composed to be mistaken for a photograph of a surviving, authenticated object. Prefer partial view, shallow depth, unresolved edges, and directional light over a centred museum-catalogue presentation.

**Filenames** stay exactly as the current pipeline expects, so no code path changes:

| Scene | File |
|---|---|
| 01 | `01-879-first-mark.webp` + `01-879-first-mark-w768.webp` |
| 02 | `02-921-kadhiri.webp` + `02-921-kadhiri-w768.webp` |
| 03 | `03-1015-name-endures.webp` + `03-1015-name-endures-w768.webp` |
| 04 | `04-1042-river-divides-kingdom.webp` + `04-1042-river-divides-kingdom-w768.webp` |

---

## Scene 01 — 879 — The First Mark

**Replaces:** rejected asset with pseudo-script, `27 … 1879`, and stone/metal mismatch. See REDO-ASSET-001.

**Historical argument the frame must serve:** a record precedes the kingdom, and legibility is itself the event.

**Subject:** a metal surface — copper alloy, the material canon specifies for the 879 record (*"dituliskan pada logam"*). Not stone. The surface is worked, aged, patinated, tool-marked, and reads as something made and handled by people.

**Composition:** macro, raking light entering from one side and dying across the plate. Most of the frame stays dark. The lit band is narrow — it is the light that must feel like the actor, since the GSAP `inscriptionReveal` timeline animates `--lit` sweeping across this surface.

**The unavoidable tension, and how to resolve it:** the scene is about an inscription, but Rule 3 forbids inventing the script. Resolve it by showing the *material condition of having been inscribed* without rendering any character: tool grooves, chisel bite, directional scoring, surface displacement, a worked band whose marks never resolve into glyphs at any zoom. The viewer should read "this was cut into by a hand" without ever reading a word.

If a verified photograph of the Prasasti Kwak becomes available as a V0 primary object, it supersedes this interpretive asset entirely.

**Outgoing element:** a single dominant groove or cut line, so `03_TRANSITION_MAP.yaml` can carry *inscription groove → written identity* into Scene 02.

**Negative space:** lower-left quadrant, unlit.

---

## Scene 02 — 921 — Kadhiri

**Replaces:** rejected asset with Latin `kadhiri` inside pseudo-script. See REDO-ASSET-002.

**Historical argument:** a record becomes a name.

**Subject:** the same material world as Scene 01, one step closer and one step warmer — visual continuity from 879 must remain perceptible, per the `04` Batch A checkpoint for this scene.

**Critical instruction:** the word KADHIRI must **not** appear in the image. It arrives as a DOM layer, animated by GSAP out of the Scene 01 groove.

This is not a compromise forced by the rule — it is the stronger reading. If the name is baked into the raster it was always there, and nothing happens. If the name resolves out of a mark on scroll, the visitor watches a record become an identity. The handoff argument becomes something the interface performs rather than something the caption asserts.

**Composition:** the frame should have one clear place where a word can land — a calm, low-detail region, sized and positioned for a large single word set in the production type. Everything else recedes. Treat that region as reserved architecture for a DOM element that does not yet exist.

**Outgoing element:** the name's resting position becomes the anchor that persists into Scene 03 while the world around it changes.

**Negative space:** the reserved word region, centre or centre-left.

---

## Scene 03 — 1015 — The Name Endures · **Research Hold**

**Replaces:** rejected asset asserting a legible KADHIRI on bronze. See REDO-ASSET-003.

**Historical argument:** continuity is possible, and it is not yet proven.

**This is the hardest asset in Batch A, and the most important to get right.** The canon states the Prasasti Carama attribution is unverified. The previous asset showed a clean artefact declaring the name — the image settled what the text deliberately leaves open. That inversion is what `04_VISUAL_ACCEPTANCE.md` means by *hidden research uncertainty*.

**The asset must feel like continuity under investigation, not declaration.**

Ways to achieve that, in order of preference:

1. the object is **partially obscured** — angle, shadow, foreshortening, or physical damage prevents a full reading;
2. the surface is **incomplete** — corrosion, loss, an edge that leaves the frame, a fragment rather than a whole;
3. the **context is absent** — no plinth, no case, no catalogue lighting, no institutional presentation that would imply an authenticated holding.

**Prohibited specifically here, beyond the universal rules:** any legible or semi-legible name; any composition that reads as an authenticated museum object; any lighting that presents the object as evidence on display.

**Camera:** near-still. This is the quietest shot in Act I and the `nameEndures` timeline already reflects that — the surface barely moves, only the world around it drifts. The asset must survive being held almost motionless without becoming boring, so its interest has to live in material and shadow rather than in composition drama.

**Research Hold is a DOM/evidence layer.** It must never be drawn into the image.

**Negative space:** generous. Uncertainty needs room.

---

## Scene 04 — 1042 — The River Divides a Kingdom

**Replaces:** rejected asset with burned-in `PANJALU / WEST KINGDOM`, `JENGGALA / EAST KINGDOM`, `BRANTAS / THE DIVIDING RIVER`. See REDO-ASSET-004.

**Historical argument:** recorded identity becomes political geography.

**Subject:** a clean landscape. A river running through cultivated lowland toward highland and a volcanic horizon, seen from elevation. No labels, no cartouches, no map furniture, no borders drawn on the land.

**Note on the rejected spelling:** the prior asset read `JENGGALA`. Canon `08` spells **Janggala**. Because the corrected name now lives in the DOM, this class of error becomes a text fix rather than an asset regeneration — which is precisely why Rule 1 exists.

**Composition requirements driven by the DOM layers that sit on top:**

- the river must be **unambiguously readable as a dividing line** through the frame, because the division is the argument and GSAP animates the two fields separating around it;
- the land on either side must be **visually distinguishable but not pre-labelled** — different terrain character, different light, different density, so that when the DOM names arrive they land on regions the eye has already separated;
- leave two clear low-detail regions, one per bank, sized for a polity name and a short descriptor;
- leave a third region along the river for the river's own DOM label.

**History and Tradition must be separable.** `04_VISUAL_ACCEPTANCE.md` requires that the Mpu Bharada tradition layer never appear as geological fact. The asset therefore carries **no supernatural or ritual imagery at all** — no parting water, no sacred vessel, no divine light. Tradition enters later as a visibly distinct DOM layer that the visitor can see is a different kind of claim. If tradition is painted into the terrain it can never be pulled back out.

**Outgoing element:** one bank should already carry slightly more visual weight, so the handoff *divided territory → centre of gravity* toward Daha has something to build on.

**Negative space:** the two bank regions and the river corridor.

---

## Acceptance procedure after regeneration

Per Chief instruction, in order:

1. inspect each of the four new assets directly at full resolution — not by filename, not by trusting the generation prompt;
2. confirm zero text, zero numerals, zero script, zero pseudo-script;
3. confirm Rule 2 — the asset does not impersonate documentary evidence;
4. update `01_SCENE_MANIFEST.yaml`: `image_file`, then `image_verified: true` **only after** inspection, then `hero_subject`, `evidence_class` from real provenance, desktop and mobile crop, and object position;
5. move REDO-ASSET-001 … 004 from `BLOCKED` to `READY_FOR_REVIEW` with before/after evidence;
6. begin Batch A GSAP implementation.

If any replacement asset still carries a historical conflict, stop and report rather than proceeding — that exception is explicit in the Chief's decision.
