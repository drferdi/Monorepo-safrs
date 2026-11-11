# Refactor UI Extraction Spec

Tanggal: 2026-06-18

## Rule

Preserve named exports, default exports, props, rendered labels, CSS class names, message names, and storage keys.

After each extraction pass, run the validation commands for the affected component plus `npm run typecheck` and `npm run lint` before starting the next helper group.

## `components/clinical/TTVInferenceUI.tsx`

Current behavior:

- Renders the vital screening UI.
- Builds screening alerts.
- Builds canonical triage input.
- Runs canonical bridge evaluation.
- Handles doctor consult.
- Uses `TextEffect`, sound, field priority, AVPU, vital autocomplete, and occult shock helpers.

Extraction order:

1. Move pure formatting and parsing helpers to `components/clinical/ttv-inference.helpers.ts`.
2. Move alert assembly helpers to `components/clinical/ttv-alerts.ts`.
3. Move doctor consult view-model helpers to `components/clinical/ttv-forward-doctor.ts`.
4. Keep `TTVInferenceUI` as the public component facade.

Canonical triage input builder and bridge evaluation side-effect stay in the `TTVInferenceUI` facade until a dedicated tested pass extracts them.
Pure request-id/payload shaping may move only after `canonical-triage-builder.test.ts` is included in validation.

Validation:

- `npm run test -- components/clinical/TTVInferenceUI.test.tsx components/clinical/TTVInferenceUI.forward-doctor.test.tsx components/clinical/buildAlerts.extended.test.ts lib/clinical/vital-autocomplete.test.ts`
- `npm run typecheck`
- `npm run lint`

## `components/clinical/ClinicalDifferential.tsx`

Current behavior:

- Renders differential diagnosis UI.
- Calls canonical differential and local fallback.
- Promotes chronic and fallback diagnosis candidates.
- Manages therapy recommendations.
- Builds RME transfer payloads and progress state.

Extraction order:

1. Move pure diagnosis helpers to `components/clinical/clinical-differential.helpers.ts`.
2. Move transfer state helper functions to `components/clinical/clinical-differential-transfer.ts`.
3. Move therapy selection helpers to `components/clinical/clinical-differential-therapy.ts`.
4. Keep `ClinicalDifferential` as the public component facade.

Validation:

- `npm run test -- components/clinical/ClinicalDifferential.helpers.test.ts lib/rme/payload-mapper.test.ts lib/rme/transfer-orchestrator.test.ts`
- `npm run typecheck`
- `npm run lint`

Run `components/clinical/ClinicalDifferential.autoselect.test.tsx` when that pending test lands on this branch.

## Review Boundary

Each extraction pass should move one helper group only. If rendered JSX changes in the same pass, split the change.
