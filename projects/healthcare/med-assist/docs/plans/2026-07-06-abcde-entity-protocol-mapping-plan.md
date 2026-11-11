# Entity-to-Protocol Mapping (Sub-project B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the 13 ABCDE protocols added in sub-project A (plus the 9 original ones) to the alerts that should surface them — 2 legacy gates, 30 Pattern-Engine v2 patterns — and prove the `actionProtocolId` field actually survives the alert pipeline instead of being silently dropped.

**Architecture:** A prerequisite plumbing fix (the pipeline currently computes `actionProtocolId` for pattern matches but drops it before it reaches a `ScreeningAlert`) followed by pure data changes — setting or changing one string field on already-reviewed alert/pattern objects. No thresholds, severities, or clinical wording change.

**Tech Stack:** TypeScript (strict), Vitest.

## Global Constraints

- No change to any gate logic, threshold, severity, or `recommendations`/`reasoning` text of any alert or pattern — only the `actionProtocolId` pointer field.
- The 12 patterns in the spec's "explicitly left unmapped" list (CP-031, 033, 034, 035, 039, 040, 041, 042, 062, 063, 065, 066) must end this plan with `actionProtocolId === undefined` — never accidentally force-mapped.
- `clinical-patterns.ts`'s file header states: "DO NOT modify clinical content without dr. Ferdi Iskandar review." Chief (dr. Ferdi Iskandar) authored and confirmed every mapping decision in this plan directly in-session — this satisfies that review requirement. Do not change any pattern's `title`/`reasoning`/`recommendations`/`requiredCriteria`/`scoredCriteria`/`severity` while touching these files — only `actionProtocolId`.
- Insertion convention (confirmed by reading the file): `actionProtocolId` sits immediately after a pattern's `recommendations: [...]` array closes and immediately before its `tier:` field. Every "add" step below follows this exact placement.

---

### Task 1: Thread `actionProtocolId` through the full alert pipeline (prerequisite plumbing)

**Files:**

- Modify: `components/clinical/TTVInferenceUI.tsx` (the `ScreeningAlert` interface, ~line 82-100)
- Modify: `lib/emergency-detector/pattern-engine.ts` (the `PatternScreeningAlert` interface at line 28-37, and `patternMatchesToAlerts()` at line 317-331)
- Create: `lib/emergency-detector/pattern-engine.test.ts`

**Interfaces:**

- Consumes: `PatternMatch` (already has `actionProtocolId?: string` at pattern-engine.ts line 297, confirmed by reading the file).
- Produces: `ScreeningAlert.actionProtocolId?: string` and `PatternScreeningAlert.actionProtocolId?: string` — both consumed by every later task in this plan and by `resolveActionProtocolId()` (already built, already passes through a pre-set `actionProtocolId` unchanged).

- [ ] **Step 1: Write the failing test proving `patternMatchesToAlerts()` currently drops `actionProtocolId`**

```ts
// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import { CLINICAL_PATTERNS } from './clinical-patterns';
import { buildClinicalSnapshot } from './clinical-snapshot';
import { evaluatePatterns, patternMatchesToAlerts } from './pattern-engine';

describe('patternMatchesToAlerts', () => {
  it('preserves actionProtocolId from the matched pattern onto the resulting alert', () => {
    // sbp<=100 + rr>=22 satisfies CP-001's qSOFA scoredCriteria (2 of 3,
    // minScore 2) without needing AVPU!=A.
    const snapshot = buildClinicalSnapshot(
      {
        sbp: '90',
        dbp: '60',
        hr: '95',
        rr: '24',
        temp: '38.5',
        spo2: '96',
        glucose: '100',
        symptomText: '',
        allergies: [],
        pregnancyStatus: null,
        avpu: 'A',
        supplemental_o2: false,
        pain_score: '',
      },
      { patientAge: 45 }
    );

    const matches = evaluatePatterns(snapshot, CLINICAL_PATTERNS, [], { tierFilter: ['A', 'B'] });
    const cp001Match = matches.find((m) => m.pattern.id === 'CP-001');
    expect(cp001Match).toBeDefined();

    const alerts = patternMatchesToAlerts(matches);
    const cp001Alert = alerts.find((a) => a.id === 'pattern-CP-001');
    expect(cp001Alert?.actionProtocolId).toBe('PROTO_SEPSIS');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/pattern-engine.test.ts`
