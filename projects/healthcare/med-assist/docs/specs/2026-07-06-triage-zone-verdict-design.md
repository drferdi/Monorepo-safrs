# Triage Zone Verdict + ABCDE Protocol Linking — Design Spec

> Status: approved by Chief (dr. Ferdi Iskandar) in-session, 2026-07-06.
> Supersedes nothing; additive to the RME vital-sign extraction + patient-bar
> warning badge feature landed earlier the same day (commits `59bdf81`→`8c338943`).

## Problem

Two related gaps surfaced while reviewing the emergency/screening UI:

1. **No single triage verdict.** `buildAlerts()` in `TTVInferenceUI.tsx` computes
   a flat, unordered list of `ScreeningAlert[]`. Insertion order in that
   function is accidental (e.g. `GATE_1_HEMODYNAMIC` is pushed before
   `GATE_0_AVPU` despite the numbering), yet `alerts[0]` is used verbatim as
   the "Prioritas" line in `buildSummary()`'s AUTOSEN text — meaning the
   displayed priority can be wrong whenever a lower-severity alert happens to
   be pushed first. Separately, `EmergencyDashboard` renders `alerts` in that
   same accidental order, so the worst finding is not guaranteed to appear
   first.
2. **Tatalaksana (stabilization protocol) is computed but never shown.**
   Every `ScreeningAlert` already carries a `recommendations: string[]` array,
   but `EmergencyDashboard` only renders `title` + `reasoning` — the
   recommendations are silently dropped. Separately, 39 of the 70
   Pattern-Engine v2 patterns (`clinical-patterns.ts`) already reference a
   structured 9-protocol ABCDE stabilization guide
   (`action-protocols.ts`, sourced from PMK 47/2018, WHO, AHA, PERKENI, etc.),
   but the link (`actionProtocolId`) is computed in `pattern-engine.ts` and
   then dropped when converting to `ScreeningAlert` shape
   (`patternMatchesToAlerts()`). The 12 legacy inline gates in `buildAlerts()`
   never reference `action-protocols.ts` at all. Net effect: a fully-reviewed,
   sourced stabilization protocol exists in the codebase and is invisible to
   the physician.

