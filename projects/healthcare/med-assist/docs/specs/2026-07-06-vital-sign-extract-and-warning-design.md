# Vital Sign RME Extraction + Patient-Bar Warning Badge — Design

**Date:** 2026-07-06
**Status:** Approved by Chief, pending implementation plan
**Author:** Claude Code (brainstorming session)

## Problem

Two related gaps in the current boot/patient-load flow:

1. The nurse enters vital signs (tensi, nadi, suhu, RR, SpO2, gula darah) directly
   into the ePuskesmas RME page during the physical exam. Med Assist never reads
   those values back — the physician currently has to retype everything into the
   extension's own vitals form by hand, or rely on the AI AutoComplete+ guesser.
2. The patient identity bar (`SidePanelHeader.tsx` → `.patient-bar`) has no way to
   surface an at-a-glance abnormal-vital warning; its current 2-row layout is also
   visually broken (a stray `:` from an unused RM display, age/gender squeezed
   into the wrong cell).

## Scope

**In scope:**

- New RME → extension scrape for 7 numeric vitals (sbp, dbp, hr, rr, temp, spo2,
  glucose). GCS/kesadaran is explicitly excluded (see Decisions).
- Tagging extracted fields with the existing `RME-manual` field-priority source
  so the existing AutoComplete+ guardrail already respects them — no changes to
  `lib/clinical/aassist-v2/field-priority.ts` or `lib/clinical/vital-autocomplete.ts`.
- Patient-bar redesign: 3-column layout (identity / warning / chronic history),
  RM + facility demoted to a tooltip.
- A 2-slot abnormal-vital warning badge in the patient-bar's middle column,
  reusing the existing `assessVitalGuardrails()` severity classification.

**Out of scope (not touched this round):**

- Any change to `field-priority.ts`, `vital-autocomplete.ts`, or
  `vital-guardrails.ts` internals — all three are reused as-is.
- GCS extraction from RME (kesadaran text → GCS score conversion) — deferred,
  would need a new, clinically-reviewed conversion table.
- Any emergency-detector Gate 2/3 change — the warning badge is a separate,
  lower-severity UI affordance, not a CDSS alert.

## Architecture — Phase 1 (extract + tag)

Follows the existing 3-layer scraper pattern already used by
`scanMedicalHistory` / `scanClinicalContext` (not the heavier retry-based
`scanVisitHistory` pattern, and not folded into `getPatientInfo`, which is
scoped to patient identity only — see Decisions for why a new message type was
chosen over extending `getPatientInfo`).

1. **`lib/scraper/vital-signs.ts`** (new) — pure function
   `scanVitalSignsFromRoot(document): Partial<VitalScrapeResult>`. Reads
   `.value` off the same DOM selectors `page-anamnesa.ts` already uses to
   _write_ vitals (`input#sistole`, `input#diastole`, `input#detak-nadi`,
   `input[name="PeriksaFisik[respirasi]"]`, `input#suhu`,
   `input[name="PeriksaFisik[gula_darah]"]`, the saturasi/spo2 selector).
   Missing/empty fields are simply absent from the result — no throw.
2. **`entrypoints/content.ts`** — add `messageHandlers.scanVitalSigns` +
   `msg.type === 'scanVitalSigns'` listener branch, mirroring
   `scanClinicalContext`.
3. **`entrypoints/background.ts`** — add `onMessage('scanVitalSigns', ...)`
   using the same (non-retry) tab-finding strategy as `scanClinicalContext`.
4. **`entrypoints/sidepanel/main.tsx`** — add a 5th parallel call inside
   `fetchPatientData`'s existing `Promise.allSettled([...])`. On success, for
   each present field: `setTTVState` merge (main.tsx already owns `ttvState`
   as the controlled source of truth for `TTVInferenceUI`), and collect the
   list of successfully-extracted field keys.
5. **`components/clinical/TTVInferenceUI.tsx`** — new optional prop
   `rmeVitalFieldKeys?: VitalFieldKey[]`. New `useEffect` (same shape as the
   existing `fieldMeta` reset effect keyed on `patientRM` at line ~1659):
   when this prop is non-empty, call `setFieldMeta` with
   `makeFieldMeta(state[field], 'RME-manual')` for each listed key. No other
   change to `TTVInferenceUI`.

### Why tagging alone (no `lockField()`) is sufficient

`SOURCE_RANK` already ranks `RME-manual` (4) above `ASIST-autocomplete` (2)
and `ASIST-manual` (3). `vital-autocomplete.ts` already calls
`canOverrideField` before writing any AI-guessed value, so simply tagging a
field `RME-manual` makes AutoComplete+ permanently unable to touch it —
zero new code needed on the autocomplete side.

