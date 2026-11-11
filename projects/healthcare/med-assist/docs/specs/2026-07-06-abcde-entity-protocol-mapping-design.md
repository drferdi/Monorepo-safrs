# Entity-to-Protocol Mapping (Sub-project B) — Design Spec

> Status: approved by Chief (dr. Ferdi Iskandar) in-session, 2026-07-06.
> Sub-project **B** of 4 identified during the ABCDE protocol expansion
> brainstorming (A: 13 new protocols — done, commits `12033937`…`d1227471`;
> C: 7-part UI restructure; D: triage zone entity reconciliation — both
> still deferred).

## Problem

Sub-project A added 13 new `ActionProtocol` entries to `action-protocols.ts`
(22 total now), but none of them are wired to any alert yet — they are
retrievable by id but never automatically surface when a matching gate
fires. Separately, of the 70 Pattern-Engine v2 patterns
(`clinical-patterns.ts`), only 39 carry an `actionProtocolId` at all (all
39 point to the original 9 protocols); 31 have none. Two legacy inline
gates (`hypertensive_crisis`, `preeclampsia_watch`) were deliberately left
unmapped in the `resolveActionProtocolId()` resolver built earlier this
session specifically because no fitting protocol existed at the time —
that constraint no longer holds now that `PROTO_HTN_EMERGENCY` and
`PROTO_PREECLAMPSIA_ECLAMPSIA` exist.

## Scope

**In scope:**

- Add `actionProtocolId` to the 2 legacy gate types that were blocked
  pending protocol existence (`hypertensive_crisis`, `preeclampsia_watch`).
- Add `actionProtocolId` to Pattern-Engine v2 patterns per the full mapping
  table below — covering all reasonable matches across all 22 protocols
  (both the 13 new ones and gap-fills to the original 9), not just
  new-protocol matches, per Chief's explicit confirmation to cover the
  full ~91→22 mapping comprehensively.
- Upgrade 11 patterns currently pointing at a generic old protocol to a
  more specific new one where the new protocol is a strictly better fit
  (e.g. dengue-specific guidance instead of generic shock guidance).
- Leave 12 patterns explicitly unmapped where no protocol among the 22
  fits (documented per-pattern below, not silently dropped).

**Out of scope:**

- Building any new protocol beyond the 13 already added in sub-project A
  (`PROTO_ALOC` and a thyroid-storm protocol are confirmed gaps from this
  pass — flagged, not built here).
- Sub-project C (7-part UI restructure) and D (triage zone reconciliation)
  — unaffected by this change; `actionProtocolId` is consumed the same way
  regardless of how the UI eventually renders it.
- Any change to gate logic, thresholds, or `steps`/`referralCriteria`
  content of any protocol (existing or new). This spec only sets a pointer
  field on existing pattern objects.

## Architecture

No new types or functions. Two small, mechanical changes:

1. **`components/clinical/TTVInferenceUI.tsx`** — the `hypertensive_crisis`
   and `preeclampsia_watch` alert-push sites gain a literal
   `actionProtocolId: 'PROTO_HTN_EMERGENCY'` / `'PROTO_PREECLAMPSIA_ECLAMPSIA'`
   field, same as any other alert field.
2. **`lib/emergency-detector/clinical-patterns.ts`** — 30 of the 70
   pattern objects gain or change their `actionProtocolId` field (a plain
   string property already part of `ClinicalPattern`, per
   `pattern-types.ts` — no interface change needed, just setting values
   already-supported by the type).

`resolveActionProtocolId()` (built earlier this session) already passes
through any `alert.actionProtocolId` that's already set before falling
back to its own inference rules — so once these two source files carry
the field, no change to the resolver itself is needed.

## Full Mapping Table (44 decisions: 2 legacy gates + 42 patterns)

### A. Legacy gate additions (2) — previously blocked, now unblocked

| Alert type            | Gate                | → Protocol                     |
| --------------------- | ------------------- | ------------------------------ |
| `hypertensive_crisis` | `GATE_2_BP`         | `PROTO_HTN_EMERGENCY`          |
| `preeclampsia_watch`  | `GATE_PREGNANCY_BP` | `PROTO_PREECLAMPSIA_ECLAMPSIA` |

### B. Pattern-Engine v2 — direct match to a NEW protocol (11)