Separately, the sidepanel's third tab is hardcoded `'CODE RED'` — both as the
tab label (`SidePanelHeader.tsx`) and the section breadcrumb
(`main.tsx`'s `engineConfig`). This label appears for _any_ alert regardless
of severity (even a lone Stage 1 hypertension finding), which is why Chief's
early testing read "tensi sedikit tinggi" as "going to CODE RED" — it wasn't
a threshold bug, it was static branding independent of actual severity.

## Scope

**In scope:**

- A new pure function that computes one triage verdict (zone + headline alert
  - severity-sorted alert list) from the alerts `buildAlerts()` already
    produces. No existing gate, threshold, or pattern is changed.
- A new pure function that resolves an `actionProtocolId` for alerts that
  don't already carry one (the 12 legacy inline gates), using only
  unambiguous 1:1 mappings — confirmed with Chief per the mapping table in
  "Action Protocol Resolution" below. Ambiguous cases are explicitly left
  unmapped, not guessed.
- Threading the already-computed but dropped `actionProtocolId` through
  `patternMatchesToAlerts()`.
- Rendering `recommendations` and (when resolvable) the full ABCDE protocol
  steps + referral criteria in `EmergencyDashboard`.
- Renaming the tab label from "CODE RED" to "TRIAGE" (`SidePanelHeader.tsx`
  engineButtons array, `main.tsx` engineConfig.emergency.section) and driving
  its color indicator from the computed zone instead of a flat red-only
  alert-active state.
- Fixing `buildSummary()`'s "Prioritas" line to use the computed headline
  alert instead of `alerts[0]`.

**Out of scope (explicitly deferred, not silently done):**

- Creating a hypertension-crisis-specific ABCDE protocol (`PROTO_HTN`) — does
  not exist today; HTN gate already has thorough embedded recommendations via
  `htn-classifier.ts`'s `getHTNRecommendations()`.
- Creating an eclampsia protocol (MgSO4 dosing, etc.) — confirmed gap from
  earlier analysis this session; needs its own spec + dr. Ferdi review as
  new clinical content, not a linking task.
- Any change to `clinical-patterns.ts` thresholds/content, `htn-classifier.ts`,
  `vital-guardrails.ts` thresholds, or any of the 9 existing `action-protocols.ts`
  entries. This spec only _links to_ and _renders_ existing reviewed content.
- Automated 15-minute re-triage reminder, Sisrute integration — separate,
  larger features raised earlier in this session; not part of this spec.

## Architecture

Two new pure modules, following this codebase's existing convention of
structurally-duplicating the `ScreeningAlert` shape rather than importing it
from the component file (see `PatternScreeningAlert` in `pattern-engine.ts`,
which carries a comment "Matches the existing ScreeningAlert interface in
TTVInferenceUI.tsx" instead of an import) — this keeps `lib/` decoupled from
the protected component file.

### 1. `lib/emergency-detector/triage-verdict.ts`

```ts
export type TriageZone = 'standby' | 'hijau' | 'kuning' | 'merah';

export interface TriageAlertLike {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'warning';
  gate: string;
}

export interface TriageVerdict<T extends TriageAlertLike> {
  zone: TriageZone;
  headlineAlert: T | null;
  sortedAlerts: T[];
}

export function computeTriageVerdict<T extends TriageAlertLike>(
  alerts: T[],
  hasVitalsEntered: boolean
): TriageVerdict<T>;
```

**Zone logic:**

- `!hasVitalsEntered` → `'standby'` (nothing assessed yet — never shown as
  `'hijau'`; a green light on an un-triaged patient reads as "cleared" and is
  unsafe per the explicit correction earlier this session).
- Else, worst severity present across `alerts` determines the zone:
  `critical` → `'merah'`, `high`/`warning` → `'kuning'`, no alerts → `'hijau'`.
- Zone is computed independently from headline-alert selection (from worst
  severity across the full list), not derived from whichever alert becomes
  the headline — keeping the two concerns decoupled per the earlier review.

**Sorting / headline selection:**

- Primary key: severity tier, all 3 distinct values ranked
  `critical` > `high` > `warning` — not merged, even though `high` and
  `warning` both map to zone `'kuning'`. Keeping them distinct means a
  `high` alert (e.g. tachycardia) always outranks a `warning` alert (e.g.
  mild fever) in display order, instead of an arbitrary tie within a merged
  bucket. Zone computation (above) still only cares whether the worst tier
  present is critical vs. high-or-warning vs. none.
- Secondary key (tie-breaker within the same severity tier): a fixed gate-priority
  table (`TRIAGE_GATE_PRIORITY`), reflecting Chief's proposed ABCDE-style
  check order, corrected to put glucose ahead of hemodynamic/shock
  (hypoglycemia can mimic shock — already documented in
  `occult-shock-detector.ts`'s `integratedTTVWorkflow()`):
  1. `GATE_CODE_RED`
  2. `GATE_0_AVPU`
  3. `GATE_3_GLUCOSE`
  4. `GATE_1_HEMODYNAMIC`, `GATE_1B_GERIATRIC_ORTHOSTATIC`, `GATE_SHOCK_INDEX`
  5. `GATE_2_BP`
  6. `GATE_SEPSIS_EARLY`, `GATE_SEPTIC_SHOCK_HIGH`
  7. `GATE_4_RESPIRATORY`, `GATE_RESP_FAILURE`, `GATE_RESP_ASTHMA_COPD`
  8. `GATE_5_CIRCULATION`, `GATE_5B_CIRCULATION_LOW`
  9. `GATE_6_RESP_RATE`, `GATE_6B_RESP_RATE_LOW`
  10. `GATE_7_TEMPERATURE`, `GATE_7B_GERIATRIC_AFEBRILE`
  11. `GATE_STROKE`, `GATE_ACS`, `GATE_ANAPHYLAXIS`, `GATE_DKA_HHS`,
      `GATE_PE_SUSPECT`, `GATE_ANEMIA_BLEED_CHRONIC`
  12. `GATE_PAIN`, `GATE_PREGNANCY_BP`, `GATE_PATIENT_CONTEXT`
  13. Any unrecognized gate string → sorts last within its tier (never throws).

- Tertiary key: original array index (stable sort), so equal-priority alerts
  keep their `buildAlerts()` order.
- `headlineAlert` = `sortedAlerts[0]`, or `null` if the list is empty.

This function does not change, skip, or re-run any gate. It only ranks
output that `buildAlerts()` already produced in full.

### 2. `lib/emergency-detector/action-protocol-resolver.ts`

```ts
export interface ProtocolResolvableAlert {
  id: string;
  type: string;
  gate: string;
  actionProtocolId?: string;
  clinicalData?: { sbp?: number };
}

export function resolveActionProtocolId(alert: ProtocolResolvableAlert): string | undefined;
```

Behavior: if `alert.actionProtocolId` is already set (Pattern-Engine v2
alerts, once wiring below is fixed), return it unchanged. Otherwise, look up
by `alert.type` / `alert.gate` / (for CODE RED cues) the field encoded in
`alert.id` suffix (`guardrail-code-red-${field}`, e.g. `'guardrail-code-red-sbp'`),
using only the confirmed unambiguous mappings:

| Match                                                                                                                                                                                                     | → Protocol                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `type === 'hypotension'`                                                                                                                                                                                  | `PROTO_SHOCK`                                            |
| `type === 'occult_shock'`                                                                                                                                                                                 | `PROTO_SHOCK`                                            |
| `type === 'hypoglycemia'`                                                                                                                                                                                 | `PROTO_HYPOGLYCEMIA`                                     |
| `type === 'hyperglycemia'`                                                                                                                                                                                | `PROTO_DKA_HHS`                                          |
| `type === 'hypoxia'`                                                                                                                                                                                      | `PROTO_RESP_FAILURE`                                     |
| `id` ends `code-red-spo2`                                                                                                                                                                                 | `PROTO_RESP_FAILURE`                                     |
| `id` ends `code-red-rr`                                                                                                                                                                                   | `PROTO_RESP_FAILURE`                                     |
| `id` ends `code-red-glucose`                                                                                                                                                                              | `PROTO_HYPOGLYCEMIA` (only `<50` triggers this cue)      |
| `id` ends `code-red-sbp` **and** `clinicalData.sbp < 80`                                                                                                                                                  | `PROTO_SHOCK`                                            |
| everything else (AVPU, BP/HTN, HR/RR without shock criteria, temperature alone, pain, pregnancy-BP, patient-context, `code-red-hr`, `code-red-sbp` with `sbp > 200`, symptom-phrase-driven CODE RED cues) | `undefined` — falls back to `alert.recommendations` only |

No new protocol content is authored. `undefined` is a valid, expected
outcome for most legacy gates — the UI must handle it (see Error Handling).

### 3. Wiring changes (existing files, additive only)

- **`lib/emergency-detector/pattern-engine.ts`**: add `actionProtocolId?: string`
  to `PatternScreeningAlert`; add `actionProtocolId: m.pattern.actionProtocolId`
  to the object built in `patternMatchesToAlerts()` (currently the only
  missing field — `m.pattern.actionProtocolId` is already computed one
  function up).
- **`components/clinical/TTVInferenceUI.tsx`**:
  - Add `actionProtocolId?: string` to `ScreeningAlert`.
  - At the end of `buildAlerts()` (after the Pattern-Engine v2 push, before
    `return alerts`), map every alert to fill `actionProtocolId` via
    `resolveActionProtocolId()` only where not already set:
    `{ ...alert, actionProtocolId: alert.actionProtocolId ?? resolveActionProtocolId(alert) }`.
  - `buildSummary()`: replace **both** `alerts[0]` usages —
    the "Prioritas" line (`alerts[0].severity`/`.title`) **and** the
    "Tindakan awal" line (`alerts[0].recommendations[0]`, line 1454) — with
    `computeTriageVerdict(alerts, hasVitalsEntered(state)).headlineAlert`.
    `hasVitalsEntered` = true if any of `state.sbp/dbp/hr/rr/temp/spo2/glucose`
    is a non-empty string. This is the second, previously-unnoticed spot
    where insertion-order accidentally stood in for priority — it directly
    answers Chief's "tatalaksana awal" ask, since it's literally labeled
    "Tindakan awal" (initial action) in the AUTOSEN summary text.
  - The in-form "TEMUAN KLINIS" preview (`alert-timeline-preview`, currently
    `alerts.slice(0, 3)`) switches to
    `computeTriageVerdict(alerts, hasVitalsEntered).sortedAlerts.slice(0, 3)`
    — same content, correct order, no new UI element.
- **`components/sidepanel/SidePanelHeader.tsx`**:
  - `engineButtons`: `{ id: 'emergency', label: 'CODE RED' }` →
    `{ id: 'emergency', label: 'TRIAGE' }`.
  - New prop `triageZone?: TriageZone` (default `'standby'`).
  - Tab dot: replace the current flat `engine-btn--alert-active` (always red)
    with zone-driven modifier classes — `engine-btn--triage-merah` (reuses
    existing red styling), `engine-btn--triage-kuning` (new amber variant),
    `engine-btn--triage-hijau` (new variant using the existing emerald accent
    token, matching Chief's established UI taste), and no modifier class for
    `'standby'` (tab looks neutral, exactly as it does today before any
    alert exists).
- **`entrypoints/sidepanel/main.tsx`**:
  - `engineConfig.emergency.section`: `'CODE RED'` → `'TRIAGE'`.
  - New `useMemo` computing `triageVerdict = computeTriageVerdict(emergencyAlerts, hasVitalsEntered)`,
    recomputed when `emergencyAlerts` or the 7 vital fields change.
  - Pass `triageZone={triageVerdict.zone}` to `<SidePanelHeader>` (`alertCount`
    prop stays as-is, still used for the numeric tally).
  - `<EmergencyDashboard alerts={emergencyAlerts} />` →
    `<EmergencyDashboard alerts={triageVerdict.sortedAlerts} />`.
  - `EmergencyDashboard` (function defined in the same file): render
    `alert.recommendations` under `reasoning` (currently dropped entirely);
    when `alert.actionProtocolId` resolves via `getActionProtocol(id)`
    (`lib/emergency-detector/action-protocols.ts`), render its ABCDE `steps`
    (grouped by phase) and `referralCriteria` in a distinct block; when it
    does not resolve, show only `recommendations` (existing short list) —
    never show a placeholder like "no protocol" for the common no-match case.

## Data Flow

```
buildAlerts() [unchanged: every gate still runs, nothing skipped]
  → alerts: ScreeningAlert[] (each now carries actionProtocolId where resolvable)
  → computeTriageVerdict(alerts, hasVitalsEntered)
      → { zone, headlineAlert, sortedAlerts }
  → zone      → SidePanelHeader TRIAGE tab color
  → headlineAlert → buildSummary() "Prioritas" line
  → sortedAlerts  → TEMUAN KLINIS preview (top 3) + EmergencyDashboard (full list)
        each EmergencyDashboard entry → recommendations, and
        getActionProtocol(actionProtocolId) → ABCDE steps + referral criteria (if resolvable)
```

## Error Handling

- Unknown/future `gate` string in the priority table → sorts last within its
  severity tier (`Number.MAX_SAFE_INTEGER` fallback), never throws.
- `resolveActionProtocolId()` returning `undefined` is the expected, common
  case (most legacy gates) — UI falls back to `recommendations` only, no
  error state.
- `getActionProtocol(id)` returning `undefined` (stale/typo'd id) → same
  fallback as above, treated identically to "no id resolved".
- Empty `alerts` array with `hasVitalsEntered = true` → zone `'hijau'`,
  `headlineAlert = null`, `EmergencyDashboard` keeps its existing
  "Tidak ada temuan darurat aktif" empty state.
- `hasVitalsEntered = false` → zone `'standby'` regardless of alerts content
  (should be empty anyway, but standby wins if this invariant is ever
  violated — never show green on unassessed data).

## Testing Plan

- `computeTriageVerdict`: standby-before-vitals, hijau-with-no-findings,
  kuning-with-warning-only, kuning-with-high-only, merah-with-any-critical,
  same-tier tie-break ordering (hypoglycemia `critical` + hypotension
  `critical` present together → hypoglycemia wins headline, proving glucose
  is checked/ranked ahead of hemodynamic per the corrected order), unknown
  gate string doesn't throw and sorts last, stable order for equal-priority
  ties, `high` sorts ahead of `warning` within the same zone.
- `resolveActionProtocolId`: each confirmed 1:1 mapping row, the `sbp`
  direction split (`<80` → `PROTO_SHOCK`, `>200` → `undefined`), the `hr`
  cue (always `undefined`, both directions), already-set `actionProtocolId`
  passes through unchanged, unmatched type/gate → `undefined`.
- `patternMatchesToAlerts`: `actionProtocolId` now present on the returned
  object when the source pattern has one, absent when it doesn't.
- `buildSummary`: "Prioritas" line reflects the computed headline, not
  insertion order (regression test reproducing the
  `GATE_1_HEMODYNAMIC`-before-`GATE_0_AVPU` ordering bug).
- `EmergencyDashboard`: renders `recommendations`; renders ABCDE steps +
  referral criteria when `actionProtocolId` resolves; falls back cleanly
  when it doesn't; list order reflects `sortedAlerts` not raw `alerts`.
- `SidePanelHeader`: tab label reads "TRIAGE"; correct modifier class per
  `triageZone` value including `'standby'` (no modifier class).

## Open Assumptions

- Zone color CSS values (amber for kuning, emerald for hijau) will follow
  existing Sentra design tokens already used elsewhere in `style.css`
  (`--neu-*` / emerald accent) rather than introducing new ad-hoc colors —
  exact token names to be confirmed against `style.css` during
  implementation, not invented here.
- `PROTO_HTN` and an eclampsia protocol remain explicitly out of scope per
  above; if Chief wants either prioritized next, it is a separate spec.
