# Emergency Verdict Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the already-built `computeTriageVerdict()` and
`resolveActionProtocolId()` pure functions into the sidepanel UI, adding a
headline-only 7-section Verdict Card (Verdict / Why this matters / Do now /
Do not do / Refer trigger / Reassessment timer / Evidence gate) to
`EmergencyDashboard`, plus the deferred TRIAGE tab rename and zone-driven
color.

**Architecture:** `buildAlerts()` fills `actionProtocolId` via the resolver
before returning. `TTVInferenceUI` computes a `TriageVerdict` from those
alerts and pushes it to `main.tsx` via a new callback prop, mirroring the
existing `onAlertsChange` pattern. `main.tsx` threads `zone` to
`SidePanelHeader` (tab color) and the full verdict to `EmergencyDashboard`
(new headline card + reordered list). No existing gate, threshold, or
protocol content changes — only rendering and ordering.

**Tech Stack:** React 18, TypeScript strict, Vitest + Testing Library (jsdom).

## Global Constraints

- `components/clinical/TTVInferenceUI.tsx` and `entrypoints/sidepanel/main.tsx`
  are Protected UI Files per `CLAUDE.md` — every task touching them adds
  lines at a named insertion point; it does not rename, move, or restructure
  any existing function, component, or JSX tree.
- No new clinical content is authored anywhere (no new protocol text,
  thresholds, or contraindications) — only reads existing
  `action-protocols.ts` data.
- No new timer/interval state — "Reassessment timer" is a static string
  keyed on `severity`.
- All CSS additions are additive only — no existing rule in `style.css` is
  edited or removed.
- Full source spec: `docs/specs/2026-07-07-emergency-verdict-card-design.md`.

---

### Task 1: Fill `actionProtocolId` in `buildAlerts()` via the resolver

**Files:**

- Modify: `components/clinical/TTVInferenceUI.tsx:1410` (the `return alerts;`
  line at the end of `buildAlerts`)
- Modify: `components/clinical/TTVInferenceUI.tsx` (import block, ~line 68)
- Test: `components/clinical/TTVInferenceUI.test.tsx`

**Interfaces:**

- Consumes: `resolveActionProtocolId(alert: ProtocolResolvableAlert): string | undefined`
  from `@/lib/emergency-detector/action-protocol-resolver` (already built,
  already tested — zero changes to that file). `ProtocolResolvableAlert` is
  `{ id: string; type: string; gate: string; actionProtocolId?: string;
clinicalData?: { sbp?: number } }` — `ScreeningAlert` already satisfies
  this structurally (has `id`, `type`, `gate`, `actionProtocolId?`,
  `clinicalData?`).
- Produces: `buildAlerts()` return type is unchanged (`ScreeningAlert[]`),
  but every alert now has `actionProtocolId` filled in wherever an
  unambiguous mapping exists. Task 2 depends on this being done first —
  `computeTriageVerdict` doesn't care about `actionProtocolId`, but the
  Verdict Card in Task 5 does.

- [ ] **Step 1: Write the failing test**

Add to `components/clinical/TTVInferenceUI.test.tsx`, inside the existing
`describe('buildAlerts geriatric screening', ...)` block (after the last
`it(...)` in that block, before its closing `});`):

```ts
it('resolves actionProtocolId for a legacy hypotension alert via the resolver', () => {
  const alerts = buildAlerts(makeState({ sbp: '85', dbp: '55', hr: '95' }), { patientAge: 45 });

  expect(alerts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: 'hypotension', actionProtocolId: 'PROTO_SHOCK' }),
    ])
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/clinical/TTVInferenceUI.test.tsx -t "resolves actionProtocolId for a legacy hypotension alert"`
Expected: FAIL — `actionProtocolId` is `undefined` on the matched object
(the `hypotension` alert type exists today but nothing sets
`actionProtocolId` on it yet).

- [ ] **Step 3: Add the import**

In `components/clinical/TTVInferenceUI.tsx`, add this import next to the
existing `pattern-engine` import (~line 68):

```ts
import { resolveActionProtocolId } from '@/lib/emergency-detector/action-protocol-resolver';
```

- [ ] **Step 4: Change the return statement**

In `components/clinical/TTVInferenceUI.tsx`, replace line 1410:

```ts
return alerts;
```

with:

```ts
return alerts.map((alert) => ({
  ...alert,
  actionProtocolId: alert.actionProtocolId ?? resolveActionProtocolId(alert),
}));
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run components/clinical/TTVInferenceUI.test.tsx -t "resolves actionProtocolId for a legacy hypotension alert"`
Expected: PASS

- [ ] **Step 6: Run the full TTVInferenceUI test file to check no regression**

Run: `pnpm vitest run components/clinical/TTVInferenceUI.test.tsx`
Expected: all tests PASS, including the existing
`'links a hypertensive_crisis alert to PROTO_HTN_EMERGENCY'` test (that
alert already sets `actionProtocolId` manually at push time, so
`alert.actionProtocolId ?? resolveActionProtocolId(alert)` must keep the
manually-set value unchanged via the `??` short-circuit).

- [ ] **Step 7: Commit**

```bash
git add components/clinical/TTVInferenceUI.tsx components/clinical/TTVInferenceUI.test.tsx
git commit -m "feat(med-assist): fill actionProtocolId via resolver in buildAlerts()"
```

---

### Task 2: Compute `TriageVerdict` in `TTVInferenceUI` and thread it up

**Files:**

