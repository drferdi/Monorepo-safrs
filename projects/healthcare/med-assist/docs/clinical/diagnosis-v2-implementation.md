# Diagnosis V2 Implementation

## Current behavior

- Production diagnosis flow stays on Iskandar Diagnosis Engine V1.
- Diagnosis V2 runs only when `SENTRA_DIAGNOSIS_V2_SHADOW=true`.
- Shadow mode does not replace, reorder, or auto-apply the production diagnosis shown to clinicians.

## Structural improvement

- `lib/iskandar-diagnosis-engine/diagnosis-v2.ts` adds a parallel differential-ranking pass for shadow evaluation.
- The V2 comparator returns only de-identified telemetry fields:
  - `v1_top5_icd`
  - `v2_top5_icd`
  - `top1_changed`
  - `critical_differential_added`
  - `v2_uncertainty_level`
  - `v2_primary_abstained`
- Shadow telemetry is logged without complaint text, patient names, record numbers, addresses, phone numbers, or other patient-identifiable text.

## Clinical safety positioning

- Diagnosis V2 is designed to support diagnostic reasoning.
- Output is framed as differential considerations.
- The physician remains final decision-maker.

The implementation must not describe the system as autonomously diagnosing patients.

## Validation checks

- `npm run typecheck`
- `npm run test -- lib/iskandar-diagnosis-engine/diagnosis-v2.test.ts`

## Flag setup

Use the following environment flag to enable shadow mode:

```env
SENTRA_DIAGNOSIS_V2_SHADOW=true
```

`wxt.config.ts` exposes the `SENTRA_` prefix so the shadow flag can be read without promoting V2 into the production path.
