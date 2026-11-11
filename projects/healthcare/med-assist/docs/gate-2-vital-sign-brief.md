# Gate 2 Vital Sign Brief Notes

Source reviewed: `(legacy) codietorium\Sentra Artificial Intelligence\Sentra Assist\Gate 2 Vital Sign`.

Note: the requested source path ended with `Gate 2 Vital Sign end to end`, but the matching folder on disk is `Gate 2 Vital Sign`.

## Purpose

Gate 2 is an early-warning and action-routing layer for FKTP/Puskesmas vital-sign workflows. It is not a final diagnosis engine. Its job is to convert vital signs, symptoms, risk flags, and clinician concern into:

- a safety severity level,
- matched clinical risk patterns,
- indicative disease and ICD-10 candidates,
- clear first actions for nurses, midwives, or doctors,
- a re-measure / re-evaluate loop.

The clinical posture is conservative: if the pattern suggests deterioration, the system should escalate to doctor review, observation, emergency workflow, or referral instead of allowing a routine discharge path.

## Implementation Status

As of the Gate 2 wiring pass, Med Assist implements the end-to-end local workflow:

- `lib/emergency-detector/clinical-patterns.ts` remains the deterministic pattern library for CP-001 through CP-070.
- `lib/emergency-detector/action-protocols.ts` remains the ABCDE action-protocol library.
- `lib/emergency-detector/gate2-workflow.ts` resolves matched alerts into the primary Gate 2 action route, action checklist, referral criteria, risk ordering, and re-measure prompt.
- `components/clinical/TTVInferenceUI.tsx` now preserves pattern metadata, sorts alert previews by risk/actionability, exposes explicit clinical concern input, emits a `gate2Summary`, and renders the Gate 2 action panel.
- Tier C is enabled only when structured context exists, such as DM/asthma/COPD history flags or explicit clinical concern.

Current boundary: Gate 2 remains action-routing and early warning only. Diagnosis selection, triage/referral decision tree, pharmacotherapy, and RME transfer stay in their own review-gated workflows.

## End-To-End Shape

The intended pipeline is:

`Input -> Pattern Matcher -> Prioritizer -> Action Resolver -> FKTP UI -> Action Log -> Re-measure`

Runtime input should include:

- vital signs: SBP, DBP, MAP if available, HR, RR, SpO2, temperature, AVPU;
- patient context: age, sex, pregnancy, postpartum, elderly, pediatric, asthma/COPD, DM, cancer/chemotherapy, cardiac history;
- symptoms: dyspnea, chest pain, fever, cough, abdominal pain, headache, neurological deficit, bleeding, trauma, allergy exposure;
- risk flags: immobility, recent surgery, sedative/opioid exposure, suicide risk, clinical concern, poor appearance despite borderline numbers.

The matcher loops through a pattern library and returns matched events:

```ts
type Gate2Match = {
  pattern_id: string;
  severity:
    | 'low'
    | 'low_to_medium'
    | 'medium'
    | 'medium_to_high'
    | 'high'
    | 'high_to_critical'
    | 'critical';
  actions_id: string;
  icd10_candidates: string[];
  disease_candidates: string[];
};
```

The prioritizer should sort by clinical risk, not display order:

`critical > high_to_critical > high > medium_to_high > medium > low_to_medium > low`

When multiple patterns match, preserve all critical matches and show the highest-risk actionable path first.

## Main Libraries

The source material describes three logical libraries.

`PATTERN LIBRARY`

- Contains `PAT_001` through `PAT_070`.
- Each pattern combines `vital_criteria`, `clinical_flags`, `icd10_candidates`, `disease_candidates`, `severity`, and `actions_id`.
- Pattern types include vital-only, vital-plus-symptom, symptom/risk-only, and clinician-concern patterns.

`ACTIONS LIBRARY`

- Maps `actions_id` to Indonesian step-by-step action text.
- Examples: respiratory failure emergency, shock protocol, early sepsis protocol, ACS emergency, stroke emergency, anaphylaxis, DKA/HHS referral, hypoglycemia, suicide risk, overdose, dengue, pneumonia, pediatric respiratory cases, dehydration, fall risk.

`GATE ENGINE / MATCHER`

- Evaluates all patterns against the current clinical context.
- Outputs the matched patterns with severity, candidates, and action IDs.
- Re-runs after new vital signs or clinical status changes.

## Core Clinical Signals

The source repeatedly treats RR as the strongest single early deterioration signal, especially when trending upward.

High-value combinations:

- `RR + SpO2 + AVPU`: strongest quick screen for respiratory failure, sepsis deterioration, hypoxia, and pre-arrest risk.
- `HR + SBP/MAP + CRT`: hemodynamic instability and shock direction.
- `Temperature + HR + RR`: infection/sepsis screening.
- `Chest pain + autonomic symptoms + BP/HR abnormality`: ACS risk.
- `Focal neurological deficit or sudden altered mental status`: stroke/neuro emergency even if vital signs are not dramatic.
- `Allergen exposure + respiratory/circulatory signs`: anaphylaxis.
- `DM + Kussmaul/dehydration/altered status`: DKA/HHS.
- `Normal or borderline vital signs + clinical concern`: must still be eligible for escalation.

## Vital Sign Mapping

Adult rough zones from the source:

| Parameter   | Low / Danger                              | Normal / Safer Zone | High / Danger                                                                    |
| ----------- | ----------------------------------------- | ------------------- | -------------------------------------------------------------------------------- |
| HR          | `<40` severe bradycardia; `40-49` caution | `50-90`             | `91-110` mild/moderate tachycardia; `>110-120` high risk; `>130` very concerning |
| RR          | `<8` severe bradypnea; `8-11` caution     | `12-20`             | `21-24` early warning; `25-29` high risk; `>=30` severe; `>36` very high risk    |
| SBP         | `<90` shock; `90-99` marginal             | `100-139`           | `140-179` hypertension; `>=180` crisis screen, especially with organ symptoms    |
| DBP         | `<60` low                                 | `60-90`             | `>90` high; `>120` very concerning                                               |
| Temperature | `<35` hypothermia                         | `35-37.5`           | `37.6-38.9` fever; `39-40.9` high fever; `>=41` emergency                        |
| SpO2        | `<90` severe hypoxemia                    | `>=96`              | `94-95` mild drop; `90-93` moderate drop                                         |

Important modifiers:

- Pregnancy can raise baseline HR by about 10-15%.
- Trained athletes can have low resting HR without pathology.
- Elderly trauma patients may have occult shock even with SBP `90-120`.
- RR measurement has meaningful observer variability; trends and repeat checks matter.
- BP technique, cuff size, arm/site, and automated/manual method can shift readings.

## NEWS2 And MEWS Direction

The source compares NEWS2 and MEWS for FKTP adaptation.

MEWS is the simpler starting point:

- RR, HR, SBP, temperature, AVPU.
- Lower equipment burden.
- Good for facilities where SpO2 is not consistently captured.

NEWS2 is the richer target:

- RR, SpO2, SBP, HR, temperature, AVPU, and oxygen supplementation.
- More sensitive for infection and respiratory deterioration.
- Requires reliable oximetry and more training.

For Med Assist, the pragmatic direction is likely: implement a MEWS-like lightweight score plus explicit SpO2/oxygen handling, while keeping the model shape compatible with NEWS2. This avoids a heavy first pass while still catching respiratory risk.

## Gate Families

The source defines major gate groups:

- early sepsis and septic shock,
- shock index / hemodynamic instability,
- acute respiratory failure,
- pulmonary embolism suspect,
- ACS / MI,
- stroke,
- anaphylaxis,
- DKA/HHS,
- asthma/COPD exacerbation,
- anemia or chronic bleed,
- cardiac arrest / near arrest,
- pediatric pneumonia/asthma/bronchiolitis,
- overdose and respiratory depression,
- dengue and dehydration,
- acute abdomen, obstetric emergency, trauma,
- psychiatric safety risk and suicide risk,
- frailty, delirium, fall risk,
- clinician concern / "sick despite numbers".

This is broader than pure vital-sign scoring. Gate 2 should accept clinical flags and risk context, otherwise it will miss serious but non-obvious cases.

## UI Output

The user-facing clinical output should be action-first:

- alert color by severity;
- short risk label, e.g. "Risiko gagal napas akut";
- probable problem direction, not final diagnosis;
- ICD-10 candidates as indicative support only;
- step-by-step FKTP action checklist;
- doctor review / observation / referral instruction;
- re-measure prompt;
- action completion log.

Critical alerts should not be hidden behind secondary cards or collapsed sections. The clinician should immediately see the highest-risk action path.

## Example Runtime Flow

Example input:

- RR `32`
- SpO2 `88%`
- HR `118`
- SBP `100`
- dyspnea, productive cough, fever
- unable to speak full sentences

Expected matches:

- respiratory distress / acute respiratory failure pattern;
- possible severe pneumonia / asthma-COPD exacerbation / pulmonary embolism depending on flags;
- severity `critical`;
- action route `ACT_RESP_FAILURE_EMERGENCY`.

Expected UI:

- red alert;
- "Risiko gagal napas akut";
- sit upright/semi-Fowler;
- oxygen `6-10 L/min` if available and appropriate;
- monitor RR, SpO2, HR, BP closely;
- call doctor;
- prepare emergency referral.

If AVPU worsens, the engine should add the "three big bad" / pre-arrest deterioration path and raise urgency.

## Implementation Implications For Med Assist

Keep Gate 2 deterministic first. The source material is already structured as patterns plus actions; it should not require an LLM to decide emergency actions.

Recommended implementation shape:

- normalize vitals and clinical flags into a single context object;
- encode vital zones and modifiers as small pure functions;
- encode `PAT_001` to `PAT_070` as structured data, not UI conditionals;
- resolve `actions_id` through a separate actions map;
- sort matches through a single severity order;
- expose a compact view model for the sidepanel;
- keep "diagnosis direction" separate from "required action";
- require human review and explicit clinician confirmation for actions;
- re-run the matcher when new vitals are entered.

Avoid:

- treating a single normal vital sign as clearance;
- using diagnosis labels as if they are definitive;
- burying the referral/emergency instruction below long explanatory content;
- relying only on cached data without current measurement context;
- losing clinical concern flags because they are not numeric.

## Open Questions Before Full Implementation

- Which score should be the visible primary score in v1: MEWS-like + SpO2, NEWS2, or both?
- Which input fields are guaranteed from the current TTV form versus optional manual clinical flags?
- Should `clinical_concern` be a one-click nurse/doctor flag in the UI?
- How should repeated measurements be stored so trend-based alerts can work?
- Which action labels must align exactly with local Puskesmas SOP/PPK wording?
- Which patterns should be in the first implementation slice: respiratory/sepsis/shock only, or the full 70-pattern library?

## Safety Notes

This material should be treated as draft clinical decision support. The implementation must preserve clinician review, audit trail, source/rationale display, and local SOP alignment. Gate 2 can recommend escalation and first actions, but it must not silently perform clinical documentation, medication ordering, referral submission, or emergency disposition without explicit clinician action.
