# Triage Zone Severity Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 10 confirmed severity misclassifications (out of ~91 alert-
generating entities) against Chief's MERAH/KUNING zone spec, and add a
permanent regression test that encodes the zone-classification rules so
future drift is caught automatically.

**Architecture:** Write the comprehensive audit test first (documenting
expected zone for every CP-pattern plus a representative, well-verified set
of legacy `buildAlerts()` entities), confirm it fails on exactly the 10
known-wrong rows, then fix each of the 10 `severity` values in place, then
update the 2 pre-existing tests whose assertions encode the old (now
incorrect) behavior.

**Tech Stack:** TypeScript strict, Vitest.

## Global Constraints

- Only `severity` field values change — no gate, threshold, criteria, or
  clinical-content changes anywhere in this plan.
- The 7 lower-confidence entities (`CP-038`, `CP-059`, `CP-063`, `CP-065`,
  `CP-066`, `CP-043`, `CP-068`) are explicitly NOT changed — they get a
  `describe.skip` block with an inline comment, not silently omitted.
- Full source spec: `docs/specs/2026-07-07-triage-zone-severity-audit-design.md`.

---

### Task 1: Write the comprehensive zone-classification audit test

**Files:**

- Create: `lib/emergency-detector/zone-classification-audit.test.ts`

**Interfaces:**

- Consumes: `CLINICAL_PATTERNS` from `@/lib/emergency-detector/clinical-patterns`
  (read-only — each pattern's real `severity` field, no changes yet in this
  task), `computeTriageVerdict` from `@/lib/emergency-detector/triage-verdict`
  (already built, zero changes), `buildAlerts` from
  `@/components/clinical/TTVInferenceUI` (already built, zero changes in
  this task — the 3 legacy fixes land in Task 3).
- Produces: nothing consumed by later tasks — this is the audit artifact
  itself. Task 2 and Task 3 make this file's currently-failing rows pass.

- [ ] **Step 1: Write the test file**