- Modify: `components/clinical/TTVInferenceUI.tsx:264-289` (props interface)
- Modify: `components/clinical/TTVInferenceUI.tsx:1535-1554` (prop destructuring)
- Modify: `components/clinical/TTVInferenceUI.tsx:1890-1923` (alerts useMemo +
  new triageVerdict useMemo + useEffect)
- Modify: `components/clinical/TTVInferenceUI.tsx` (import block)
- Test: `components/clinical/TTVInferenceUI.test.tsx`

**Interfaces:**

- Consumes: `computeTriageVerdict<T extends TriageAlertLike>(alerts: T[], hasVitalsEntered: boolean): TriageVerdict<T>`
  and `type TriageVerdict<T>`, `type TriageZone` from
  `@/lib/emergency-detector/triage-verdict` (already built, already tested —
  zero changes to that file). `ScreeningAlert` satisfies `TriageAlertLike`
  (`id`, `type`, `severity`, `gate`).
- Produces: new prop `onTriageVerdictChange?: (verdict: TriageVerdict<ScreeningAlert>) => void`
  on `TTVInferenceUIProps` — Task 4 (`main.tsx`) consumes this. A local
  `triageVerdict` variable of type `TriageVerdict<ScreeningAlert>` becomes
  available inside the component body for Task 3 to consume in the
  `buildSummary()` call site.

- [ ] **Step 1: Write the failing test**

Rendering `TTVInferenceUI` requires `wxt/browser` to be mocked — confirmed
by direct probe: without this mock, mounting throws
`TypeError: Cannot read properties of undefined (reading 'runtime')` from a
`useEffect` at `components/clinical/TTVInferenceUI.tsx:2448`
(`browser.runtime.onMessage.addListener(handler)`). No test in this file
renders the component yet, so this mock does not exist here — add it once,
near the top of `components/clinical/TTVInferenceUI.test.tsx`, above the
existing `import { afterEach, describe, expect, it, vi } from 'vitest';`
line:

```ts
vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (assetPath: string) => `chrome-extension://test${assetPath}`,
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    storage: {
      local: {
        get: vi.fn(async () => ({})),
        set: vi.fn(async () => undefined),
        onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
      },
    },
  },
}));
```

Then update the two existing import statements at the top of
`components/clinical/TTVInferenceUI.test.tsx`. Change line 1 from:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
```

to:

```ts
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
```

And change the import block at lines 3-8 from:

```ts
import {
  buildAlerts,
  buildLastVisitSummaryRows,
  buildVisitHistorySections,
  formatVisitSummaryDate,
} from './TTVInferenceUI';
```

to:

```ts
import {
  buildAlerts,
  buildLastVisitSummaryRows,
  buildVisitHistorySections,
  formatVisitSummaryDate,
  TTVInferenceUI,
} from './TTVInferenceUI';
```

Then add the new test (this file already has a `makeState` helper at line
16 — reuse it, do not redefine it). This test renders the component using
the existing controlled-state prop `ttvState` (the component computes
`const state = ttvState ?? localState;` internally, at line 1725 — passing
`ttvState` makes the render fully deterministic on mount, with no need to
simulate typing into an input). This exact render + `ttvState` combination
was verified working via a throwaway probe test before writing this plan
(probe deleted, not part of the codebase):

```ts
describe('TTVInferenceUI triage verdict callback', () => {
  it('reports a merah zone with a critical headline alert when a critical vital is controlled in', async () => {
    const onTriageVerdictChange = vi.fn();
    render(
      <TTVInferenceUI
        ttvState={makeState({ sbp: '60', dbp: '40', hr: '130' })}
        onTriageVerdictChange={onTriageVerdictChange}
        patientAge={45}
        patientGender="L"
      />
    );

    await waitFor(() => {
      expect(onTriageVerdictChange).toHaveBeenCalledWith(
        expect.objectContaining({ zone: 'merah' })
      );
    });
  });
});
```

`makeState` is the helper already defined at the top of this test file
(`const makeState = (overrides: Partial<Parameters<typeof buildAlerts>[0]> = {}) => ({...`)
— reuse it as-is, do not redefine it.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/clinical/TTVInferenceUI.test.tsx -t "reports a merah zone"`
Expected: FAIL — `onTriageVerdictChange` is not a recognized prop yet (TypeScript
error) or is simply never called (runtime failure) — either failure mode is
acceptable proof this doesn't exist yet.

- [ ] **Step 3: Add imports**

In `components/clinical/TTVInferenceUI.tsx`, add next to the Task 1 import:

```ts
import { computeTriageVerdict, type TriageVerdict } from '@/lib/emergency-detector/triage-verdict';
```

- [ ] **Step 4: Add the prop to the interface**

In `components/clinical/TTVInferenceUI.tsx`, in the `TTVInferenceUIProps`
interface, add this line immediately after line 274
(`onAlertsChange?: (alerts: ScreeningAlert[]) => void;`):

```ts
  onTriageVerdictChange?: (verdict: TriageVerdict<ScreeningAlert>) => void;
```

- [ ] **Step 5: Destructure the prop**

In `components/clinical/TTVInferenceUI.tsx`, add this line immediately after
line 1545 (`onAlertsChange,`):

```ts
      onTriageVerdictChange,
```

- [ ] **Step 6: Compute the verdict and push it up**

In `components/clinical/TTVInferenceUI.tsx`, immediately after the existing
`useEffect` block that ends at line 1923 (`}, [alerts, onAlertsChange]);`),
add:

```ts
const hasVitalsEntered = Boolean(
  state.sbp || state.dbp || state.hr || state.rr || state.temp || state.spo2 || state.glucose
);

const triageVerdict = useMemo(
  () => computeTriageVerdict(alerts, hasVitalsEntered),
  [alerts, hasVitalsEntered]
);