Expected: FAIL — `cp001Alert?.actionProtocolId` is `undefined` (the field is computed on `PatternMatch` but dropped when converting to `PatternScreeningAlert`).

- [ ] **Step 3: Add `actionProtocolId` to `PatternScreeningAlert` and thread it through `patternMatchesToAlerts()`**

In `lib/emergency-detector/pattern-engine.ts`, find:

```ts
/** Matches the existing ScreeningAlert interface in TTVInferenceUI.tsx. */
export interface PatternScreeningAlert {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  gate: string;
  reasoning: string;
  recommendations: string[];
  clinicalData?: Record<string, number | undefined>;
}
```

Replace with:

```ts
/** Matches the existing ScreeningAlert interface in TTVInferenceUI.tsx. */
export interface PatternScreeningAlert {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  gate: string;
  reasoning: string;
  recommendations: string[];
  actionProtocolId?: string;
  clinicalData?: Record<string, number | undefined>;
}
```

Then find:

```ts
export function patternMatchesToAlerts(matches: PatternMatch[]): PatternScreeningAlert[] {
  return matches.map((m) => ({
    id: `pattern-${m.pattern.id}`,
    type: m.pattern.gate,
    severity: m.pattern.severity,
    title: m.resolvedTitle,
    gate: m.pattern.gate,
    reasoning:
      m.resolvedReasoning +
      (m.score ? ` (Score: ${m.score.achieved}/${m.score.total})` : '') +
      ` [Confidence: ${(m.confidence * 100).toFixed(0)}%]`,
    recommendations: m.pattern.recommendations,
    clinicalData: m.clinicalData,
  }));
}
```

Replace with:

```ts
export function patternMatchesToAlerts(matches: PatternMatch[]): PatternScreeningAlert[] {
  return matches.map((m) => ({
    id: `pattern-${m.pattern.id}`,
    type: m.pattern.gate,
    severity: m.pattern.severity,
    title: m.resolvedTitle,
    gate: m.pattern.gate,
    reasoning:
      m.resolvedReasoning +
      (m.score ? ` (Score: ${m.score.achieved}/${m.score.total})` : '') +
      ` [Confidence: ${(m.confidence * 100).toFixed(0)}%]`,
    recommendations: m.pattern.recommendations,
    actionProtocolId: m.pattern.actionProtocolId,
    clinicalData: m.clinicalData,
  }));
}
```

- [ ] **Step 4: Add the matching field to `ScreeningAlert` in `TTVInferenceUI.tsx`**

Find:

```ts
export interface ScreeningAlert {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'warning';
  title: string;
  gate: string;
  reasoning: string;
  recommendations: string[];
  clinicalData?: {
```

Replace with:

```ts
export interface ScreeningAlert {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'warning';
  title: string;
  gate: string;
  reasoning: string;
  recommendations: string[];
  actionProtocolId?: string;
  clinicalData?: {
```