`lockField()` was considered and rejected: `canOverrideField` returns `false`
unconditionally when `locked` is true, _regardless of source_ — it would also
block the physician's own manual correction via `updateField`/
`handleBloodPressureChange`. Checked: today's manual-typing path does not call
`canOverrideField` at all (it unconditionally re-tags as `ASIST-manual`), so
physician correction of an RME-extracted value keeps working exactly as it
does today. Locking would silently take that away without being asked for.

### Race-window check

Value (`ttvState` via `setTTVState`) and the field-key list
(`rmeVitalFieldKeys` prop) are set together inside the same `fetchPatientData`
async function in `main.tsx`, landing in the same React commit. The new
`useEffect` in `TTVInferenceUI` fires as part of that same commit's effect
flush, before the browser yields to any user input. There is no practically
exploitable window where AutoComplete+ could see the new value while it is
still untagged.

## Architecture — Phase 2 (warning badge)

No new threshold/severity logic. `lib/clinical/vital-guardrails.ts` already
exports `assessVitalGuardrails(state, patient)` → `fieldStatus:
Record<VitalFieldKey, VitalFieldStatus>` with `severity: 'normal' | 'warning'
| 'critical' | 'blocked'` per field, already used by the live vitals form.

`main.tsx` calls this same pure function directly (it already holds `ttvState`
and `patientData.age`/`gender`) and derives up to 2 badge entries via a fixed
priority order:

```
1. sbp+dbp combined ("TD")  — shown if either's severity !== 'normal'
2. temp ("Suhu")            — shown if severity !== 'normal'
3. hr, then rr, then spo2, then glucose — first abnormal one fills any
   remaining slot(s), in that fixed order
```

TD and Suhu always win their slots when abnormal, per Chief's explicit
instruction — the fallback order for the remaining 4 vitals only matters when
TD and/or Suhu are normal. This is a fully deterministic, auditable selection
— no magnitude/scoring comparison across dissimilar units.

Badge content: label + value (e.g. `"TD 180/110"`, `"Suhu 39.2"`). Empty slot
(0 or 1 abnormal vitals) renders blank — no explicit "Normal" indicator needed.

The derived 2-slot result is passed into `SidePanelHeader` as a new prop
(e.g. `vitalWarnings: [{ label, value }?, { label, value }?]`).

## Patient-Bar Layout (3 columns)

`SidePanelHeader.tsx`'s `.patient-bar` keeps its existing DOM cells (no
reordering of elements that existing tests/CSS already key off), restyled via
CSS grid into:

|       | Left                                         | Middle               | Right                                     |
| ----- | -------------------------------------------- | -------------------- | ----------------------------------------- |
| Row 1 | Name (existing `patient-cell--name`)         | Warning slot 1 (new) | Chronic history top 3 slots (existing)    |
| Row 2 | Age + gender (existing `patient-cell--meta`) | Warning slot 2 (new) | Chronic history bottom 3 slots (existing) |

RM (`patient-cell--rm`) and facility (`patient-cell--facility`) move to a
`title` tooltip on the name cell instead of occupying their own visible cells
— the data is preserved, just no longer competing for header space.

## Error Handling

Identical to the other 4 `fetchPatientData` scans: `Promise.allSettled`
already tolerates a rejected/failed `scanVitalSigns` call — the physician
sees no error, and any field not extracted is simply left blank for manual
entry (existing `ASIST-manual` path), same as today.

## Testing Plan

- `lib/scraper/vital-signs.test.ts` — pure function, jsdom fixtures: all
  fields present, all absent, partial mix, malformed/non-numeric input.
- `entrypoints/content.ts` / `entrypoints/background.ts` — mirror the
  existing `scanClinicalContext` handler test shape.
- `components/clinical/TTVInferenceUI.rme-vitals.test.tsx` (new) — asserts
  `rmeVitalFieldKeys` prop correctly tags `fieldMeta` as `RME-manual`, and
  — as an explicit regression for the core claim in this design — that a
  subsequent AutoComplete+ call does NOT overwrite an RME-tagged field, while
  manual typing still can.
- Pure unit test for the 2-slot selection function (all combinations: none
  abnormal, TD only, Suhu only, both, TD normal + one of hr/rr/spo2/glucose
  abnormal, etc.).
- `components/sidepanel/SidePanelHeader.test.tsx` — updated for the 3-column
  layout + RM/facility tooltip + warning slot rendering.

## Open Assumptions (recorded, not questions)

- If the nurse updates RME vitals _after_ the physician has already pressed
  OCR once, the physician must press OCR again to re-pull them (same
  re-fetch-on-demand model as patient identity today) — no live polling.
- The 7-vital scope intentionally excludes GCS; the physician's own GCS
  assessment in the extension remains authoritative and untouched by this
  feature.