Create `lib/emergency-detector/zone-classification-audit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { buildAlerts, type ScreeningAlert } from '@/components/clinical/TTVInferenceUI';
import { CLINICAL_PATTERNS } from '@/lib/emergency-detector/clinical-patterns';
import { computeTriageVerdict } from '@/lib/emergency-detector/triage-verdict';

function findPattern(id: string) {
  const pattern = CLINICAL_PATTERNS.find((p) => p.id === id);
  if (!pattern) throw new Error(`Pattern ${id} not found in CLINICAL_PATTERNS`);
  return pattern;
}

function zoneForPattern(id: string): 'merah' | 'kuning' {
  const pattern = findPattern(id);
  const syntheticAlert: ScreeningAlert = {
    id: `synthetic-${pattern.id}`,
    type: pattern.gate,
    severity: pattern.severity,
    title: pattern.title,
    gate: pattern.gate,
    reasoning: '',
    recommendations: [],
  };
  const zone = computeTriageVerdict([syntheticAlert], true).zone;
  if (zone !== 'merah' && zone !== 'kuning') {
    throw new Error(`Unexpected zone ${zone} for single non-empty alert`);
  }
  return zone;
}

const makeState = (
  overrides: Partial<Parameters<typeof buildAlerts>[0]> = {}
): Parameters<typeof buildAlerts>[0] => ({
  sbp: '',
  dbp: '',
  hr: '',
  rr: '',
  temp: '',
  spo2: '',
  glucose: '',
  symptomText: '',
  allergies: [],
  pregnancyStatus: null,
  disabilityType: '',
  obesityConfirmation: '',
  autosenPreset: 'adl',
  avpu: 'A',
  supplemental_o2: false,
  pain_score: '',
  ...overrides,
});

function zoneForLegacyType(
  type: string,
  state: Parameters<typeof buildAlerts>[0],
  patient: Parameters<typeof buildAlerts>[1] = { patientAge: 45 }
) {
  const alerts = buildAlerts(state, patient);
  const alert = alerts.find((a) => a.type === type);
  if (!alert) throw new Error(`No alert of type ${type} fired for the given state`);
  return computeTriageVerdict([alert], true).zone;
}

describe('zone-classification audit — Pattern-Engine v2 (CP-*) — MERAH', () => {
  it.each([
    'CP-002',
    'CP-006',
    'CP-007',
    'CP-010',
    'CP-011',
    'CP-012',
    'CP-014',
    'CP-015',
    'CP-017',
    'CP-018',
    'CP-019',
    'CP-021',
    'CP-022',
    'CP-023',
    'CP-024',
    'CP-026',
    'CP-027',
    'CP-030',
    'CP-032',
    'CP-036',
    'CP-045',
    'CP-046',
    'CP-047',
    'CP-048',
    'CP-054',
    'CP-055',
    'CP-056',
    'CP-057',
    'CP-060',
    'CP-061',
    'CP-062',
    'CP-064',
    'CP-067',
    'CP-069',
    'CP-070',
  ])('%s resolves to zone merah', (id) => {
    expect(zoneForPattern(id)).toBe('merah');
  });
});

describe('zone-classification audit — Pattern-Engine v2 (CP-*) — KUNING', () => {
  it.each([
    'CP-001',
    'CP-003',
    'CP-004',
    'CP-005',
    'CP-008',
    'CP-009',
    'CP-013',
    'CP-016',
    'CP-020',
    'CP-025',
    'CP-028',
    'CP-029',
    'CP-031',
    'CP-033',
    'CP-034',
    'CP-035',
    'CP-037',
    'CP-039',
    'CP-040',
    'CP-041',
    'CP-042',
    'CP-044',
    'CP-049',
    'CP-050',
    'CP-051',
    'CP-052',
    'CP-053',
    'CP-058',
  ])('%s resolves to zone kuning', (id) => {
    expect(zoneForPattern(id)).toBe('kuning');
  });
});

describe('zone-classification audit — legacy buildAlerts() entities — MERAH', () => {
  it('hypotension resolves to merah', () => {
    expect(zoneForLegacyType('hypotension', makeState({ sbp: '85', dbp: '55', hr: '95' }))).toBe(
      'merah'
    );
  });

  it('hypoglycemia (critical, glucose < 54) resolves to merah', () => {
    expect(zoneForLegacyType('hypoglycemia', makeState({ glucose: '40' }))).toBe('merah');
  });

  it('hypoxia (SpO2 critical) resolves to merah', () => {
    expect(zoneForLegacyType('hypoxia', makeState({ spo2: '85' }))).toBe('merah');
  });

  it('code_red_cue resolves to merah', () => {
    expect(
      zoneForLegacyType(
        'code_red_cue',
        makeState({ symptomText: 'nyeri dada dan sesak berat', spo2: '89', rr: '32' })
      )
    ).toBe('merah');
  });

  it('avpu_abnormal (AVPU=V, SBP 85) resolves to merah', () => {
    expect(zoneForLegacyType('avpu_abnormal', makeState({ sbp: '85', hr: '80', rr: '18' }))).toBe(
      'merah'
    );
  });

  it('hypertensive_crisis pediatric-severe-threshold resolves to merah', () => {
    // Toddler (1-3y) severeHypertensionSbp/Dbp = 130/85 (vital-screening-thresholds.ts)
    // — unconditionally critical for pediatric patients, unlike the adult
    // crisis tier (no HMOD-based split for pediatric severe HTN).
    expect(
      zoneForLegacyType('hypertensive_crisis', makeState({ sbp: '135', dbp: '90' }), {
        patientAge: 2,
      })
    ).toBe('merah');
  });
});

describe('zone-classification audit — legacy buildAlerts() entities — KUNING', () => {
  it('urgent_pain resolves to kuning', () => {
    expect(
      zoneForLegacyType('urgent_pain', makeState({ sbp: '120', dbp: '80', pain_score: '8' }))
    ).toBe('kuning');
  });

  it('borderline_hypoxia resolves to kuning', () => {
    expect(zoneForLegacyType('borderline_hypoxia', makeState({ spo2: '93' }))).toBe('kuning');
  });

  it('preeclampsia_watch (mild BP elevation, not severe) resolves to kuning', () => {
    // vital-guardrails.ts requires patient.gender === 'P' for this soft
    // flag — must be passed explicitly, the default patient object in
    // zoneForLegacyType only sets patientAge.
    expect(
      zoneForLegacyType(
        'preeclampsia_watch',
        makeState({ sbp: '145', dbp: '92', pregnancyStatus: true }),
        { patientAge: 28, patientGender: 'P' }
      )
    ).toBe('kuning');
  });

  it('hypertensive_crisis adult crisis-tier (no HMOD data available) resolves to kuning', () => {
    expect(zoneForLegacyType('hypertensive_crisis', makeState({ sbp: '185', dbp: '112' }))).toBe(
      'kuning'
    );
  });

  it('geriatric_low_grade_fever resolves to kuning', () => {
    // This gate only fires for older-adult physiology — patientAge must be
    // explicitly overridden past the default (45) to a geriatric age.
    expect(
      zoneForLegacyType(
        'geriatric_low_grade_fever',
        makeState({
          temp: '37.5',
          rr: '22',
          spo2: '94',
          symptomText: 'Lemas, bingung, dan intake turun sejak kemarin',
        }),
        { patientAge: 76 }
      )
    ).toBe('kuning');
  });

  it('context_note resolves to kuning', () => {
    expect(
      zoneForLegacyType(
        'context_note',
        makeState({ sbp: '130', dbp: '80', obesityConfirmation: 'morbid_obesity' })
      )
    ).toBe('kuning');
  });
});

// Explicitly deferred — flagged during the 2026-07-07 audit as lower
// confidence / genuinely debatable, not changed. See
// docs/specs/2026-07-07-triage-zone-severity-audit-design.md "Explicitly
// deferred" section for the reasoning behind each.
describe.skip('zone-classification audit — deferred, not fixed this round', () => {
  it.each([
    ['CP-038', 'deteriorasi progresif — ambiguous whether warning is too low'],
    ['CP-059', 'neutropenic sepsis — real-world "always urgent" convention vs mild-fever title'],
    ['CP-063', 'aritmia + near-syncope — referral-trigger, not resuscitation-tier'],
    ['CP-065', 'cardiac red flag remaja — referral-trigger, not resuscitation-tier'],
    ['CP-066', 'infeksi jaringan dalam DM — confirmed severe wound evidence required to fire'],
    ['CP-043', 'depresi napas obat — not explicitly zoned by name in Chief spec'],
    ['CP-068', 'overdosis obat borderline — not explicitly zoned by name in Chief spec'],
  ])('%s deferred: %s', () => {
    // Intentionally skipped — see comment above.
  });
});
```