- [ ] **Step 5: Run typecheck and the test**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx vitest run lib/emergency-detector/pattern-engine.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/clinical/TTVInferenceUI.tsx lib/emergency-detector/pattern-engine.ts lib/emergency-detector/pattern-engine.test.ts
git commit -m "fix(med-assist): thread actionProtocolId through patternMatchesToAlerts instead of dropping it"
```

---

### Task 2: Wire the 2 legacy gates (`hypertensive_crisis`, `preeclampsia_watch`)

**Files:**

- Modify: `components/clinical/TTVInferenceUI.tsx:867-879` (preeclampsia_watch alert push) and `:1123-1132` (hypertensive_crisis alert push)
- Test: `components/clinical/TTVInferenceUI.test.tsx`

**Interfaces:**

- Consumes: `ScreeningAlert.actionProtocolId` (Task 1).
- Produces: `hypertensive_crisis` and `preeclampsia_watch` alerts now carry `actionProtocolId`.

- [ ] **Step 1: Extend the existing preeclampsia test and add a new hypertensive-crisis test (both fail first)**

In `components/clinical/TTVInferenceUI.test.tsx`, find:

```ts
it('builds preeclampsia and urgent pain alerts', () => {
  const alerts = buildAlerts(
    makeState({ sbp: '145', dbp: '92', pregnancyStatus: true, pain_score: '8' }),
    { patientAge: 30 }
  );

  expect(alerts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: 'preeclampsia_watch', title: 'WASPADA PREEKLAMPSIA' }),
      expect.objectContaining({ type: 'urgent_pain' }),
    ])
  );
});
```

Replace with:

```ts
it('builds preeclampsia and urgent pain alerts', () => {
  const alerts = buildAlerts(
    makeState({ sbp: '145', dbp: '92', pregnancyStatus: true, pain_score: '8' }),
    { patientAge: 30 }
  );

  expect(alerts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'preeclampsia_watch',
        title: 'WASPADA PREEKLAMPSIA',
        actionProtocolId: 'PROTO_PREECLAMPSIA_ECLAMPSIA',
      }),
      expect.objectContaining({ type: 'urgent_pain' }),
    ])
  );
});

it('links a hypertensive_crisis alert to PROTO_HTN_EMERGENCY', () => {
  const alerts = buildAlerts(makeState({ sbp: '166', dbp: '102' }), { patientAge: 45 });

  expect(alerts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'hypertensive_crisis',
        actionProtocolId: 'PROTO_HTN_EMERGENCY',
      }),
    ])
  );
});
```

- [ ] **Step 2: Run tests to verify both fail**

Run: `npx vitest run components/clinical/TTVInferenceUI.test.tsx -t "preeclampsia and urgent pain"`
Expected: FAIL — `actionProtocolId` is `undefined` on the `preeclampsia_watch` alert.

Run: `npx vitest run components/clinical/TTVInferenceUI.test.tsx -t "links a hypertensive_crisis"`
Expected: FAIL — no `hypertensive_crisis` alert has `actionProtocolId` yet.

- [ ] **Step 3: Add `actionProtocolId` to both alert push sites**

Find:

```ts
alerts.push({
  id: 'preeclampsia-watch-alert',
  type: 'preeclampsia_watch',
  severity: 'critical',
  title: 'WASPADA PREEKLAMPSIA',
  gate: 'GATE_PREGNANCY_BP',
  reasoning: flag.message,
  recommendations: [
    'Ulangi tekanan darah dengan teknik yang benar.',
    'Evaluasi gejala preeklampsia dan segera eskalasi ke dokter.',
  ],
  clinicalData: { sbp, dbp, map },
});
```

Replace with:

```ts
alerts.push({
  id: 'preeclampsia-watch-alert',
  type: 'preeclampsia_watch',
  severity: 'critical',
  title: 'WASPADA PREEKLAMPSIA',
  gate: 'GATE_PREGNANCY_BP',
  reasoning: flag.message,
  recommendations: [
    'Ulangi tekanan darah dengan teknik yang benar.',
    'Evaluasi gejala preeklampsia dan segera eskalasi ke dokter.',
  ],
  actionProtocolId: 'PROTO_PREECLAMPSIA_ECLAMPSIA',
  clinicalData: { sbp, dbp, map },
});
```

Then find:

```ts
alerts.push({
  id: 'hypertensive-alert',
  type: 'hypertensive_crisis',
  severity: severityMap[htnSeverity] ?? 'high',
  title: titleMap[htnSeverity] ?? `Hipertensi terdeteksi (${sbp}/${dbp} mmHg)`,
  gate: 'GATE_2_BP',
  reasoning: htnResult.reasoning,
  recommendations: htnResult.recommendations,
  clinicalData: { sbp, dbp, map },
});
```

Replace with:

```ts
alerts.push({
  id: 'hypertensive-alert',
  type: 'hypertensive_crisis',
  severity: severityMap[htnSeverity] ?? 'high',
  title: titleMap[htnSeverity] ?? `Hipertensi terdeteksi (${sbp}/${dbp} mmHg)`,
  gate: 'GATE_2_BP',
  reasoning: htnResult.reasoning,
  recommendations: htnResult.recommendations,
  actionProtocolId: 'PROTO_HTN_EMERGENCY',
  clinicalData: { sbp, dbp, map },
});
```

- [ ] **Step 4: Run both tests to verify they pass**

Run: `npx vitest run components/clinical/TTVInferenceUI.test.tsx -t "preeclampsia and urgent pain"`
Expected: PASS.

Run: `npx vitest run components/clinical/TTVInferenceUI.test.tsx -t "links a hypertensive_crisis"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/clinical/TTVInferenceUI.tsx components/clinical/TTVInferenceUI.test.tsx
git commit -m "feat(med-assist): link hypertensive_crisis and preeclampsia_watch alerts to their new ABCDE protocols"
```

---

### Task 3: Category B — 11 direct new-protocol matches

**Files:**

- Modify: `lib/emergency-detector/clinical-patterns.ts` (11 patterns: CP-016, CP-036, CP-037, CP-038, CP-044, CP-045, CP-048, CP-049, CP-050, CP-060, CP-070)
- Create: `lib/emergency-detector/clinical-patterns.test.ts`

**Interfaces:**

- Consumes: `CLINICAL_PATTERNS` (already exported).
- Produces: the 11 patterns below now carry `actionProtocolId`, consumed by Task 1's `patternMatchesToAlerts()`.

- [ ] **Step 1: Write the failing test for all 11 patterns**

```ts
// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import { CLINICAL_PATTERNS } from './clinical-patterns';