useEffect(() => {
  onTriageVerdictChange?.(triageVerdict);
}, [triageVerdict, onTriageVerdictChange]);
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm vitest run components/clinical/TTVInferenceUI.test.tsx -t "reports a merah zone"`
Expected: PASS

- [ ] **Step 8: Run the full TTVInferenceUI test file**

Run: `pnpm vitest run components/clinical/TTVInferenceUI.test.tsx`
Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add components/clinical/TTVInferenceUI.tsx components/clinical/TTVInferenceUI.test.tsx
git commit -m "feat(med-assist): compute and expose TriageVerdict from TTVInferenceUI"
```

---

### Task 3: Fix `buildSummary()` to use the computed headline alert

**Files:**

- Modify: `components/clinical/TTVInferenceUI.tsx:1413-1462` (`buildSummary`
  function signature and body)
- Modify: `components/clinical/TTVInferenceUI.tsx:2766` (call site)
- Test: `components/clinical/TTVInferenceUI.test.tsx`

**Interfaces:**

- Consumes: `triageVerdict.headlineAlert` (type `ScreeningAlert | null`) —
  the local variable created in Task 2, already in scope at the call site
  since both are in the same component body.
- Produces: `buildSummary` signature changes from
  `(state, alerts: ScreeningAlert[], flags, patient)` to
  `(state, headlineAlert: ScreeningAlert | null, flags, patient)`. No other
  task depends on this signature — it's a leaf fix.

- [ ] **Step 1: Write the failing test**

Add to `components/clinical/TTVInferenceUI.test.tsx`. `buildSummary` is not
currently exported — Step 3 below adds `export` to it. Add `buildSummary` to
the same `./TTVInferenceUI` import block that Task 2 already extended with
`TTVInferenceUI` (do not add a second, separate import line for the same
module):

```ts
import {
  buildAlerts,
  buildLastVisitSummaryRows,
  buildSummary,
  buildVisitHistorySections,
  formatVisitSummaryDate,
  TTVInferenceUI,
} from './TTVInferenceUI';
```

Then add the new test:

```ts
describe('buildSummary headline priority', () => {
  it('uses the headline alert (not array position) for Prioritas and Tindakan awal', () => {
    const lowerSeverityFirst: ScreeningAlert = {
      id: 'a',
      type: 'context_note',
      severity: 'warning',
      title: 'Catatan konteks',
      gate: 'GATE_PATIENT_CONTEXT',
      reasoning: '-',
      recommendations: ['Observasi rutin.'],
    };
    const criticalSecond: ScreeningAlert = {
      id: 'b',
      type: 'hypoglycemia',
      severity: 'critical',
      title: 'Hipoglikemia Berat',
      gate: 'GATE_3_GLUCOSE',
      reasoning: '-',
      recommendations: ['Berikan glukosa oral/IV segera.'],
    };
    // headlineAlert is what computeTriageVerdict would resolve to — the
    // critical alert, regardless of which one buildAlerts() pushed first.
    const summary = buildSummary(
      makeState(),
      criticalSecond,
      {},
      { patientName: 'Test', patientGender: 'L', patientAge: 40, patientRM: 'RM-1' }
    );

    expect(summary).toContain('Prioritas: CRITICAL - Hipoglikemia Berat');
    expect(summary).toContain('Tindakan awal: Berikan glukosa oral/IV segera.');
    expect(summary).not.toContain('Catatan konteks');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/clinical/TTVInferenceUI.test.tsx -t "uses the headline alert"`
Expected: FAIL — either a TypeScript signature mismatch (second parameter
expects `ScreeningAlert[]`, not a single `ScreeningAlert`) or an import error
if `buildSummary` isn't exported yet.

- [ ] **Step 3: Export `buildSummary` and change its signature**

In `components/clinical/TTVInferenceUI.tsx`, change line 1413 from:

```ts
const buildSummary = (
  state: TTVStateShape,
  alerts: ScreeningAlert[],
  flags: Record<string, boolean>,
  patient: Pick<TTVInferenceUIProps, 'patientName' | 'patientGender' | 'patientAge' | 'patientRM'>
): string => {
```

to:

```ts
export const buildSummary = (
  state: TTVStateShape,
  headlineAlert: ScreeningAlert | null,
  flags: Record<string, boolean>,
  patient: Pick<TTVInferenceUIProps, 'patientName' | 'patientGender' | 'patientAge' | 'patientRM'>
): string => {
```

Then change the two `alerts.length > 0 ? ... : ...` ternaries (currently at
lines 1453-1458) from:

```ts
    alerts.length > 0
      ? `Prioritas: ${alerts[0].severity.toUpperCase()} - ${alerts[0].title}`
      : 'Prioritas: STABLE - belum ada alert prioritas tinggi',
    alerts.length > 0
      ? `Tindakan awal: ${alerts[0].recommendations[0]}`
      : 'Tindakan awal: lanjutkan observasi dan lengkapi data klinis bila perlu',
```

to:

```ts
    headlineAlert
      ? `Prioritas: ${headlineAlert.severity.toUpperCase()} - ${headlineAlert.title}`
      : 'Prioritas: STABLE - belum ada alert prioritas tinggi',
    headlineAlert
      ? `Tindakan awal: ${headlineAlert.recommendations[0]}`
      : 'Tindakan awal: lanjutkan observasi dan lengkapi data klinis bila perlu',
```

- [ ] **Step 4: Update the call site**

Find the call site at `components/clinical/TTVInferenceUI.tsx:2766`
(`const summary = buildSummary(state, alerts, effectiveHistoryFlags, {`) and
change its second argument from `alerts` to `triageVerdict.headlineAlert`:

```ts
            const summary = buildSummary(state, triageVerdict.headlineAlert, effectiveHistoryFlags, {
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run components/clinical/TTVInferenceUI.test.tsx -t "uses the headline alert"`
Expected: PASS

- [ ] **Step 6: Run the full TTVInferenceUI test file and typecheck**

Run: `pnpm vitest run components/clinical/TTVInferenceUI.test.tsx`
Expected: all tests PASS.

Run: `pnpm --filter @the-abyss/med-assist typecheck`
Expected: no errors (confirms the call site at line 2766 and any other
`buildSummary` callers compile against the new signature).

- [ ] **Step 7: Commit**

```bash
git add components/clinical/TTVInferenceUI.tsx components/clinical/TTVInferenceUI.test.tsx
git commit -m "fix(med-assist): buildSummary uses computed headline alert, not array position"
```

---

### Task 4: Wire `TriageVerdict` into `main.tsx` (state + props threading)

**Files:**

- Modify: `entrypoints/sidepanel/main.tsx:394` (new state, next to
  `emergencyAlerts`)
- Modify: `entrypoints/sidepanel/main.tsx:844-860` (`SidePanelHeader` usage —
  add `triageZone` prop)
- Modify: `entrypoints/sidepanel/main.tsx:895-914` (`TTVInferenceUI` usage —
  add `onTriageVerdictChange` prop)
- Modify: `entrypoints/sidepanel/main.tsx:1019` (`EmergencyDashboard` usage —
  change `alerts` prop source, add `verdict` prop)
- Modify: `entrypoints/sidepanel/main.tsx:1061` (`EmergencyDashboard`
  function signature — add `verdict` param, export the function)
- Modify: `entrypoints/sidepanel/main.tsx` (import block, ~line 29)
- Test: `entrypoints/sidepanel/main.emergency-dashboard.test.tsx` (new file)

**Interfaces:**

- Consumes: `TriageVerdict<ScreeningAlert>` type from
  `@/lib/emergency-detector/triage-verdict` (same import as Task 2).
- Produces: `EmergencyDashboard` becomes
  `export function EmergencyDashboard({ alerts, verdict }: { alerts: ScreeningAlert[]; verdict: TriageVerdict<ScreeningAlert> })`
  — Task 5 adds the actual Verdict Card JSX inside this function using the
  new `verdict` param. This task only adds the prop and wires the data; it
  does not render anything new yet (Task 5 does that) — this keeps the two
  concerns (wiring vs. rendering) independently reviewable.

- [ ] **Step 1: Write the failing test (new file)**

Importing anything from `./main` pulls in its entire module graph
(framer-motion, `TTVInferenceUI`, `ClinicalDifferential`, `wxt/browser`, and
more) — confirmed by direct probe: a bare `import('./main')` throws
`Error: This script should only be loaded in a browser extension.` from
`webextension-polyfill` unless the same mock stack `main.controller.test.tsx`
already uses is present. This was verified end-to-end before writing this
plan (temporarily exporting `EmergencyDashboard`, rendering it with this
exact mock stack, confirming the empty-state text renders, then reverting —
not part of the codebase).

Create `entrypoints/sidepanel/main.emergency-dashboard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/messaging', () => ({ sendMessage: vi.fn() }));
vi.mock('@/utils/sound', () => ({ playSound: vi.fn() }));
vi.mock('@/components/sidepanel/ClinicalReasoningWorkbench', () => ({
  ClinicalReasoningWorkbench: () => null,
}));
vi.mock('wxt/browser', () => ({
  browser: {
    runtime: { getURL: (p: string) => `chrome-extension://test${p}` },
    storage: {
      local: { get: vi.fn(async () => ({})), set: vi.fn(async () => undefined) },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  },
}));
vi.mock('@/lib/api/auth-client', () => ({
  getStoredSession: vi.fn(),
  logout: vi.fn(async () => undefined),
}));
vi.mock('framer-motion', async () => {
  const ReactModule = await import('react');
  const motion = new Proxy(
    {},
    {
      get: (_t, tag: string) =>
        ReactModule.forwardRef((props: Record<string, unknown>, ref) => {
          const { children, ...rest } = props;
          return ReactModule.createElement(tag, { ...rest, ref }, children as React.ReactNode);
        }),
    }
  );
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion,
    useReducedMotion: () => true,
  };
});
vi.mock('@/components/clinical/TTVInferenceUI', () => ({
  TTVInferenceUI: () => null,
}));
vi.mock('@/components/clinical/ClinicalDifferential', () => ({
  ClinicalDifferential: () => null,
}));

import { EmergencyDashboard } from './main';

import type { ScreeningAlert } from '@/components/clinical/TTVInferenceUI';
import type { TriageVerdict } from '@/lib/emergency-detector/triage-verdict';

const standbyVerdict: TriageVerdict<ScreeningAlert> = {
  zone: 'standby',
  headlineAlert: null,
  sortedAlerts: [],
};

describe('EmergencyDashboard wiring', () => {
  it('accepts a verdict prop without crashing when there is no headline alert', () => {
    render(<EmergencyDashboard alerts={[]} verdict={standbyVerdict} />);

    expect(screen.getByText('— Tidak ada temuan darurat aktif')).toBeInTheDocument();
  });
});
```

The `vi.mock('@/components/clinical/TTVInferenceUI', ...)` and
`vi.mock('@/components/clinical/ClinicalDifferential', ...)` calls exist
purely to keep `./main`'s module graph importable in a jsdom test — they do
not affect `EmergencyDashboard` itself, which has no dependency on either.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run entrypoints/sidepanel/main.emergency-dashboard.test.tsx`
Expected: FAIL — `EmergencyDashboard` is not exported from `./main` yet, and
does not accept a `verdict` prop.