- [ ] **Step 2: Run the test file and confirm exactly 10 rows fail**

Run: `pnpm vitest run lib/emergency-detector/zone-classification-audit.test.ts`

Expected: FAIL on exactly these 10 test cases (all others PASS, proving the
audit's assumptions about the other ~74 entities are correct as currently
coded):

- `CP-019 resolves to zone merah` (currently `high` → `kuning`)
- `CP-032 resolves to zone merah` (currently `high` → `kuning`)
- `CP-055 resolves to zone merah` (currently `high` → `kuning`)
- `CP-060 resolves to zone merah` (currently `high` → `kuning`)
- `CP-062 resolves to zone merah` (currently `warning` → `kuning`)
- `CP-064 resolves to zone merah` (currently `high` → `kuning`)
- `CP-070 resolves to zone merah` (currently `warning` → `kuning`)
- `avpu_abnormal (AVPU=V, SBP 85) resolves to merah` (currently `high` → `kuning`)
- `preeclampsia_watch (mild BP elevation, not severe) resolves to kuning` (currently `critical` → `merah`)
- `hypertensive_crisis adult crisis-tier (no HMOD data available) resolves to kuning` (currently `critical` → `merah`)

If any OTHER row fails, or one of these 10 unexpectedly passes, STOP — that
means either this task's understanding of current code is wrong, or a
previous session already changed something. Do not proceed to Task 2 until
exactly these 10 rows (and only these 10) are red.

- [ ] **Step 3: Commit**

```bash
git add lib/emergency-detector/zone-classification-audit.test.ts
git commit -m "test(med-assist): add zone-classification audit — 10 known-failing rows document the gap"
```

---

### Task 2: Fix 7 severity values in `clinical-patterns.ts`

**Files:**

- Modify: `lib/emergency-detector/clinical-patterns.ts` (7 one-line changes)
- Test: `lib/emergency-detector/zone-classification-audit.test.ts` (from Task 1)

**Interfaces:**

- Consumes: nothing new.
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Change `CP-019`'s severity**

In `lib/emergency-detector/clinical-patterns.ts`, find the `CP-019` object
(title: `'Hipertensi berat + nyeri dada — curiga ACS/Stroke'`) and change:

```ts
    severity: 'high',
```

to:

```ts
    severity: 'critical',
```

(This is the only `severity:` line inside the `CP-019` object — identify it
by the surrounding `id: 'CP-019',` line directly above.)

- [ ] **Step 2: Change `CP-032`'s severity**

Find the `CP-032` object (title: `'Anemia berat + tanda syok — HR {hr}, SBP {sbp}'`)
and change its `severity: 'high',` to `severity: 'critical',`.

- [ ] **Step 3: Change `CP-055`'s severity**

Find the `CP-055` object (title: `'Emergensi abdomen — nyeri perut hebat + hemodinamik tidak stabil'`)
and change its `severity: 'high',` to `severity: 'critical',`.