const findPattern = (id: string) => CLINICAL_PATTERNS.find((p) => p.id === id);

describe('clinical-patterns actionProtocolId mapping', () => {
  describe('category B — direct match to a new protocol', () => {
    it.each([
      ['CP-016', 'PROTO_PE_AORTIC_DISSECTION'],
      ['CP-036', 'PROTO_SAFETY_NET_CLINICAL_CONCERN'],
      ['CP-037', 'PROTO_SAFETY_NET_CLINICAL_CONCERN'],
      ['CP-038', 'PROTO_SAFETY_NET_CLINICAL_CONCERN'],
      ['CP-044', 'PROTO_GERIATRIC_OCCULT_RISK'],
      ['CP-045', 'PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS'],
      ['CP-048', 'PROTO_NEURO_RED_FLAG'],
      ['CP-049', 'PROTO_PE_AORTIC_DISSECTION'],
      ['CP-050', 'PROTO_PE_AORTIC_DISSECTION'],
      ['CP-060', 'PROTO_CAUDA_EQUINA'],
      ['CP-070', 'PROTO_SAFETY_NET_CLINICAL_CONCERN'],
    ])('%s maps to %s', (id, expected) => {
      expect(findPattern(id)?.actionProtocolId).toBe(expected);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/clinical-patterns.test.ts -t "category B"`
Expected: FAIL — all 11 `actionProtocolId` values are `undefined`.

- [ ] **Step 3: Add `actionProtocolId` to each of the 11 patterns**

In `lib/emergency-detector/clinical-patterns.ts`, for each pattern below, find its `recommendations: [...]` closing followed by `tier:`, and insert the `actionProtocolId` line between them (exact surrounding text shown so the location is unambiguous; only the inserted line is new):

**CP-016** — find:

```ts
    recommendations: ['Oksigenasi, pantau SpO2/RR', 'Rujuk emergensi untuk evaluasi PE'],
    tier: 'A',
    requiresVitals: ['spo2', 'rr'],
    source: 'ESC PE Guidelines 2019',
```

Replace with:

```ts
    recommendations: ['Oksigenasi, pantau SpO2/RR', 'Rujuk emergensi untuk evaluasi PE'],
    actionProtocolId: 'PROTO_PE_AORTIC_DISSECTION',
    tier: 'A',
    requiresVitals: ['spo2', 'rr'],
    source: 'ESC PE Guidelines 2019',
```

**CP-036, CP-037, CP-038, CP-044, CP-045, CP-048, CP-049, CP-050, CP-060, CP-070** — apply the identical pattern: locate `id: 'CP-XXX'`, find that pattern's `recommendations: [...]` array, insert `actionProtocolId: 'PROTO_Y',` as the line immediately after the array's closing `],` and immediately before that pattern's `tier:` line, using the target from the Step 1 test table above for each id.

> **Note for the implementer:** the exact `recommendations` text for CP-036/037/038/044/045/048/049/050/060/070 must be read directly from the current file before editing (each is unique free text) — do not guess or paraphrase it. Use the Read tool on `lib/emergency-detector/clinical-patterns.ts`, locate each `id: 'CP-XXX'` block, and insert only the one new `actionProtocolId` line at the position confirmed above (right before that block's `tier:` line). Do not alter any other field in these blocks.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/emergency-detector/clinical-patterns.test.ts -t "category B"`
Expected: PASS (11/11).

- [ ] **Step 5: Run full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/emergency-detector/clinical-patterns.ts lib/emergency-detector/clinical-patterns.test.ts
git commit -m "feat(med-assist): link 11 patterns to their direct-match new ABCDE protocol"
```

---

### Task 4: Category C — 8 gap-fills to existing protocols

**Files:**

- Modify: `lib/emergency-detector/clinical-patterns.ts` (8 patterns: CP-003, CP-008, CP-020, CP-025, CP-028, CP-055, CP-059, CP-064)
- Test: `lib/emergency-detector/clinical-patterns.test.ts`

**Interfaces:**

- Consumes: `CLINICAL_PATTERNS` (Task 3).
- Produces: the 8 patterns below now carry `actionProtocolId` pointing at one of the 9 original protocols.

- [ ] **Step 1: Add the failing test for all 8 patterns**

In `lib/emergency-detector/clinical-patterns.test.ts`, add after the category B `describe` block:

```ts
describe('category C — gap-fill to an existing protocol', () => {
  it.each([
    ['CP-003', 'PROTO_SEPSIS'],
    ['CP-008', 'PROTO_SHOCK'],
    ['CP-020', 'PROTO_ACS'],
    ['CP-025', 'PROTO_ANAPHYLAXIS'],
    ['CP-028', 'PROTO_DKA_HHS'],
    ['CP-055', 'PROTO_SHOCK'],
    ['CP-059', 'PROTO_SEPSIS'],
    ['CP-064', 'PROTO_SEPSIS'],
  ])('%s maps to %s', (id, expected) => {
    expect(findPattern(id)?.actionProtocolId).toBe(expected);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/clinical-patterns.test.ts -t "category C"`
Expected: FAIL — all 8 `actionProtocolId` values are `undefined`.

- [ ] **Step 3: Add `actionProtocolId` to each of the 8 patterns**

Read `lib/emergency-detector/clinical-patterns.ts`, locate each `id: 'CP-XXX'` block listed in Step 1's table, and insert `actionProtocolId: 'PROTO_Y',` as the line immediately after that block's `recommendations: [...]` closing `],` and immediately before its `tier:` line (same convention as Task 3). Do not alter any other field.

Example for **CP-003** (already read earlier — confirmed current content):

```ts
    recommendations: [
      'Cari fokus infeksi (paru, UTI, kulit, abdomen)',
      'O2 bila sesak; cairan bila dehidrasi',
      'Lapor dokter',
      'Bila SBP <=100 atau kesadaran turun: curiga sepsis berat, rujuk',
    ],
    tier: 'A',
```

Replace with:

```ts
    recommendations: [
      'Cari fokus infeksi (paru, UTI, kulit, abdomen)',
      'O2 bila sesak; cairan bila dehidrasi',
      'Lapor dokter',
      'Bila SBP <=100 atau kesadaran turun: curiga sepsis berat, rujuk',
    ],
    actionProtocolId: 'PROTO_SEPSIS',
    tier: 'A',
```

Apply the same insertion to CP-008, CP-020, CP-025, CP-028, CP-055, CP-059, CP-064 using each one's target protocol from the Step 1 table.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/emergency-detector/clinical-patterns.test.ts -t "category C"`
Expected: PASS (8/8).

- [ ] **Step 5: Run full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/emergency-detector/clinical-patterns.ts lib/emergency-detector/clinical-patterns.test.ts
git commit -m "feat(med-assist): link 8 patterns to an existing ABCDE protocol (gap-fill)"
```

---

### Task 5: Category D — 11 upgrades from generic-old to specific-new

**Files:**

- Modify: `lib/emergency-detector/clinical-patterns.ts` (11 patterns: CP-029, CP-030, CP-046, CP-047, CP-052, CP-053, CP-056, CP-058, CP-067, CP-068, CP-069 — each already has an `actionProtocolId` line to **change**, not insert)
- Test: `lib/emergency-detector/clinical-patterns.test.ts`

**Interfaces:**

- Consumes: `CLINICAL_PATTERNS` (Task 4).
- Produces: the 11 patterns below now point at a more specific new protocol instead of their previous generic one.

- [ ] **Step 1: Add the failing test for all 11 patterns**

In `lib/emergency-detector/clinical-patterns.test.ts`, add after the category C `describe` block:

```ts
describe('category D — upgrade from generic-old to specific-new', () => {
  it.each([
    ['CP-029', 'PROTO_ASTHMA_COPD_EXACERBATION'],
    ['CP-030', 'PROTO_ASTHMA_COPD_EXACERBATION'],
    ['CP-046', 'PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS'],
    ['CP-047', 'PROTO_DENGUE_SHOCK'],
    ['CP-052', 'PROTO_ASTHMA_COPD_EXACERBATION'],
    ['CP-053', 'PROTO_ASTHMA_COPD_EXACERBATION'],
    ['CP-056', 'PROTO_OBSTETRIC_ABDOMEN_BLEEDING'],
    ['CP-058', 'PROTO_ASTHMA_COPD_EXACERBATION'],
    ['CP-067', 'PROTO_PE_AORTIC_DISSECTION'],
    ['CP-068', 'PROTO_TOX_RESP_DEPRESSION'],
    ['CP-069', 'PROTO_UPPER_AIRWAY_OBSTRUCTION'],
  ])('%s upgrades to %s', (id, expected) => {
    expect(findPattern(id)?.actionProtocolId).toBe(expected);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/emergency-detector/clinical-patterns.test.ts -t "category D"`
Expected: FAIL — each pattern's current `actionProtocolId` is still its old generic value (e.g. CP-029 is `'PROTO_RESP_FAILURE'`, not `'PROTO_ASTHMA_COPD_EXACERBATION'`).

- [ ] **Step 3: Change the existing `actionProtocolId` value on each of the 11 patterns**

Read `lib/emergency-detector/clinical-patterns.ts`, locate each `id: 'CP-XXX'` block from Step 1's table, and change its existing `actionProtocolId: 'PROTO_OLD',` line to the new target value. Do not alter any other field.

Example for **CP-029**: find `actionProtocolId: 'PROTO_RESP_FAILURE',` inside the block whose `id` is `'CP-029'`, replace with `actionProtocolId: 'PROTO_ASTHMA_COPD_EXACERBATION',`.

Apply the same single-line value change to CP-030, CP-046, CP-047, CP-052, CP-053, CP-056, CP-058, CP-067, CP-068, CP-069 using each one's target from the Step 1 table. Since multiple patterns currently share the same old value (e.g. several are `'PROTO_RESP_FAILURE'`), edit each occurrence individually by its surrounding `id: 'CP-XXX'` context — do not use a find-and-replace-all across the file, which would also change patterns not in this list.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/emergency-detector/clinical-patterns.test.ts -t "category D"`
Expected: PASS (11/11).

- [ ] **Step 5: Run full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/emergency-detector/clinical-patterns.ts lib/emergency-detector/clinical-patterns.test.ts
git commit -m "feat(med-assist): upgrade 11 patterns from a generic protocol to a more specific new one"
```

---

### Task 6: Regression guard — the 12 explicitly-unmapped patterns stay `undefined`

**Files:**

- Test: `lib/emergency-detector/clinical-patterns.test.ts`

**Interfaces:**

- Consumes: `CLINICAL_PATTERNS` (Tasks 3-5, now fully updated).

- [ ] **Step 1: Add the regression-guard test**

In `lib/emergency-detector/clinical-patterns.test.ts`, add after the category D `describe` block:

```ts
describe('explicitly left unmapped (no protocol fits, or too mild for ABCDE escalation)', () => {
  it.each([
    'CP-031',
    'CP-033',
    'CP-034',
    'CP-035',
    'CP-039',
    'CP-040',
    'CP-041',
    'CP-042',
    'CP-062',
    'CP-063',
    'CP-065',
    'CP-066',
  ])('%s has no actionProtocolId', (id) => {
    expect(findPattern(id)?.actionProtocolId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it passes immediately (no code change needed — this is a guard, not a RED step)**

Run: `npx vitest run lib/emergency-detector/clinical-patterns.test.ts -t "explicitly left unmapped"`
Expected: PASS (12/12) — none of Tasks 3-5 touched these ids, so this should already be true. If any of these 12 unexpectedly has an `actionProtocolId`, STOP and report it — a prior task step touched an id it shouldn't have.

- [ ] **Step 3: Commit**

```bash
git add lib/emergency-detector/clinical-patterns.test.ts
git commit -m "test(med-assist): guard the 12 intentionally-unmapped patterns against future accidental mapping"
```

---

### Task 7: Final verification (full suite)

**Files:**

- None (verification only).

- [ ] **Step 1: Run the full clinical-patterns and pattern-engine test files together**

Run: `npx vitest run lib/emergency-detector/clinical-patterns.test.ts lib/emergency-detector/pattern-engine.test.ts components/clinical/TTVInferenceUI.test.tsx`
Expected: all pass — 30 mapping assertions (11+8+11) + 12 unmapped-guard assertions + 1 pipeline-threading assertion + the 2 existing/extended `TTVInferenceUI.test.tsx` cases, zero failures.

- [ ] **Step 2: Run typecheck, lint, and the full med-assist suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint lib/emergency-detector/clinical-patterns.ts lib/emergency-detector/clinical-patterns.test.ts lib/emergency-detector/pattern-engine.ts lib/emergency-detector/pattern-engine.test.ts components/clinical/TTVInferenceUI.tsx components/clinical/TTVInferenceUI.test.tsx`
Expected: no errors.

Run: `npx vitest run`
Expected: all files passed, zero regressions (baseline before this plan: 785 passed / 9 skipped — expect 785 + 43 new assertions = 828 passed / 9 skipped, though exact new-test count may differ slightly by how vitest counts `it.each` rows; the key bar is zero failures and zero fewer passing tests than baseline).

- [ ] **Step 3: No commit needed for this task** (verification-only; if anything fails, fix in the task that owns the affected file and re-run this task).

---

## Self-Review Notes

- **Spec coverage:** All 44 mapping decisions from the design spec (2 legacy + 11 new-match + 8 gap-fill + 11 upgrade + 12 confirmed-unmapped) have a corresponding task/test. The prerequisite plumbing fix (Task 1) was not explicitly listed as a task in the spec's task description but is required by the spec's own Architecture section ("`resolveActionProtocolId()` already passes through any `alert.actionProtocolId` that's already set" — which requires the field to actually reach the alert object first) — added here to make the rest of the plan meaningful.
- **Placeholder scan:** No TBD/TODO. Task 3's Step 3 includes an explicit implementer note to read exact current text rather than guess, because reproducing all 11 patterns' full unique `recommendations` arrays verbatim in this plan would risk transcription drift from the live file — the insertion rule (right before `tier:`) is unambiguous and independently verified against 3 real examples (CP-001, CP-002, CP-003) during plan writing.
- **Type consistency:** `actionProtocolId?: string` used identically across `ScreeningAlert`, `PatternScreeningAlert`, and `ClinicalPattern` (the last already existed) — no naming drift.
- **Out-of-scope guard:** No task touches gate thresholds, severities, `steps`/`referralCriteria` content of any protocol, or sub-projects C/D.