- [ ] **Step 3: Add the import in main.tsx**

In `entrypoints/sidepanel/main.tsx`, add next to the existing
`formatRecommendationLines` import (~line 29):

```ts
import type { TriageVerdict } from '@/lib/emergency-detector/triage-verdict';
```

- [ ] **Step 4: Add the new state**

In `entrypoints/sidepanel/main.tsx`, immediately after line 394
(`const [emergencyAlerts, setEmergencyAlerts] = useState<ScreeningAlert[]>([]);`),
add:

```ts
const [triageVerdict, setTriageVerdict] = useState<TriageVerdict<ScreeningAlert>>({
  zone: 'standby',
  headlineAlert: null,
  sortedAlerts: [],
});
```

- [ ] **Step 5: Thread the callback into `TTVInferenceUI`**

In `entrypoints/sidepanel/main.tsx`, immediately after line 906
(`onAlertsChange={setEmergencyAlerts}`), add:

```ts
onTriageVerdictChange = { setTriageVerdict };
```

- [ ] **Step 6: Thread the zone into `SidePanelHeader`**

In `entrypoints/sidepanel/main.tsx`, immediately after line 860
(`alertCount={emergencyAlerts.length}`), add:

```ts
                  triageZone={triageVerdict.zone}
```

- [ ] **Step 7: Update the `EmergencyDashboard` call site and function signature**

In `entrypoints/sidepanel/main.tsx`, change line 1019 from:

```tsx
<EmergencyDashboard alerts={emergencyAlerts} />
```

to:

```tsx
<EmergencyDashboard alerts={triageVerdict.sortedAlerts} verdict={triageVerdict} />
```

Then change line 1061 from:

```ts
function EmergencyDashboard({ alerts }: { alerts: ScreeningAlert[] }) {
```

to:

```ts
export function EmergencyDashboard({
  alerts,
  verdict,
}: {
  alerts: ScreeningAlert[];
  verdict: TriageVerdict<ScreeningAlert>;
}) {
```

Do not change anything else inside the function body in this task — the
`verdict` parameter is unused until Task 5, which is expected and will not
fail `typecheck` (unused destructured parameters are not flagged the same
way unused local `const`s are, but if `noUnusedParameters` is enabled and
flags it, prefix nothing — Task 5 immediately consumes it, so this state is
transient within the same plan run, not a final state).

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm vitest run entrypoints/sidepanel/main.emergency-dashboard.test.tsx`
Expected: PASS

- [ ] **Step 9: Run typecheck**

Run: `pnpm --filter @the-abyss/med-assist typecheck`
Expected: no errors. If `verdict` being unused inside the function body
raises a lint (not typecheck) warning, that is resolved by Task 5 adding
its first usage — do not suppress it here.

- [ ] **Step 10: Commit**

```bash
git add entrypoints/sidepanel/main.tsx entrypoints/sidepanel/main.emergency-dashboard.test.tsx
git commit -m "feat(med-assist): thread TriageVerdict from TTVInferenceUI through main.tsx"
```

---

### Task 5: Render the Verdict Card in `EmergencyDashboard`

**Files:**

- Modify: `entrypoints/sidepanel/main.tsx:1061` (inside `EmergencyDashboard`,
  add the Verdict Card block before the existing `emg-timeline__header` div)
- Modify: `entrypoints/sidepanel/main.tsx` (import block — add
  `getActionProtocol`, `type ActionStep`, `type ABCDEPhase`)
- Modify: `entrypoints/sidepanel/style.css` (new `.emg-verdict*` rules,
  additive)
- Test: `entrypoints/sidepanel/main.emergency-dashboard.test.tsx`

**Interfaces:**

- Consumes: `getActionProtocol(id: string): ActionProtocol | undefined` and
  `type ActionStep = { phase: ABCDEPhase; action: string }` from
  `@/lib/emergency-detector/action-protocols` (already built, zero changes).
  `formatRecommendationLines` (already imported in `main.tsx`, used for the
  "Do now" fallback).
- Produces: nothing new consumed by later tasks — this is the last piece of
  rendering logic for the Verdict Card itself.

- [ ] **Step 1: Write the failing tests (4 render states)**

Add to `entrypoints/sidepanel/main.emergency-dashboard.test.tsx`, after the
existing `describe` block:

```tsx
const baseAlert: ScreeningAlert = {
  id: 'x',
  type: 'hypotension',
  severity: 'critical',
  title: 'Syok Hipovolemik',
  gate: 'GATE_1_HEMODYNAMIC',
  reasoning: 'SBP 78 dengan takikardia kompensatorik.',
  recommendations: ['Posisikan supine, tinggikan tungkai.', 'Pasang akses IV bila memungkinkan.'],
  actionProtocolId: 'PROTO_SHOCK',
};