- [ ] **Step 4: Change `CP-060`'s severity**

Find the `CP-060` object (title: `'Cauda equina syndrome — emergensi neurologis'`)
and change its `severity: 'high',` to `severity: 'critical',`.

- [ ] **Step 5: Change `CP-062`'s severity**

Find the `CP-062` object (title: `'Hipertiroid / thyroid storm — HR {hr}'`)
and change its `severity: 'warning',` to `severity: 'critical',`.

- [ ] **Step 6: Change `CP-064`'s severity**

Find the `CP-064` object (title: `'Delirium akut — lansia + bingung + vital hampir normal'`)
and change its `severity: 'high',` to `severity: 'critical',`.

- [ ] **Step 7: Change `CP-070`'s severity**

Find the `CP-070` object (title: `'Kekhawatiran klinis — pasien tampak lebih sakit dari angka'`)
and change its `severity: 'warning',` to `severity: 'critical',`.

- [ ] **Step 8: Run the audit test — confirm exactly these 7 rows now pass**

Run: `pnpm vitest run lib/emergency-detector/zone-classification-audit.test.ts`

Expected: the 7 `CP-*` rows from Task 1's failing list now PASS. The 3
legacy rows (`avpu_abnormal`, `preeclampsia_watch`, `hypertensive_crisis`)
still FAIL — that's expected, Task 3 fixes those.

- [ ] **Step 9: Run the full clinical-patterns test file to check no regression**