| Pattern | Title                                               | → Protocol                              |
| ------- | --------------------------------------------------- | --------------------------------------- |
| CP-016  | PE suspected — sesak mendadak                       | `PROTO_PE_AORTIC_DISSECTION`            |
| CP-036  | Kode MERAH — AVPU != A mendadak                     | `PROTO_SAFETY_NET_CLINICAL_CONCERN`     |
| CP-037  | Borderline vitals — jangan tertipu angka            | `PROTO_SAFETY_NET_CLINICAL_CONCERN`     |
| CP-038  | Deteriorasi progresif — tren vital memburuk         | `PROTO_SAFETY_NET_CLINICAL_CONCERN`     |
| CP-044  | Frailty + vital naik pelan                          | `PROTO_GERIATRIC_OCCULT_RISK`           |
| CP-045  | Meningitis/ensefalitis suspected                    | `PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS` |
| CP-048  | Cedera kepala berat — peningkatan TIK               | `PROTO_NEURO_RED_FLAG`                  |
| CP-049  | Nyeri dada pleuritik — curiga pneumonia/PE          | `PROTO_PE_AORTIC_DISSECTION`            |
| CP-050  | PE/kardiomiopati postpartum                         | `PROTO_PE_AORTIC_DISSECTION`            |
| CP-060  | Cauda equina syndrome                               | `PROTO_CAUDA_EQUINA`                    |
| CP-070  | Kekhawatiran klinis — tampak lebih sakit dari angka | `PROTO_SAFETY_NET_CLINICAL_CONCERN`     |

### C. Pattern-Engine v2 — gap-fill to an EXISTING (old) protocol (8)

Confirmed with Chief per-case; CP-025 and CP-064 were explicit decision
points (see "Ambiguous cases resolved" below).

| Pattern | Title                                                            | → Protocol          |
| ------- | ---------------------------------------------------------------- | ------------------- |
| CP-003  | Infeksi sistemik / sepsis awal                                   | `PROTO_SEPSIS`      |
| CP-008  | Hemodynamic risk — Shock Index 0.9–1.0                           | `PROTO_SHOCK`       |
| CP-020  | ACS atipikal — nyeri dada + vital normal                         | `PROTO_ACS`         |
| CP-025  | Reaksi alergi — pantau eskalasi ke anafilaksis                   | `PROTO_ANAPHYLAXIS` |
| CP-028  | Early DKA — glucose + gejala metabolik                           | `PROTO_DKA_HHS`     |
| CP-055  | Emergensi abdomen — nyeri perut hebat + hemodinamik tidak stabil | `PROTO_SHOCK`       |
| CP-059  | Neutropenic sepsis — kanker + demam ringan                       | `PROTO_SEPSIS`      |
| CP-064  | Delirium akut — lansia + bingung + vital hampir normal           | `PROTO_SEPSIS`      |

### D. Pattern-Engine v2 — upgrade from generic-old to specific-new (11)

| Pattern | Title                                            | Current (generic)    | → New (specific)                        |
| ------- | ------------------------------------------------ | -------------------- | --------------------------------------- |
| CP-029  | Eksaserbasi asma/COPD                            | `PROTO_RESP_FAILURE` | `PROTO_ASTHMA_COPD_EXACERBATION`        |
| CP-030  | Status asthmaticus — silent chest                | `PROTO_RESP_FAILURE` | `PROTO_ASTHMA_COPD_EXACERBATION`        |
| CP-046  | Sepsis meningokokus                              | `PROTO_SEPSIS`       | `PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS` |
| CP-047  | Dengue berat / syok dengue                       | `PROTO_SHOCK`        | `PROTO_DENGUE_SHOCK`                    |
| CP-052  | Eksaserbasi asma — riwayat asma                  | `PROTO_RESP_FAILURE` | `PROTO_ASTHMA_COPD_EXACERBATION`        |
| CP-053  | Eksaserbasi COPD — riwayat COPD                  | `PROTO_RESP_FAILURE` | `PROTO_ASTHMA_COPD_EXACERBATION`        |
| CP-056  | KET / abortus — hamil + nyeri perut + perdarahan | `PROTO_SHOCK`        | `PROTO_OBSTETRIC_ABDOMEN_BLEEDING`      |
| CP-058  | Eksaserbasi asma anak                            | `PROTO_RESP_FAILURE` | `PROTO_ASTHMA_COPD_EXACERBATION`        |
| CP-067  | Diseksi aorta                                    | `PROTO_ACS`          | `PROTO_PE_AORTIC_DISSECTION`            |
| CP-068  | Overdosis obat — RR borderline + mengantuk berat | `PROTO_RESP_FAILURE` | `PROTO_TOX_RESP_DEPRESSION`             |
| CP-069  | Epiglotitis / obstruksi laring                   | `PROTO_RESP_FAILURE` | `PROTO_UPPER_AIRWAY_OBSTRUCTION`        |

### E. Explicitly left unmapped (12) — no protocol among the 22 fits, or too mild for ABCDE escalation