describe('EmergencyDashboard Verdict Card', () => {
  it('renders all 7 sections when the headline alert has a fully-populated protocol', () => {
    const verdict: TriageVerdict<ScreeningAlert> = {
      zone: 'merah',
      headlineAlert: baseAlert,
      sortedAlerts: [baseAlert],
    };
    render(<EmergencyDashboard alerts={[baseAlert]} verdict={verdict} />);

    expect(screen.getByText(/MERAH/i)).toBeInTheDocument();
    expect(screen.getByText(baseAlert.reasoning)).toBeInTheDocument();
    expect(screen.getByText(/Reevaluasi dalam 5 menit/i)).toBeInTheDocument();
  });

  it('omits Do not do when the resolved protocol has no contraindications', () => {
    const respFailureAlert: ScreeningAlert = {
      ...baseAlert,
      id: 'y',
      type: 'hypoxia',
      actionProtocolId: 'PROTO_RESP_FAILURE',
    };
    const verdict: TriageVerdict<ScreeningAlert> = {
      zone: 'merah',
      headlineAlert: respFailureAlert,
      sortedAlerts: [respFailureAlert],
    };
    render(<EmergencyDashboard alerts={[respFailureAlert]} verdict={verdict} />);

    expect(screen.queryByText(/Do not do|Jangan lakukan/i)).not.toBeInTheDocument();
  });

  it('falls back to recommendations for Do now when no protocol resolves, and hides Refer/Evidence', () => {
    const unresolvedAlert: ScreeningAlert = {
      id: 'z',
      type: 'context_note',
      severity: 'warning',
      title: 'Validasi manset tensi',
      gate: 'GATE_PATIENT_CONTEXT',
      reasoning: 'Lingkar lengan di luar rentang manset standar.',
      recommendations: ['Gunakan manset ukuran sesuai lingkar lengan.'],
    };
    const verdict: TriageVerdict<ScreeningAlert> = {
      zone: 'kuning',
      headlineAlert: unresolvedAlert,
      sortedAlerts: [unresolvedAlert],
    };
    render(<EmergencyDashboard alerts={[unresolvedAlert]} verdict={verdict} />);

    expect(screen.getByText('Gunakan manset ukuran sesuai lingkar lengan.')).toBeInTheDocument();
    expect(screen.queryByText(/Refer trigger|Rujuk bila/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Evidence gate|Sumber:/i)).not.toBeInTheDocument();
  });

  it('shows only the zone message when there is no headline alert', () => {
    const verdict: TriageVerdict<ScreeningAlert> = {
      zone: 'hijau',
      headlineAlert: null,
      sortedAlerts: [],
    };
    render(<EmergencyDashboard alerts={[]} verdict={verdict} />);

    expect(screen.getByText(/HIJAU/i)).toBeInTheDocument();
    expect(screen.queryByText(/Do now|Reevaluasi/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run entrypoints/sidepanel/main.emergency-dashboard.test.tsx`
Expected: FAIL — none of this markup exists yet.

- [ ] **Step 3: Add imports**

In `entrypoints/sidepanel/main.tsx`, add next to the Task 4 import:

```ts
import {
  getActionProtocol,
  type ABCDEPhase,
  type ActionStep,
} from '@/lib/emergency-detector/action-protocols';
```

- [ ] **Step 4: Add a phase-grouping helper and severity-timer map above `EmergencyDashboard`**

In `entrypoints/sidepanel/main.tsx`, immediately before the
`export function EmergencyDashboard(` line, add:

```ts
const ABCDE_PHASE_ORDER: ABCDEPhase[] = ['A', 'B', 'C', 'D', 'E', 'other'];

function groupStepsByPhase(steps: ActionStep[]): { phase: ABCDEPhase; actions: string[] }[] {
  return ABCDE_PHASE_ORDER.map((phase) => ({
    phase,
    actions: steps.filter((step) => step.phase === phase).map((step) => step.action),
  })).filter((group) => group.actions.length > 0);
}

const REASSESSMENT_TIMER_BY_SEVERITY: Record<ScreeningAlert['severity'], string> = {
  critical: 'Reevaluasi dalam 5 menit',
  high: 'Reevaluasi dalam 15 menit',
  warning: 'Reevaluasi dalam 30 menit',
};

const ZONE_LABEL: Record<TriageVerdict<ScreeningAlert>['zone'], string> = {
  merah: 'MERAH',
  kuning: 'KUNING',
  hijau: 'HIJAU',
  standby: 'STANDBY',
};
```

- [ ] **Step 5: Add the Verdict Card JSX**

In `entrypoints/sidepanel/main.tsx`, inside `EmergencyDashboard`, immediately
after the opening
`<div className="emg-timeline mt-4" data-testid="sentra-emergency-surface">`
line and before the existing `<div className="emg-timeline__header">` line,
add:

```tsx
<div className={`emg-verdict emg-verdict--${verdict.zone}`}>
  <div className="emg-verdict__zone">{ZONE_LABEL[verdict.zone]}</div>
  {verdict.headlineAlert ? (
    <>
      <div className="emg-verdict__title">{verdict.headlineAlert.title}</div>
      <div className="emg-verdict__why">
        <span className="emg-verdict__label">Why this matters</span>
        <span>{verdict.headlineAlert.reasoning}</span>
      </div>
      {(() => {
        const protocol = verdict.headlineAlert.actionProtocolId
          ? getActionProtocol(verdict.headlineAlert.actionProtocolId)
          : undefined;
        return (
          <>
            <div className="emg-verdict__donow">
              <span className="emg-verdict__label">Do now</span>
              {protocol ? (
                groupStepsByPhase(protocol.steps).map((group) => (
                  <div key={group.phase} className="emg-verdict__phase-group">
                    <span className="emg-verdict__phase-tag">{group.phase}</span>
                    <ul>
                      {group.actions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <ul>
                  {verdict.headlineAlert.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              )}
            </div>
            {protocol?.contraindications && protocol.contraindications.length > 0 ? (
              <div className="emg-verdict__donot">
                <span className="emg-verdict__label">Do not do</span>
                <ul>
                  {protocol.contraindications.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {protocol ? (
              <div className="emg-verdict__refer">
                <span className="emg-verdict__label">Refer trigger</span>
                <ul>
                  {protocol.referralCriteria.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="emg-verdict__timer">
              <span className="emg-verdict__label">Reassessment timer</span>
              <span>{REASSESSMENT_TIMER_BY_SEVERITY[verdict.headlineAlert.severity]}</span>
            </div>
            {protocol ? (
              <div className="emg-verdict__evidence">
                <span className="emg-verdict__label">Evidence gate</span>
                <span>{protocol.source}</span>
              </div>
            ) : null}
          </>
        );
      })()}
    </>
  ) : (
    <div className="emg-verdict__empty">
      {verdict.zone === 'standby'
        ? 'Belum ada data vital — masukkan tanda vital untuk memulai skrining.'
        : 'Tidak ada temuan darurat aktif.'}
    </div>
  )}
</div>
```

- [ ] **Step 6: Add additive CSS for the Verdict Card**

In `entrypoints/sidepanel/style.css`, after the existing `.emg-entry__dot--warning`
rule (ends ~line 3164), add:

```css
/* ── EMERGENCY VERDICT CARD — headline-alert summary ───────────────────── */
.emg-verdict {
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  border: 1px solid var(--accent-med);
  font-family: var(--font-ui);
}

.emg-verdict--merah {
  border-color: rgba(220, 50, 50, 0.6);
  background: rgba(180, 20, 20, 0.08);
}

.emg-verdict--kuning {
  border-color: rgba(220, 160, 40, 0.6);
  background: rgba(220, 160, 40, 0.08);
}

.emg-verdict--hijau {
  border-color: var(--login-emerald-40);
  background: var(--login-emerald-glow-08);
}

.emg-verdict__zone {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.emg-verdict__title {
  font-size: 13px;
  font-weight: 600;
  margin-top: 4px;
}

.emg-verdict__label {
  display: block;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-top: 6px;
}

.emg-verdict__phase-tag {
  font-size: 10px;
  font-weight: 700;
  margin-right: 4px;
}

.emg-verdict__empty {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm vitest run entrypoints/sidepanel/main.emergency-dashboard.test.tsx`
Expected: all 5 tests (1 from Task 4 + 4 new) PASS.

- [ ] **Step 8: Run typecheck and lint**

Run: `pnpm --filter @the-abyss/med-assist typecheck`
Run: `pnpm --filter @the-abyss/med-assist lint`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add entrypoints/sidepanel/main.tsx entrypoints/sidepanel/main.emergency-dashboard.test.tsx entrypoints/sidepanel/style.css
git commit -m "feat(med-assist): render 7-section Verdict Card for headline alert"
```

---

### Task 6: Rename tab to TRIAGE and drive its color from the zone

**Files:**

- Modify: `components/sidepanel/SidePanelHeader.tsx:39-69` (props interface,
  `engineButtons`)
- Modify: `components/sidepanel/SidePanelHeader.tsx:71-94` (prop
  destructuring)
- Modify: `components/sidepanel/SidePanelHeader.tsx:220-227` (tab class +
  dot condition)
- Modify: `components/sidepanel/SidePanelHeader.tsx` (import block)
- Modify: `entrypoints/sidepanel/style.css` (new
  `.engine-btn--triage-kuning`/`.engine-btn--triage-hijau` rules, extend
  `.engine-btn--alert-active` selector)
- Test: `components/sidepanel/SidePanelHeader.test.tsx`

**Interfaces:**

- Consumes: `type TriageZone` from `@/lib/emergency-detector/triage-verdict`.
- Produces: nothing consumed by later tasks — this is the last task before
  final verification.

- [ ] **Step 1: Write the failing tests**

Add to `components/sidepanel/SidePanelHeader.test.tsx`, inside the existing
`describe('SidePanelHeader patient strip', ...)` block:

```tsx
it('renders TRIAGE instead of CODE RED as the emergency tab label', () => {
  render(
    <SidePanelHeader
      activeEngine="vs"
      onEngineChange={vi.fn()}
      patientName="Chief"
      patientAge={40}
      patientRM="RM-1"
      patientGender="L"
    />
  );

  expect(screen.getByRole('tab', { name: 'TRIAGE' })).toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: 'CODE RED' })).not.toBeInTheDocument();
});

it('applies the merah modifier class and shows a dot for zone merah', () => {
  render(
    <SidePanelHeader
      activeEngine="vs"
      onEngineChange={vi.fn()}
      patientName="Chief"
      patientAge={40}
      patientRM="RM-1"
      patientGender="L"
      triageZone="merah"
    />
  );

  const tab = screen.getByRole('tab', { name: /TRIAGE/ });
  expect(tab.className).toContain('engine-btn--triage-merah');
});

it('shows no modifier class and no dot for standby zone', () => {
  render(
    <SidePanelHeader
      activeEngine="vs"
      onEngineChange={vi.fn()}
      patientName="Chief"
      patientAge={40}
      patientRM="RM-1"
      patientGender="L"
      triageZone="standby"
    />
  );

  const tab = screen.getByRole('tab', { name: 'TRIAGE' });
  expect(tab.className).not.toContain('engine-btn--triage');
  expect(tab.querySelector('.engine-tab-dot')).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run components/sidepanel/SidePanelHeader.test.tsx -t "TRIAGE"`
Expected: FAIL — label is still "CODE RED", `triageZone` prop doesn't exist.

- [ ] **Step 3: Add the import**

In `components/sidepanel/SidePanelHeader.tsx`, add next to the existing
`VitalWarningSlot` type import:

```ts
import type { TriageZone } from '@/lib/emergency-detector/triage-verdict';
```

- [ ] **Step 4: Add the prop to the interface and rename the tab label**

In `components/sidepanel/SidePanelHeader.tsx`, add this line inside
`SidePanelHeaderProps` immediately after line 60 (`alertCount?: number;`):

```ts
  triageZone?: TriageZone;
```

Change line 67 from:

```ts
  { id: 'emergency', label: 'CODE RED' },
```

to:

```ts
  { id: 'emergency', label: 'TRIAGE' },
```

- [ ] **Step 5: Destructure the prop with a default**

In `components/sidepanel/SidePanelHeader.tsx`, add this line immediately
after line 91 (`alertCount = 0,`):

```ts
  triageZone = 'standby',
```

- [ ] **Step 6: Replace the alert-active class logic**

In `components/sidepanel/SidePanelHeader.tsx`, change line 220 from:

```tsx
              className={`engine-btn engine-tab ${selected ? 'active' : ''}${engine.id === 'emergency' && alertCount > 0 ? ' engine-btn--alert-active' : ''}`}
```

to:

```tsx
              className={`engine-btn engine-tab ${selected ? 'active' : ''}${
                engine.id === 'emergency'
                  ? triageZone === 'merah'
                    ? ' engine-btn--triage-merah'
                    : triageZone === 'kuning'
                      ? ' engine-btn--triage-kuning'
                      : triageZone === 'hijau'
                        ? ' engine-btn--triage-hijau'
                        : ''
                  : ''
              }`}
```

Then change lines 225-227 from:

```tsx
{
  engine.id === 'emergency' && alertCount > 0 && (
    <span className="engine-tab-dot" aria-label={`${alertCount} temuan klinis aktif`} />
  );
}
```

to:

```tsx
{
  engine.id === 'emergency' && triageZone !== 'standby' && (
    <span className="engine-tab-dot" aria-label={`${alertCount} temuan klinis aktif`} />
  );
}
```

- [ ] **Step 7: Add the CSS**

In `entrypoints/sidepanel/style.css`, find the existing
`.engine-btn--alert-active {` rule (line 3059) and change its selector line
from:

```css
.engine-btn--alert-active {
```

to:

```css
.engine-btn--alert-active,
.engine-btn--triage-merah {
```

Leave the rest of that rule and the `.engine-btn--alert-active .engine-tab-dot`
rule immediately below it untouched — just extend the selector, add nothing
else. Then, immediately after the `@keyframes engine-alert-pulse` block
(ends ~line 3080), add:

```css
.engine-btn--triage-kuning {
  border-color: rgba(220, 160, 40, 0.75) !important;
  color: rgba(220, 160, 40, 0.95) !important;
  background: rgba(220, 160, 40, 0.1) !important;
}

.engine-btn--triage-kuning .engine-tab-dot {
  background: rgba(220, 160, 40, 0.9);
}

.engine-btn--triage-hijau {
  border-color: var(--login-emerald-40) !important;
  color: var(--login-emerald) !important;
  background: var(--login-emerald-glow-08) !important;
}

.engine-btn--triage-hijau .engine-tab-dot {
  background: var(--login-emerald-40);
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm vitest run components/sidepanel/SidePanelHeader.test.tsx`
Expected: all tests PASS, including the pre-existing ones (the first
existing test in the file explicitly asserts `SETTING` is not a tab — make
sure the rename doesn't touch that assertion).

- [ ] **Step 9: Update the `main.tsx` call site is already done (Task 4, Step 6)**

Confirm no further change is needed: `triageZone={triageVerdict.zone}` was
already added to the `<SidePanelHeader>` JSX in Task 4. Run:

```bash
grep -n "triageZone={triageVerdict.zone}" entrypoints/sidepanel/main.tsx
```

Expected: one match. If it's missing, add it now (this should not happen if
Task 4 was completed).

- [ ] **Step 10: Run full verification**

Run: `pnpm --filter @the-abyss/med-assist typecheck`
Run: `pnpm --filter @the-abyss/med-assist lint`
Run: `pnpm vitest run components/sidepanel/SidePanelHeader.test.tsx`
Expected: all clean/PASS.

- [ ] **Step 11: Commit**

```bash
git add components/sidepanel/SidePanelHeader.tsx components/sidepanel/SidePanelHeader.test.tsx entrypoints/sidepanel/style.css
git commit -m "feat(med-assist): rename CODE RED tab to TRIAGE, drive color from zone"
```

---

### Task 7: Final full-suite verification

**Files:** none modified — verification only.

- [ ] **Step 1: Run the full test suite**

Run: `pnpm --filter @the-abyss/med-assist test`
Expected: all tests PASS (no regressions across the whole package, not just
the files touched in this plan).

- [ ] **Step 2: Run typecheck and lint on the whole package**

Run: `pnpm --filter @the-abyss/med-assist typecheck`
Run: `pnpm --filter @the-abyss/med-assist lint`
Expected: both clean.

- [ ] **Step 3: Rebuild the extension**

Run: `pnpm --filter @the-abyss/med-assist build`
Expected: build succeeds — this is required per the standing memory rule
("always rebuild after done so `.output/chrome-mv3-dev` matches committed
code").

- [ ] **Step 4: Report to Chief**

Summarize: all 7 tasks committed, full suite green, build succeeds. Note
that live browser verification of the Verdict Card (opening the sidepanel,
entering critical vitals, confirming the card renders and the tab shows
TRIAGE in the right color) is still owed and should happen before this is
considered fully done — per CLAUDE.md's UI verification rule, passing tests
is not the same as confirming the feature visually.