Run: `pnpm vitest run lib/emergency-detector/clinical-patterns.test.ts`
Expected: all tests PASS (this file asserts `actionProtocolId` mappings,
not `severity` — unaffected by this change, per the Task 1 exploration that
confirmed no existing test asserts on these 7 patterns' severity).

- [ ] **Step 10: Commit**

```bash
git add lib/emergency-detector/clinical-patterns.ts
git commit -m "fix(med-assist): upgrade 7 patterns to critical per Chief's MERAH zone spec"
```

---

### Task 3: Fix `avpu_abnormal`, `preeclampsia_watch`, `hypertensive_crisis` in `TTVInferenceUI.tsx`

**Files:**

- Modify: `components/clinical/TTVInferenceUI.tsx` (3 changes)
- Test: `lib/emergency-detector/zone-classification-audit.test.ts` (from Task 1)

**Interfaces:**

- Consumes: `htnResult.type` (`'HTN_URGENCY' | 'HTN_EMERGENCY'`), already
  returned by the existing `classifyHypertension()` call at this site —
  no new import needed.
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Fix `avpuSeverityMap`**

In `components/clinical/TTVInferenceUI.tsx`, find:

```ts
const avpuSeverityMap: Record<string, ScreeningAlert['severity']> = {
  V: 'high',
  P: 'critical',
  U: 'critical',
};
```

Change to:

```ts
const avpuSeverityMap: Record<string, ScreeningAlert['severity']> = {
  V: 'critical',
  P: 'critical',
  U: 'critical',
};
```

- [ ] **Step 2: Fix `preeclampsia_watch`'s hardcoded severity**

In `components/clinical/TTVInferenceUI.tsx`, find the `preeclampsia_watch`
alert push (inside the `for (const flag of guardrailAssessment.softFlags)`
loop, matched on `flag.title === 'WASPADA PREEKLAMPSIA'`):

```ts
      alerts.push({
        id: 'preeclampsia-watch-alert',
        type: 'preeclampsia_watch',
        severity: 'critical',
        title: 'WASPADA PREEKLAMPSIA',
```

Change `severity: 'critical',` to `severity: 'high',`.

- [ ] **Step 3: Split `hypertensive_crisis`'s "crisis" tier by HMOD type**

In `components/clinical/TTVInferenceUI.tsx`, find:

```ts
const severityMap: Record<string, ScreeningAlert['severity']> = {
  stage1: 'warning',
  stage2: 'high',
  crisis: 'critical',
};
```

Change to:

```ts
const severityMap: Record<string, ScreeningAlert['severity']> = {
  stage1: 'warning',
  stage2: 'high',
};

const crisisSeverity: ScreeningAlert['severity'] =
  htnResult.type === 'HTN_EMERGENCY' ? 'critical' : 'high';
```

Then find the alert push a few lines below it:

```ts
        alerts.push({
          id: 'hypertensive-alert',
          type: 'hypertensive_crisis',
          severity: severityMap[htnSeverity] ?? 'high',
```

Change `severity: severityMap[htnSeverity] ?? 'high',` to:

```ts
          severity: htnSeverity === 'crisis' ? crisisSeverity : (severityMap[htnSeverity] ?? 'high'),
```

- [ ] **Step 4: Run the audit test — confirm all non-skipped rows now pass**

Run: `pnpm vitest run lib/emergency-detector/zone-classification-audit.test.ts`
Expected: all tests PASS (0 failures, 7 skipped in the deferred block).

- [ ] **Step 5: Commit**

```bash
git add components/clinical/TTVInferenceUI.tsx
git commit -m "fix(med-assist): correct AVPU=V, preeclampsia watch, and HTN urgency severities"
```

---

### Task 4: Update 2 pre-existing tests with now-stale severity assertions

**Files:**

- Modify: `components/clinical/buildAlerts.extended.test.ts:125-131`
- Modify: `components/clinical/HTNCrisisTriage.test.tsx:44-69`

**Interfaces:**

- Consumes: nothing new.
- Produces: nothing new consumed by later tasks — this is the last task
  before final verification.

- [ ] **Step 1: Update `buildAlerts.extended.test.ts`**

In `components/clinical/buildAlerts.extended.test.ts`, find:

```ts
it('adult SBP ≥ 180 → hypertensive_crisis critical', () => {
  const alerts = buildAlerts(makeState({ sbp: '185', dbp: '112' }), ADULT);
  const a = alerts.find((a) => a.type === 'hypertensive_crisis');
  expect(a).toBeDefined();
  expect(a!.severity).toBe('critical');
  expect(a!.gate).toBe('GATE_2_BP');
});
```

Change to:

```ts
it('adult SBP ≥ 180 without HMOD red flags → hypertensive_crisis high (HTN_URGENCY, not HTN_EMERGENCY)', () => {
  const alerts = buildAlerts(makeState({ sbp: '185', dbp: '112' }), ADULT);
  const a = alerts.find((a) => a.type === 'hypertensive_crisis');
  expect(a).toBeDefined();
  expect(a!.severity).toBe('high');
  expect(a!.gate).toBe('GATE_2_BP');
});
```

- [ ] **Step 2: Update `HTNCrisisTriage.test.tsx`**

In `components/clinical/HTNCrisisTriage.test.tsx`, find:

```ts
    expect(triage).toBe('HTN_URGENCY');
    expect(classification.type).toBe('HTN_URGENCY');
    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'hypertensive_crisis',
          severity: 'critical',
          gate: 'GATE_2_BP',
        }),
      ])
    );
  });
```

Change `severity: 'critical',` to `severity: 'high',` (leave every other
line, including the `it(...)` description text above it, unchanged — the
description already correctly says "urgency", it was only the assertion
that was stale).

- [ ] **Step 3: Run both test files**

Run: `pnpm vitest run components/clinical/buildAlerts.extended.test.ts components/clinical/HTNCrisisTriage.test.tsx`
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add components/clinical/buildAlerts.extended.test.ts components/clinical/HTNCrisisTriage.test.tsx
git commit -m "test(med-assist): update stale hypertensive_crisis severity assertions"
```

---

### Task 5: Final full-suite verification

**Files:** none modified — verification only.

- [ ] **Step 1: Run the full test suite**

Run: `pnpm --filter @the-abyss/med-assist test`
Expected: all tests PASS — no regressions across the whole package.

- [ ] **Step 2: Run typecheck and lint**

Run: `pnpm --filter @the-abyss/med-assist typecheck`
Run: `pnpm --filter @the-abyss/med-assist lint`
Expected: typecheck clean. Lint may show the same pre-existing unrelated
errors documented in sub-project C's session (files this plan never
touches) — confirm no NEW lint errors in any file this plan modified.

- [ ] **Step 3: Rebuild the extension**

Run: `pnpm --filter @the-abyss/med-assist build`
Expected: build succeeds.

- [ ] **Step 4: Report to Chief**

Summarize: all 5 tasks committed, 10 severity values corrected, permanent
75-row zone-classification-audit regression test added (63 non-skipped
`CP-*` rows — full coverage of all 70 Pattern-Engine v2 patterns minus the
7 explicitly-deferred/skipped — plus 12 representative legacy
`buildAlerts()` rows), full
suite green. Note the practical consequence already flagged in the design
spec: `hypertensive_crisis`'s "crisis" tier will always report `high` in
the currently-running system (never `critical`) until a future session
wires up real HMOD red-flag collection from manual vital entry — this is
expected, not a bug, since any genuine organ-damage symptom already fires
its own independently-critical alert.