| Pattern | Title                                           | Reason                                                                                   |
| ------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| CP-031  | Anemia sedang-berat / perdarahan kronis         | Chronic condition, not an acute ABCDE emergency                                          |
| CP-033  | RR meningkat ringan (masih "normal")            | Too mild — would overstate urgency                                                       |
| CP-034  | Takikardia ringan, penyebab belum jelas         | Too mild/ambiguous                                                                       |
| CP-035  | Bradikardia signifikan                          | Ambiguous cause (same reasoning as the `code_red_cue` `hr` field, already left unmapped) |
| CP-039  | Pneumonia ringan/moderat                        | `PROTO_RESP_FAILURE` would overstate a ringan/moderat case                               |
| CP-040  | Infeksi ringan — demam tanpa red flag           | Too mild                                                                                 |
| CP-041  | Infeksi sedang — RR + HR + demam                | Moderate tier, not clearly emergency                                                     |
| CP-042  | Kejang demam anak                               | No pediatric-febrile-seizure protocol among the 22 — confirmed gap                       |
| CP-062  | Hipertiroid / thyroid storm                     | No thyroid-storm protocol among the 22 — confirmed gap                                   |
| CP-063  | Aritmia intermiten — palpitasi + near-syncope   | Ambiguous, no clear single protocol                                                      |
| CP-065  | Red flag kardiak remaja — pingsan saat olahraga | No protocol among the 22 fits pre-arrest syncope screening — confirmed gap               |
| CP-066  | Infeksi jaringan dalam DM — risiko gangren      | No deep-tissue-infection protocol among the 22 — confirmed gap                           |

## Ambiguous Cases Resolved (explicit Chief decisions)

1. **CP-025 (reaction allergy, not-yet-anaphylaxis) → `PROTO_ANAPHYLAXIS`.**
   Flagged the safety consideration that this protocol's first step is
   epinephrine IM, which could read as premature for a patient who is
   explicitly _not yet_ anaphylactic. Chief confirmed linking it anyway —
   his call as the clinical authority; the protocol serves as a
   ready-reference should the patient escalate, and the pattern's own
   `severity: 'warning'` (not `'critical'`) still differentiates it from
   true anaphylaxis in the UI.
2. **CP-064 (geriatric delirium) → `PROTO_SEPSIS`.** Chief's own earlier
   broader specification said this should map to "`PROTO_ALOC` +
   `PROTO_SEPSIS`" — but `PROTO_ALOC` was never one of the 13 protocols
   actually built (it appeared only in Chief's descriptive tables, not his
   final "minimum protocols to add" list). Chief confirmed mapping to
   `PROTO_SEPSIS` alone for now; `PROTO_ALOC` (Altered Level Of
   Consciousness, generic) is a confirmed gap for a future spec.

## Confirmed New Gaps (not fixed here, flagged for future specs)

- `PROTO_ALOC` — generic altered-consciousness protocol (from CP-064's
  resolution above).
- A thyroid-storm protocol (CP-062).
- A pediatric febrile-seizure protocol (CP-042).
- A cardiac-red-flag/pre-syncope-in-youth protocol (CP-065).
- A deep-tissue-infection-in-diabetes protocol (CP-066).

## Testing Plan

- `lib/emergency-detector/clinical-patterns.ts`: for each of the 30
  patterns changed (11 new-match + 8 gap-fill + 11 upgrade), assert
  `CLINICAL_PATTERNS.find(p => p.id === 'CP-XXX')?.actionProtocolId`
  equals the target from the table above.
- For the 12 explicitly-unmapped patterns, assert their
  `actionProtocolId` is still `undefined` — a regression guard proving a
  future edit doesn't silently force-map an intentionally-ambiguous case.
- `components/clinical/TTVInferenceUI.tsx`: `buildAlerts()` regression
  test confirming a `hypertensive_crisis`-triggering vitals input produces
  an alert with `actionProtocolId: 'PROTO_HTN_EMERGENCY'`, and a
  `preeclampsia_watch`-triggering input produces
  `actionProtocolId: 'PROTO_PREECLAMPSIA_ECLAMPSIA'`.
- Full existing `clinical-patterns`/`pattern-engine`/`TTVInferenceUI` test
  suites still pass (no thresholds or severities changed — only the
  `actionProtocolId` pointer field).

## Open Assumptions

- `pattern-types.ts`'s `ClinicalPattern.actionProtocolId` is already
  `string` (optional) per its existing use on 39 patterns — no type change
  needed, confirmed by reading the type before writing this spec.
- This spec does not change `resolveActionProtocolId()` or
  `patternMatchesToAlerts()` (both already pass through a pre-set
  `actionProtocolId` unchanged, per work done earlier this session) — pure
  data addition only.
