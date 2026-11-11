# Vital Sign RME Extraction + Patient-Bar Warning Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read the 7 numeric vital signs a nurse already entered on the ePuskesmas RME page into Med Assist's own vitals form (tagged so the existing AI AutoComplete+ can never overwrite them), and surface up to 2 abnormal-vital warnings in the patient identity bar's new middle column.

**Architecture:** Phase 1 adds a 5th `scanVitalSigns` scrape to the existing `fetchPatientData` parallel-scan pipeline (mirrors the already-shipped `scanClinicalContext` 3-layer pattern: `content.ts` scraper handler → `background.ts` tab-relay → `main.tsx` caller), then tags the extracted fields `RME-manual` in `TTVInferenceUI`'s existing (but previously unused) field-priority system. Phase 2 reuses the existing `assessVitalGuardrails()` severity classifier to pick 2 of the 7 vitals (fixed priority: TD, then Suhu, then HR/RR/SpO2/Glucose) and renders them in a redesigned 3-column `patient-bar`.

**Tech Stack:** WXT (Chrome MV3), React 18 + TypeScript strict, `@webext-core/messaging`, Vitest + Testing Library, jsdom.

## Global Constraints

- No changes to `lib/clinical/aassist-v2/field-priority.ts`, `lib/clinical/vital-autocomplete.ts`, or `lib/clinical/vital-guardrails.ts` internals — all three are consumed as-is (per design spec's explicit out-of-scope list).
- GCS/kesadaran extraction from RME is out of scope — do not add any kesadaran→GCS conversion.
- Never use `process.env.*` in extension code — `import.meta.env.*` only (not needed in this feature, no new env vars).
- Do not log PHI/PII. Vital-sign values are clinical data, not identifiers, but do not add any new `console.log`/logger call that includes patient name, RM, or free-text symptom fields.
- Do not modify `wxt.config.ts`.
- TypeScript strict mode — no new `any`.
- Every task must leave `pnpm --filter @the-abyss/med-assist typecheck` and the touched test files green before moving to the next task.
- Design spec: `docs/specs/2026-07-06-vital-sign-extract-and-warning-design.md` — refer back to it for the "why" behind any decision below.

---

## Task 1: Pure vital-sign RME scraper

**Files:**

- Create: `apps/healthcare/med-assist/lib/scraper/vital-signs.ts`
- Test: `apps/healthcare/med-assist/lib/scraper/vital-signs.test.ts`

**Interfaces:**

- Produces: `VitalScrapeResult` type and `scanVitalSignsFromRoot(root: Document): VitalScrapeResult` — consumed by Task 3 (`content.ts` handler).

- [ ] **Step 1: Write the failing test**

```ts
// lib/scraper/vital-signs.test.ts
import { describe, expect, it } from 'vitest';

import { scanVitalSignsFromRoot } from '@/lib/scraper/vital-signs';

describe('scanVitalSignsFromRoot', () => {
  it('reads all 7 vitals when every RME field is filled', () => {
    document.body.innerHTML = `
      <input id="sistole" value="180" />
      <input id="diastole" value="110" />
      <input id="detak-nadi" value="98" />
      <input name="PeriksaFisik[nafas]" value="22" />
      <input id="suhu" value="39.2" />
      <input id="gula-darah" value="140" />
      <input name="PeriksaFisik[saturasi]" value="96" />
    `;

    expect(scanVitalSignsFromRoot(document)).toEqual({
      sbp: '180',
      dbp: '110',
      hr: '98',
      rr: '22',
      temp: '39.2',
      glucose: '140',
      spo2: '96',
    });
  });

  it('omits fields that are empty or missing from the page', () => {
    document.body.innerHTML = `
      <input id="sistole" value="120" />
      <input id="diastole" value="" />
    `;

    expect(scanVitalSignsFromRoot(document)).toEqual({ sbp: '120' });
  });

  it('returns an empty object when no vital inputs exist on the page', () => {
    document.body.innerHTML = `<div>Halaman kosong</div>`;

    expect(scanVitalSignsFromRoot(document)).toEqual({});
  });

  it('falls back to the alternate name selector when the id is absent', () => {
    document.body.innerHTML = `<input name="PeriksaFisik[sistole]" value="150" />`;

    expect(scanVitalSignsFromRoot(document)).toEqual({ sbp: '150' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @the-abyss/med-assist exec vitest run lib/scraper/vital-signs.test.ts`
Expected: FAIL — `Cannot find module '@/lib/scraper/vital-signs'`

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/scraper/vital-signs.ts
export interface VitalScrapeResult {
  sbp?: string;
  dbp?: string;
  hr?: string;
  rr?: string;
  temp?: string;
  spo2?: string;
  glucose?: string;
}

type VitalScrapeField = keyof VitalScrapeResult;

const VITAL_SELECTORS: Record<VitalScrapeField, string> = {
  sbp: 'input#sistole, input[name="PeriksaFisik[sistole]"]',
  dbp: 'input#diastole, input[name="PeriksaFisik[diastole]"]',
  hr: 'input#detak-nadi, input[name="PeriksaFisik[detak_nadi]"]',
  rr: 'input#nafas, input[name="PeriksaFisik[nafas]"]',
  temp: 'input#suhu, input[name="PeriksaFisik[suhu]"]',
  glucose: 'input#gula-darah, input[name="PeriksaFisik[gula_darah]"], input[name="gula_darah"]',
  spo2: 'input[name="PeriksaFisik[saturasi]"], input#saturasi, input[name="PeriksaFisik[spo2]"]',
};

const VITAL_SCRAPE_FIELDS = Object.keys(VITAL_SELECTORS) as VitalScrapeField[];

function readVitalInput(root: Document, selector: string): string | undefined {
  const el = root.querySelector<HTMLInputElement>(selector);
  const value = el?.value?.trim();
  return value ? value : undefined;
}

/**
 * Reads the 7 numeric vital-sign inputs a nurse already filled in on the
 * ePuskesmas RME "Periksa Fisik" section. Read-only counterpart of the
 * fill mappings in lib/handlers/page-anamnesa.ts (same selectors, opposite
 * direction). Missing/empty fields are simply absent from the result.
 */
export function scanVitalSignsFromRoot(root: Document): VitalScrapeResult {
  const result: VitalScrapeResult = {};
  VITAL_SCRAPE_FIELDS.forEach((field) => {
    const value = readVitalInput(root, VITAL_SELECTORS[field]);
    if (value !== undefined) {
      result[field] = value;
    }
  });
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @the-abyss/med-assist exec vitest run lib/scraper/vital-signs.test.ts`
Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add lib/scraper/vital-signs.ts lib/scraper/vital-signs.test.ts
git commit -m "feat(med-assist): add pure RME vital-sign scraper"
```

---

## Task 2: Register `scanVitalSigns` in the message protocol

**Files:**

- Modify: `apps/healthcare/med-assist/utils/messaging.ts`
- Modify: `apps/healthcare/med-assist/tests/runtime/message-contract-parity.test.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `scanVitalSigns` becomes a valid `sendMessage`/`onMessage` name with payload `undefined` and response `{ success: boolean; error?: string; vitals?: { sbp?: string; dbp?: string; hr?: string; rr?: string; temp?: string; spo2?: string; glucose?: string } }` — consumed by Tasks 3, 4, 5.

- [ ] **Step 1: Write the failing test**

Update the existing contract test's exact-array expectation (this test already exists and already breaks the moment `PROTOCOL_MESSAGE_NAMES` gains a new entry — editing it here IS the RED step, since it will fail until Step 3 adds the entry to match):

```ts
// tests/runtime/message-contract-parity.test.ts
// Replace the existing array literal (add 'scanVitalSigns' right after 'scanClinicalContext'):
expect(PROTOCOL_MESSAGE_NAMES).toEqual([
  'fillResep',
  'fillAnamnesa',
  'fillDiagnosa',
  'transferRME',
  'cancelRMETransfer',
  'pageReady',
  'scrapeResult',
  'execFill',
  'execScrape',
  'getSuggestions',
  'getRecommendations',
  'checkInteractions',
  'checkAllergies',
  'calculatePediatricDose',
  'getCDSSStatus',
  'initializeCDSS',
  'scanFields',
  'scanMedicalHistory',
  'scanVisitHistory',
  'scanClinicalContext',
  'scanVitalSigns',
  'resolveTenagaMedis',
  'visitHistoryScraped',
  'scanQueueStatistics',
  'scanReferralStatistics',
  'scanStockStatistics',
  'collectShiftOverview',
]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @the-abyss/med-assist exec vitest run tests/runtime/message-contract-parity.test.ts`
Expected: FAIL — actual array (from `utils/messaging.ts`, unchanged so far) does not contain `'scanVitalSigns'`.

- [ ] **Step 3: Write minimal implementation**

In `utils/messaging.ts`, add the interface entry right after `scanClinicalContext` (around line 278):

```ts
  // Panel -> Worker -> Content (Vital Sign RME Extraction)
  scanVitalSigns(data: undefined): Promise<{
    success: boolean;
    error?: string;
    vitals?: {
      sbp?: string;
      dbp?: string;
      hr?: string;
      rr?: string;
      temp?: string;
      spo2?: string;
      glucose?: string;
    };
  }>;
```

And add `'scanVitalSigns'` to `PROTOCOL_MESSAGE_NAMES` right after `'scanClinicalContext'`:

```ts
export const PROTOCOL_MESSAGE_NAMES = [
  'fillResep',
  'fillAnamnesa',
  'fillDiagnosa',
  'transferRME',
  'cancelRMETransfer',
  'pageReady',
  'scrapeResult',
  'execFill',
  'execScrape',
  'getSuggestions',
  'getRecommendations',
  'checkInteractions',
  'checkAllergies',
  'calculatePediatricDose',
  'getCDSSStatus',
  'initializeCDSS',
  'scanFields',
  'scanMedicalHistory',
  'scanVisitHistory',
  'scanClinicalContext',
  'scanVitalSigns',
  'resolveTenagaMedis',
  'visitHistoryScraped',
  'scanQueueStatistics',
  'scanReferralStatistics',
  'scanStockStatistics',
  'collectShiftOverview',
] as const satisfies readonly (keyof ProtocolMap)[];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @the-abyss/med-assist exec vitest run tests/runtime/message-contract-parity.test.ts`
Expected: PASS

Also run: `pnpm --filter @the-abyss/med-assist typecheck` — expected clean (no other file references `ProtocolMap` exhaustively yet).

- [ ] **Step 5: Commit**

```bash
git add utils/messaging.ts tests/runtime/message-contract-parity.test.ts
git commit -m "feat(med-assist): register scanVitalSigns message contract"
```

---

## Task 3: `content.ts` scrape handler

**Files:**

- Modify: `apps/healthcare/med-assist/entrypoints/content.ts`
- Modify: `apps/healthcare/med-assist/tests/runtime/content.exec-scrape.test.ts`

**Interfaces:**

- Consumes: `scanVitalSignsFromRoot` from Task 1 (`@/lib/scraper/vital-signs`).
- Produces: `messageHandlers.scanVitalSigns(_data: unknown)` and the `msg.type === 'scanVitalSigns'` runtime listener branch — consumed by Task 4 (background relay sends this message type to the content script).

- [ ] **Step 1: Write the failing test**

`tests/runtime/content.exec-scrape.test.ts` already has a real dispatch harness (`createRuntimeMessageHarness`, `mountContentScript`, `dispatchRuntimeMessage`) that stubs `defineContentScript`/`browser`, imports the real `entrypoints/content.ts`, runs its `.main()`, captures the registered `browser.runtime.onMessage` listener, and dispatches a message straight into it — this is the established pattern for testing a `content.ts` message branch for real (do not write a new harness or a test that just re-calls the scraper directly, since that would never fail even if `content.ts` were never wired up).

Add the missing scraper mock next to the other `@/lib/scraper/*` mocks near the top of the file (after the `@/lib/scraper/page-context` mock, around line 41):

```ts
vi.mock('@/lib/scraper/vital-signs', () => ({
  scanVitalSignsFromRoot: vi.fn(() => ({ sbp: '150', dbp: '95' })),
}));
```

Import it for assertions, next to the other imported mock functions (near `extractVisitFromRoot` at the top):

```ts
import { scanVitalSignsFromRoot } from '@/lib/scraper/vital-signs';
```

Add a new test case inside the existing `describe('content execScrape', ...)` block (reusing `createRuntimeMessageHarness`/`mountContentScript`/`dispatchRuntimeMessage`, already in scope in this file):

```ts
it('returns the scraped vitals wrapped as a success response for scanVitalSigns', async () => {
  const harness = createRuntimeMessageHarness();
  const listener = await mountContentScript(harness.browserApi);

  const response = await dispatchRuntimeMessage(listener, { type: 'scanVitalSigns' });

  expect(scanVitalSignsFromRoot).toHaveBeenCalledWith(document);
  expect(response).toEqual({ success: true, vitals: { sbp: '150', dbp: '95' } });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @the-abyss/med-assist exec vitest run tests/runtime/content.exec-scrape.test.ts -t "scanVitalSigns"`
Expected: FAIL — no `'scanVitalSigns'` branch exists in `content.ts`'s listener yet, so `sendResponse`/`resolve` is never called and the awaited `response` never resolves to the expected value (the assertion on `response` fails, or the test times out).

- [ ] **Step 3: Write minimal implementation**

In `entrypoints/content.ts`, add the import near the other scraper imports (next to `scanMedicalHistoryFromRoot`):

```ts
import { scanVitalSignsFromRoot } from '@/lib/scraper/vital-signs';
```

Add the handler to the `messageHandlers` object, directly after `scanClinicalContext` (around line 335, after its closing `};`):

```ts
      scanVitalSigns: (_data: unknown) => {
        debug('Scanning vital signs from page...');
        const vitals = scanVitalSignsFromRoot(document);
        debug('Vital signs scan complete:', vitals);
        return { success: true, vitals };
      },
```

Add the listener branch directly after the `scanClinicalContext` branch (around line 858):

```ts
if (msg.type === 'scanVitalSigns') {
  const result = messageHandlers.scanVitalSigns(msg.data);
  sendResponse(result);
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @the-abyss/med-assist exec vitest run tests/runtime/content.exec-scrape.test.ts`
Expected: PASS (all cases in the file, including the new one)

Run: `pnpm --filter @the-abyss/med-assist typecheck`
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add entrypoints/content.ts tests/runtime/content.exec-scrape.test.ts
git commit -m "feat(med-assist): wire scanVitalSigns content-script handler"
```

---

## Task 4: `background.ts` tab relay

**Files:**

- Modify: `apps/healthcare/med-assist/entrypoints/background.ts`

**Interfaces:**

- Consumes: `scanVitalSigns` message name (Task 2), relays to the content script's `scanVitalSigns` handler (Task 3).
- Produces: `onMessage('scanVitalSigns', ...)` registered on the background side — consumed by Task 5 (`main.tsx` calls `sendMessage('scanVitalSigns', undefined)`).

No new test file for this task — the existing codebase has no isolated unit test for the tab-relay layer itself (it is thin tab-finding boilerplate identical to `scanClinicalContext`'s already-tested-by-usage relay); correctness is verified end-to-end by Task 5's `main.controller.test.tsx` addition, which exercises `sendMessage('scanVitalSigns', ...)` through the mocked messaging layer.

- [ ] **Step 1: Add the response type**

In `entrypoints/background.ts`, add this type next to `ScanClinicalContextResponse` (around line 108):

```ts
type ScanVitalSignsResponse = {
  success: boolean;
  error?: string;
  vitals?: {
    sbp?: string;
    dbp?: string;
    hr?: string;
    rr?: string;
    temp?: string;
    spo2?: string;
    glucose?: string;
  };
};
```

- [ ] **Step 2: Add the relay handler**

Directly after the `onMessage('scanClinicalContext', ...)` block (after its closing `});` around line 1989), add:

```ts
// Panel → Content: Scan vital signs already filled in by the nurse on the ePuskesmas RME page
onMessage('scanVitalSigns', async () => {
  bgLog.debug('Scan vital signs request');

  const activeTabs = await browser.tabs.query({ active: true, currentWindow: true });
  let tabId = activeTabs[0]?.url?.includes('epuskesmas.id') ? activeTabs[0]?.id : undefined;

  if (!tabId) {
    const epTabs = await browser.tabs.query({ url: '*://*.epuskesmas.id/*' });
    tabId = epTabs[0]?.id;
  }

  if (!tabId && activeTabs[0]?.id) {
    tabId = activeTabs[0].id;
  }

  if (!tabId) {
    return { success: false, error: 'No active ePuskesmas tab', vitals: undefined };
  }

  try {
    const result = await sendMessageToTabWithTimeout<ScanVitalSignsResponse>(
      tabId,
      {
        type: 'scanVitalSigns',
        timestamp: Date.now(),
      },
      MESSAGE_TIMEOUTS.scrape
    );
    bgLog.debug('Vital signs result:', result);
    return result;
  } catch (error) {
    if (classifyTabMessageError(error) === 'NO_RECEIVER') {
      const injected = await tryInjectContentScripts(tabId);
      if (injected) {
        try {
          const retry = await sendMessageToTabWithTimeout<ScanVitalSignsResponse>(
            tabId,
            {
              type: 'scanVitalSigns',
              timestamp: Date.now(),
            },
            MESSAGE_TIMEOUTS.scrape
          );
          bgLog.debug('Vital signs retry result:', retry);
          return retry;
        } catch (retryError) {
          bgLog.error('Vital signs retry failed:', retryError);
        }
      }
    }

    bgLog.error('Vital signs scan failed:', error);
    return {
      success: false,
      error: toTabCommunicationError(error, error instanceof Error ? error.message : String(error)),
      vitals: undefined,
    };
  }
});
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm --filter @the-abyss/med-assist typecheck`
Expected: clean — `onMessage('scanVitalSigns', ...)` now type-checks against the `ProtocolMap` entry added in Task 2.

- [ ] **Step 4: Commit**

```bash
git add entrypoints/background.ts
git commit -m "feat(med-assist): relay scanVitalSigns to the active RME tab"
```

---

## Task 5: Wire the scan into `fetchPatientData` (main.tsx)

**Files:**

- Modify: `apps/healthcare/med-assist/entrypoints/sidepanel/main.tsx`
- Modify: `apps/healthcare/med-assist/entrypoints/sidepanel/main.controller.test.tsx`

**Interfaces:**

- Consumes: `sendMessage('scanVitalSigns', undefined)` (Tasks 2-4); `TTVFormState` (existing, main.tsx:~103); `setTTVState` (existing).
- Produces: `rmeVitalFieldKeys` local state (new local type `RmeVitalFieldKey` — structurally identical to Task 6's `VitalFieldKey`, declared independently in `main.tsx` so this task has no forward dependency on Task 6) passed as a new prop to `<TTVInferenceUI rmeVitalFieldKeys={rmeVitalFieldKeys} .../>` — consumed by Task 6. TypeScript matches the two types structurally, so no cross-file import is needed between `main.tsx` and `TTVInferenceUI.tsx` for this type.

- [ ] **Step 1: Write the failing test**

In `entrypoints/sidepanel/main.controller.test.tsx`, first replace the `TTVInferenceUI` mock (around line 125) so the test can capture its props, mirroring the existing `mockClinicalDifferential` pattern:

```ts
const { mockTTVInferenceUI } = vi.hoisted(() => ({
  mockTTVInferenceUI: vi.fn(),
}));

vi.mock('@/components/clinical/TTVInferenceUI', () => ({
  TTVInferenceUI: (props: Record<string, unknown>) => {
    mockTTVInferenceUI(props);
    return <div data-testid="mock-ttv-controller">TTV</div>;
  },
}));
```

Add `mockTTVInferenceUI.mockReset();` alongside the other `.mockReset()` calls in `beforeEach` (around line 144).

Add the new mock response branch inside the existing `mockSendMessage.mockImplementation` (around line 165, alongside the `scanClinicalContext` branch):

```ts
if (type === 'scanVitalSigns') {
  return {
    success: true,
    vitals: {
      sbp: '150',
      dbp: '95',
      hr: '110',
      rr: '24',
      temp: '39.1',
      spo2: '94',
      glucose: '180',
    },
  };
}
```

Add a new test case (near the other OCR/launch-flow tests in this file — search the file for `handleLaunchConsole` or `onInitialisasi` usage to place it alongside similar flow tests):

```tsx
it('feeds RME-extracted vital signs into TTVInferenceUI as rmeVitalFieldKeys after OCR', async () => {
  render(<SentraAssistSidepanelApp />);

  await act(async () => {
    await vi.runAllTimersAsync();
  });

  const ocrButton = await screen.findByRole('button', { name: /OCR/i });
  await act(async () => {
    fireEvent.click(ocrButton);
    await vi.runAllTimersAsync();
  });

  const lastCallProps = mockTTVInferenceUI.mock.calls.at(-1)?.[0] as Record<string, unknown>;
  expect(lastCallProps.rmeVitalFieldKeys).toEqual(
    expect.arrayContaining(['sbp', 'dbp', 'hr', 'rr', 'temp', 'spo2', 'glucose'])
  );
  expect(lastCallProps.ttvState).toMatchObject({
    sbp: '150',
    dbp: '95',
    hr: '110',
    rr: '24',
    temp: '39.1',
    spo2: '94',
    glucose: '180',
  });
});
```

Also add a failure-path case proving the scan failing does not crash the panel or touch existing vitals (the design spec requires this to fail silently, same as the other 4 parallel scans). Add this as a second, separate `it` in the same `describe` block — it needs its own `mockSendMessage` override, so set it up inside the test itself rather than the shared `beforeEach`:

```tsx
it('leaves vitals untouched and does not crash when scanVitalSigns fails', async () => {
  mockSendMessage.mockImplementation(async (type: string) => {
    if (type === 'scanVitalSigns') {
      return { success: false, error: 'No active ePuskesmas tab' };
    }
    if (type === 'scanMedicalHistory') {
      return { success: true, history: [] };
    }
    return { success: true };
  });

  render(<SentraAssistSidepanelApp />);

  await act(async () => {
    await vi.runAllTimersAsync();
  });

  const ocrButton = await screen.findByRole('button', { name: /OCR/i });
  await act(async () => {
    fireEvent.click(ocrButton);
    await vi.runAllTimersAsync();
  });

  const lastCallProps = mockTTVInferenceUI.mock.calls.at(-1)?.[0] as Record<string, unknown>;
  expect(lastCallProps.rmeVitalFieldKeys).toEqual([]);
  expect(lastCallProps.ttvState).toMatchObject({ sbp: '', dbp: '' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @the-abyss/med-assist exec vitest run entrypoints/sidepanel/main.controller.test.tsx -t "rmeVitalFieldKeys|scanVitalSigns fails"`
Expected: FAIL on the first new case — `rmeVitalFieldKeys` is `undefined` on the captured props (main.tsx does not pass it yet). The failure-path case may already pass trivially (nothing to break yet) — that is fine, it becomes a real regression guard once Step 3 lands.

- [ ] **Step 3: Write minimal implementation**

In `entrypoints/sidepanel/main.tsx`, add a local type and state near the other `fetchPatientData`-related state (next to `patientData`/`ttvState`, around line 376). This type is intentionally declared locally (not imported from `TTVInferenceUI.tsx`) — it is structurally identical to the `VitalFieldKey` type Task 6 exports from `TTVInferenceUI.tsx`, so TypeScript accepts it for the `rmeVitalFieldKeys` prop without either file importing from the other:

```ts
type RmeVitalFieldKey = 'sbp' | 'dbp' | 'hr' | 'rr' | 'temp' | 'spo2' | 'glucose';

// ...

const [rmeVitalFieldKeys, setRmeVitalFieldKeys] = useState<RmeVitalFieldKey[]>([]);
```

In `fetchPatientData` (around line 565), add the 5th parallel call:

```ts
const [
  patientResponse,
  medicalHistoryResponse,
  visitHistoryResponse,
  contextResponse,
  vitalSignsResponse,
] = await Promise.allSettled([
  chromeTabs.sendMessage(tab.id, { type: 'getPatientInfo' }),
  sendMessage('scanMedicalHistory', undefined),
  sendMessage('scanVisitHistory', undefined),
  sendMessage('scanClinicalContext', undefined),
  sendMessage('scanVitalSigns', undefined),
]);
```

After the existing `contextResponse` handling block (search for where `contextResponse` is consumed further down in the same function) and before the function's `finally`/end, add:

```ts
if (vitalSignsResponse.status === 'fulfilled' && vitalSignsResponse.value?.success) {
  const vitals = vitalSignsResponse.value.vitals ?? {};
  const extractedKeys = (Object.keys(vitals) as RmeVitalFieldKey[]).filter((key) =>
    Boolean(vitals[key])
  );

  if (extractedKeys.length > 0) {
    setTTVState((prev) => ({ ...prev, ...vitals }));
    setRmeVitalFieldKeys(extractedKeys);
  }
}
```

Reset `rmeVitalFieldKeys` alongside the other resets in `onInitialisasi` (around line 815-822):

```ts
                  onInitialisasi={() => {
                    setOcrLightingActive(true);
                    setPatientData(defaultPatient);
                    setTTVState(initialTTVState);
                    setRmeVitalFieldKeys([]);
                    setAnamnesaDraft(null);
                    setActiveInferenceSurface('main');
                    void fetchPatientData({ patientLoadedSound: true });
                  }}
```

Pass the new prop to `<TTVInferenceUI ...>` (near the other `patient*` props, around line 843):

```tsx
                          <TTVInferenceUI
                            patientName={visiblePatientName}
                            patientGender={patientData.gender}
                            patientAge={patientData.age}
                            patientRM={patientData.rm}
                            rmeVitalFieldKeys={rmeVitalFieldKeys}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @the-abyss/med-assist exec vitest run entrypoints/sidepanel/main.controller.test.tsx`
Expected: PASS (all cases, including the new one)

Run: `pnpm --filter @the-abyss/med-assist typecheck`
Expected: clean (this will show an error that `TTVInferenceUI` has no `rmeVitalFieldKeys` prop yet until Task 6 adds it — if so, complete Task 6 before considering this task's typecheck gate satisfied; do not skip ahead in the test runner, only in typecheck sequencing)

- [ ] **Step 5: Commit**

```bash
git add entrypoints/sidepanel/main.tsx entrypoints/sidepanel/main.controller.test.tsx
git commit -m "feat(med-assist): pull RME vital signs into TTV state on OCR"
```

---

## Task 6: Tag extracted fields as `RME-manual` in `TTVInferenceUI`

**Files:**

- Modify: `apps/healthcare/med-assist/components/clinical/TTVInferenceUI.tsx`
- Test: `apps/healthcare/med-assist/components/clinical/TTVInferenceUI.rme-vitals.test.tsx`

**Interfaces:**

- Consumes: `rmeVitalFieldKeys?: VitalFieldKey[]` prop (Task 5); existing `makeFieldMeta`, `canOverrideField` from `@/lib/clinical/aassist-v2/field-priority`; existing `fieldMeta`/`setFieldMeta` local state (line ~1591); existing `state` (controlled `ttvState`).
- Produces: a new exported pure function `applyRmeVitalTags(currentFieldMeta, rmeVitalFieldKeys, state)` plus the `useEffect` that calls it — fields listed in `rmeVitalFieldKeys` end up tagged `'RME-manual'` in `fieldMeta`, which is what makes `vital-autocomplete.ts`'s existing `canOverrideField` check refuse to overwrite them (no code change needed in `vital-autocomplete.ts` itself).

**Important — testing approach:** `components/clinical/TTVInferenceUI.test.tsx` (the existing test file for this component) never calls `render()` on the full component — it only imports and tests small pure functions the file exports (`buildAlerts`, `buildLastVisitSummaryRows`, etc.), because the component is too large/deeply-wired to mount safely in isolation. Follow that exact precedent: extract the tagging logic into its own exported pure function and test that directly, with no `render()` call anywhere in this task.

- [ ] **Step 1: Write the failing test**

```tsx
// components/clinical/TTVInferenceUI.rme-vitals.test.tsx
import { describe, expect, it } from 'vitest';

import { applyRmeVitalTags } from './TTVInferenceUI';
import { canOverrideField, makeFieldMeta } from '@/lib/clinical/aassist-v2/field-priority';

const emptyVitalState = {
  sbp: '',
  dbp: '',
  hr: '',
  rr: '',
  temp: '',
  spo2: '',
  glucose: '',
};

describe('applyRmeVitalTags', () => {
  it('tags newly extracted RME fields as RME-manual', () => {
    const state = { ...emptyVitalState, sbp: '180', dbp: '110' };
    const result = applyRmeVitalTags({}, ['sbp', 'dbp'], state);

    expect(result.sbp).toMatchObject({ value: '180', source: 'RME-manual' });
    expect(result.dbp).toMatchObject({ value: '110', source: 'RME-manual' });
  });

  it('does not tag a field whose current state value is empty', () => {
    const state = { ...emptyVitalState, dbp: '110' };
    const result = applyRmeVitalTags({}, ['sbp', 'dbp'], state);

    expect(result.sbp).toBeUndefined();
    expect(result.dbp).toMatchObject({ source: 'RME-manual' });
  });

  it('preserves existing fieldMeta entries for fields not listed in rmeVitalFieldKeys', () => {
    const existingHrMeta = makeFieldMeta('88', 'ASIST-manual');
    const state = { ...emptyVitalState, sbp: '180', hr: '88' };
    const result = applyRmeVitalTags({ hr: existingHrMeta }, ['sbp'], state);

    expect(result.hr).toEqual(existingHrMeta);
    expect(result.sbp).toMatchObject({ source: 'RME-manual' });
  });

  it('returns the input unchanged when rmeVitalFieldKeys is empty', () => {
    const existing = { hr: makeFieldMeta('88', 'ASIST-manual') };
    expect(applyRmeVitalTags(existing, [], emptyVitalState)).toBe(existing);
  });
});

describe('RME-manual field-priority regression (AutoComplete+ cannot override)', () => {
  it('blocks ASIST-autocomplete from overriding an RME-manual sbp/dbp pair', () => {
    const meta = {
      sbp: makeFieldMeta('180', 'RME-manual'),
      dbp: makeFieldMeta('110', 'RME-manual'),
    };

    // canOverrideField is the exact function vital-autocomplete.ts gates on;
    // this proves the rank alone blocks 'ASIST-autocomplete' without lockField().
    expect(canOverrideField(meta.sbp, 'ASIST-autocomplete')).toBe(false);
    expect(canOverrideField(meta.dbp, 'ASIST-autocomplete')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @the-abyss/med-assist exec vitest run components/clinical/TTVInferenceUI.rme-vitals.test.tsx`
Expected: FAIL — `Cannot find export 'applyRmeVitalTags' from './TTVInferenceUI'` (the second `describe` block passes already, since it only exercises the pre-existing `canOverrideField`/`makeFieldMeta` — that is expected and fine, it is a regression lock, not new-code-dependent).

- [ ] **Step 3: Write minimal implementation**

In `components/clinical/TTVInferenceUI.tsx`, first add `export` to the existing local type declaration so the test file can reference it if needed (around line 162):

```ts
export type VitalFieldKey = 'sbp' | 'dbp' | 'hr' | 'rr' | 'temp' | 'spo2' | 'glucose';
```

Add the new exported pure function near the other top-level exported helpers in this file (e.g. near `createBootScrambleValues`, well before the `TTVInferenceUI` component definition):

```ts
/**
 * Tags freshly RME-extracted vitals as the highest-priority field source so
 * AutoComplete+ (rank 'ASIST-autocomplete') can never overwrite them —
 * physician manual typing is untouched, since updateField() always re-tags
 * as 'ASIST-manual' regardless of the existing source. Pure so it can be
 * unit-tested without mounting the (very large) TTVInferenceUI component.
 */
export function applyRmeVitalTags(
  currentFieldMeta: Partial<Record<VitalFieldKey, FieldMeta>>,
  rmeVitalFieldKeys: VitalFieldKey[],
  state: Record<VitalFieldKey, string>
): Partial<Record<VitalFieldKey, FieldMeta>> {
  if (rmeVitalFieldKeys.length === 0) return currentFieldMeta;

  const next = { ...currentFieldMeta };
  rmeVitalFieldKeys.forEach((field) => {
    const value = state[field];
    if (typeof value === 'string' && value.trim() !== '') {
      next[field] = makeFieldMeta(value, 'RME-manual');
    }
  });
  return next;
}
```

Add the prop to the props interface (near `bootSequenceActive?: boolean;` around line 268):

```ts
  rmeVitalFieldKeys?: VitalFieldKey[];
```

Destructure it with a default in the component's props (near `bootSequenceActive = false,` around line 1532):

```ts
      rmeVitalFieldKeys = [],
```

Add the effect directly after the existing `fieldMeta` reset effect (after line 1669's `}, [patientRM]);`), calling the new pure function instead of inlining the logic:

```ts
useEffect(() => {
  if (rmeVitalFieldKeys.length === 0) return;
  setFieldMeta((prev) => applyRmeVitalTags(prev, rmeVitalFieldKeys, state));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [rmeVitalFieldKeys, patientRM]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @the-abyss/med-assist exec vitest run components/clinical/TTVInferenceUI.rme-vitals.test.tsx`
Expected: PASS (5/5)

Run: `pnpm --filter @the-abyss/med-assist typecheck`
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add components/clinical/TTVInferenceUI.tsx components/clinical/TTVInferenceUI.rme-vitals.test.tsx
git commit -m "feat(med-assist): tag RME-extracted vitals as RME-manual field source"
```

---

## Task 7: Deterministic 2-slot vital-warning selector

**Files:**

- Create: `apps/healthcare/med-assist/lib/clinical/vital-warning-selector.ts`
- Test: `apps/healthcare/med-assist/lib/clinical/vital-warning-selector.test.ts`

**Interfaces:**

- Consumes: `VitalGuardrailAssessment['fieldStatus']` shape from `lib/clinical/vital-guardrails.ts` (existing, unchanged) — specifically `Record<VitalFieldKey, VitalFieldStatus>` where `VitalFieldStatus = { field, severity: 'normal'|'warning'|'critical'|'blocked', value?, label?, ... }`.
- Produces: `selectVitalWarnings(fieldStatus): VitalWarningSlot[]` (0-2 entries) — consumed by Task 8 (`main.tsx`).

- [ ] **Step 1: Write the failing test**

First read `lib/clinical/vital-guardrails.ts`'s `VitalFieldStatus` and `buildInitialFieldStatus` (or wherever `label`/`value` get populated per field) to confirm the exact field names available on each status entry before writing fixtures — the test below assumes `severity`, `value` (number), and `label` (string) exist per the interface already documented in the design spec; if the real label format differs, use the real one instead of inventing a new one.

```ts
// lib/clinical/vital-warning-selector.test.ts
import { describe, expect, it } from 'vitest';

import { selectVitalWarnings } from '@/lib/clinical/vital-warning-selector';
import type { VitalFieldStatus, VitalFieldKey } from '@/lib/clinical/vital-guardrails';

function normalStatus(field: VitalFieldKey): VitalFieldStatus {
  return { field, severity: 'normal' };
}

describe('selectVitalWarnings', () => {
  it('returns an empty array when every vital is normal', () => {
    const fieldStatus = {
      sbp: normalStatus('sbp'),
      dbp: normalStatus('dbp'),
      hr: normalStatus('hr'),
      rr: normalStatus('rr'),
      temp: normalStatus('temp'),
      spo2: normalStatus('spo2'),
      glucose: normalStatus('glucose'),
    };

    expect(selectVitalWarnings(fieldStatus)).toEqual([]);
  });

  it('always shows TD first when abnormal, even if other vitals are also abnormal', () => {
    const fieldStatus = {
      sbp: { field: 'sbp' as const, severity: 'critical' as const, value: 180 },
      dbp: { field: 'dbp' as const, severity: 'critical' as const, value: 110 },
      hr: { field: 'hr' as const, severity: 'warning' as const, value: 130 },
      rr: normalStatus('rr'),
      temp: normalStatus('temp'),
      spo2: normalStatus('spo2'),
      glucose: normalStatus('glucose'),
    };

    const result = selectVitalWarnings(fieldStatus);
    expect(result[0]).toMatchObject({ label: 'TD', value: '180/110' });
  });

  it('shows TD and Suhu together when both are abnormal, ignoring other abnormal vitals', () => {
    const fieldStatus = {
      sbp: { field: 'sbp' as const, severity: 'critical' as const, value: 180 },
      dbp: { field: 'dbp' as const, severity: 'critical' as const, value: 110 },
      hr: { field: 'hr' as const, severity: 'warning' as const, value: 130 },
      rr: normalStatus('rr'),
      temp: { field: 'temp' as const, severity: 'warning' as const, value: 39.2 },
      spo2: normalStatus('spo2'),
      glucose: normalStatus('glucose'),
    };

    const result = selectVitalWarnings(fieldStatus);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ label: 'TD', value: '180/110' });
    expect(result[1]).toMatchObject({ label: 'Suhu', value: '39.2' });
  });

  it('fills the remaining slot with HR before RR/SpO2/Glucose when TD is abnormal but Suhu is normal', () => {
    const fieldStatus = {
      sbp: { field: 'sbp' as const, severity: 'critical' as const, value: 180 },
      dbp: { field: 'dbp' as const, severity: 'critical' as const, value: 110 },
      hr: { field: 'hr' as const, severity: 'warning' as const, value: 130 },
      rr: { field: 'rr' as const, severity: 'warning' as const, value: 30 },
      temp: normalStatus('temp'),
      spo2: normalStatus('spo2'),
      glucose: normalStatus('glucose'),
    };

    const result = selectVitalWarnings(fieldStatus);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ label: 'TD' });
    expect(result[1]).toMatchObject({ label: 'HR', value: '130' });
  });

  it('falls through HR -> RR -> SpO2 -> Glucose in order when TD and Suhu are both normal', () => {
    const fieldStatus = {
      sbp: normalStatus('sbp'),
      dbp: normalStatus('dbp'),
      hr: normalStatus('hr'),
      rr: normalStatus('rr'),
      temp: normalStatus('temp'),
      spo2: { field: 'spo2' as const, severity: 'critical' as const, value: 88 },
      glucose: { field: 'glucose' as const, severity: 'warning' as const, value: 250 },
    };

    const result = selectVitalWarnings(fieldStatus);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ label: 'SpO2', value: '88' });
    expect(result[1]).toMatchObject({ label: 'Glukosa', value: '250' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @the-abyss/med-assist exec vitest run lib/clinical/vital-warning-selector.test.ts`
Expected: FAIL — `Cannot find module '@/lib/clinical/vital-warning-selector'`

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/clinical/vital-warning-selector.ts
import type { VitalFieldStatus } from '@/lib/clinical/vital-guardrails';

export interface VitalWarningSlot {
  label: string;
  value: string;
}

/**
 * Picks up to 2 abnormal vitals to surface in the patient-bar warning
 * badge. TD and Suhu always win their slot when abnormal (Chief's explicit
 * instruction); the remaining slot(s) fall through HR -> RR -> SpO2 ->
 * Glucose in fixed order. Fully deterministic — no magnitude comparison
 * across dissimilar units.
 */
export function selectVitalWarnings(fieldStatus: {
  sbp: VitalFieldStatus;
  dbp: VitalFieldStatus;
  hr: VitalFieldStatus;
  rr: VitalFieldStatus;
  temp: VitalFieldStatus;
  spo2: VitalFieldStatus;
  glucose: VitalFieldStatus;
}): VitalWarningSlot[] {
  const slots: VitalWarningSlot[] = [];

  const isAbnormal = (status: VitalFieldStatus): boolean => status.severity !== 'normal';

  if (isAbnormal(fieldStatus.sbp) || isAbnormal(fieldStatus.dbp)) {
    slots.push({ label: 'TD', value: `${fieldStatus.sbp.value}/${fieldStatus.dbp.value}` });
  }

  if (slots.length < 2 && isAbnormal(fieldStatus.temp)) {
    slots.push({ label: 'Suhu', value: `${fieldStatus.temp.value}` });
  }

  const fallbackOrder: Array<{ key: 'hr' | 'rr' | 'spo2' | 'glucose'; label: string }> = [
    { key: 'hr', label: 'HR' },
    { key: 'rr', label: 'RR' },
    { key: 'spo2', label: 'SpO2' },
    { key: 'glucose', label: 'Glukosa' },
  ];

  for (const { key, label } of fallbackOrder) {
    if (slots.length >= 2) break;
    const status = fieldStatus[key];
    if (isAbnormal(status)) {
      slots.push({ label, value: `${status.value}` });
    }
  }

  return slots;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @the-abyss/med-assist exec vitest run lib/clinical/vital-warning-selector.test.ts`
Expected: PASS (5/5)

Run: `pnpm --filter @the-abyss/med-assist typecheck`
Expected: clean — `VitalFieldStatus` and `VitalFieldKey` are already exported from `vital-guardrails.ts` (confirmed: `export type VitalFieldKey = ...` at line 7, `export interface VitalFieldStatus` at line 39), so no change to that file is needed for this task.

- [ ] **Step 5: Commit**

```bash
git add lib/clinical/vital-warning-selector.ts lib/clinical/vital-warning-selector.test.ts
git commit -m "feat(med-assist): add deterministic 2-slot vital-warning selector"
```

---

## Task 8: Derive warnings in `main.tsx` and pass to header

**Files:**

- Modify: `apps/healthcare/med-assist/entrypoints/sidepanel/main.tsx`
- Modify: `apps/healthcare/med-assist/entrypoints/sidepanel/main.controller.test.tsx`

**Interfaces:**

- Consumes: `assessVitalGuardrails` (existing, `@/lib/clinical/vital-guardrails`), `selectVitalWarnings` (Task 7).
- Produces: `vitalWarnings: VitalWarningSlot[]` prop passed to `<SidePanelHeader vitalWarnings={vitalWarnings} .../>` — consumed by Task 9.

- [ ] **Step 1: Write the failing test**

Add to `main.controller.test.tsx`, reusing the `mockSendMessage` vitals fixture already added in Task 5 (`sbp: '150', dbp: '95', ...` — all abnormal for an adult). First find how `SidePanelHeader` is imported/rendered in `main.tsx` (it is NOT mocked in this test file today, so its real render is exercised) and locate the patient-bar's warning slot markup once Task 9 exists; for now, assert on the prop the real `SidePanelHeader` receives isn't feasible without mocking it, so mock it the same way as `TTVInferenceUI`:

```ts
const { mockSidePanelHeader } = vi.hoisted(() => ({
  mockSidePanelHeader: vi.fn(),
}));

vi.mock('@/components/sidepanel/SidePanelHeader', () => ({
  SidePanelHeader: (props: Record<string, unknown>) => {
    mockSidePanelHeader(props);
    return <div data-testid="mock-sidepanel-header" />;
  },
}));
```

Add `mockSidePanelHeader.mockReset();` to `beforeEach`. Add the test:

```tsx
it('derives vitalWarnings from RME-extracted vitals and passes them to SidePanelHeader', async () => {
  render(<SentraAssistSidepanelApp />);

  await act(async () => {
    await vi.runAllTimersAsync();
  });

  const ocrButton = await screen.findByRole('button', { name: /OCR/i });
  await act(async () => {
    fireEvent.click(ocrButton);
    await vi.runAllTimersAsync();
  });

  const lastCallProps = mockSidePanelHeader.mock.calls.at(-1)?.[0] as Record<string, unknown>;
  expect(lastCallProps.vitalWarnings).toEqual(
    expect.arrayContaining([expect.objectContaining({ label: 'TD' })])
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @the-abyss/med-assist exec vitest run entrypoints/sidepanel/main.controller.test.tsx -t "vitalWarnings"`
Expected: FAIL — `vitalWarnings` is `undefined`.

- [ ] **Step 3: Write minimal implementation**

In `main.tsx`, add the imports near the other `lib/clinical` imports:

```ts
import { assessVitalGuardrails } from '@/lib/clinical/vital-guardrails';
import { selectVitalWarnings } from '@/lib/clinical/vital-warning-selector';
```

Derive the warnings from current `ttvState` + `patientData` (place this as a `useMemo` near where other derived values are computed, e.g. near `visiblePatientName`):

```ts
const vitalWarnings = useMemo(() => {
  const assessment = assessVitalGuardrails(
    {
      sbp: ttvState.sbp,
      dbp: ttvState.dbp,
      hr: ttvState.hr,
      rr: ttvState.rr,
      temp: ttvState.temp,
      spo2: ttvState.spo2,
      glucose: ttvState.glucose,
    },
    { age: patientData.age, gender: patientData.gender }
  );
  return selectVitalWarnings(assessment.fieldStatus);
}, [
  ttvState.sbp,
  ttvState.dbp,
  ttvState.hr,
  ttvState.rr,
  ttvState.temp,
  ttvState.spo2,
  ttvState.glucose,
  patientData.age,
  patientData.gender,
]);
```

Pass it to `<SidePanelHeader ...>` (near `ocrActive={ocrLightingActive}` around line 811):

```tsx
ocrActive = { ocrLightingActive };
vitalWarnings = { vitalWarnings };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @the-abyss/med-assist exec vitest run entrypoints/sidepanel/main.controller.test.tsx`
Expected: PASS (all cases)

Run: `pnpm --filter @the-abyss/med-assist typecheck`
Expected: clean once Task 9 adds the `vitalWarnings` prop to `SidePanelHeaderProps` — sequence typecheck verification after Task 9 if it errors here, same caveat as Task 5.

- [ ] **Step 5: Commit**

```bash
git add entrypoints/sidepanel/main.tsx entrypoints/sidepanel/main.controller.test.tsx
git commit -m "feat(med-assist): derive patient-bar vital warnings from guardrail severity"
```

---

## Task 9: Patient-bar 3-column layout + warning slots + RM/facility tooltip

**Files:**

- Modify: `apps/healthcare/med-assist/components/sidepanel/SidePanelHeader.tsx`
- Modify: `apps/healthcare/med-assist/entrypoints/sidepanel/style.css`
- Test: `apps/healthcare/med-assist/components/sidepanel/SidePanelHeader.test.tsx` (create if it doesn't already exist — check first; if it exists, add cases to it instead of creating a duplicate)

**Interfaces:**

- Consumes: `vitalWarnings?: VitalWarningSlot[]` prop (Task 8) — import the type from `@/lib/clinical/vital-warning-selector`.
- Produces: nothing consumed further — this is the leaf UI task.

- [ ] **Step 1: Write the failing test**

Check first whether `components/sidepanel/SidePanelHeader.test.tsx` already exists; if so, read it fully and add the cases below into it (matching its existing render-helper pattern) instead of creating a new file.

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SidePanelHeader } from '@/components/sidepanel/SidePanelHeader';

describe('SidePanelHeader patient-bar warning slots', () => {
  const baseProps = {
    activeEngine: 'vs',
    onEngineChange: () => {},
    patientName: 'Ferdi Iskandar',
    patientAge: 45,
    patientGender: 'L',
    patientRM: 'RM-0099',
    patientFacilityName: 'Puskesmas Balowerti',
    demographicStatus: 'ready' as const,
  };

  it('renders up to 2 vital warning slots in the middle column', () => {
    render(
      <SidePanelHeader
        {...baseProps}
        vitalWarnings={[
          { label: 'TD', value: '180/110' },
          { label: 'Suhu', value: '39.2' },
        ]}
      />
    );

    expect(screen.getByText(/TD 180\/110/)).toBeInTheDocument();
    expect(screen.getByText(/Suhu 39.2/)).toBeInTheDocument();
  });

  it('renders no warning text when vitalWarnings is empty', () => {
    render(<SidePanelHeader {...baseProps} vitalWarnings={[]} />);

    expect(screen.queryByText(/TD /)).not.toBeInTheDocument();
  });

  it('moves RM and facility into the name tooltip instead of a visible cell', () => {
    render(<SidePanelHeader {...baseProps} vitalWarnings={[]} />);

    const nameCell = screen.getByTitle(/RM-0099/);
    expect(nameCell).toHaveTextContent('Ferdi Iskandar');
    expect(screen.queryByText('RM-0099')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @the-abyss/med-assist exec vitest run components/sidepanel/SidePanelHeader.test.tsx`
Expected: FAIL — no warning text rendered yet, RM still shown as its own cell, no `title` tooltip on the name cell.

- [ ] **Step 3: Write minimal implementation**

In `SidePanelHeader.tsx`, add the import and prop:

```ts
import type { VitalWarningSlot } from '@/lib/clinical/vital-warning-selector';
```

```ts
  vitalWarnings?: VitalWarningSlot[];
```

Destructure with a default (near `previousVisitSections = [],`):

```ts
  vitalWarnings = [],
```

Build a combined tooltip string near the other display-derivation `const`s (after `patientFacilityDisplay` is computed, around line 113):

```ts
const nameTooltipParts = [
  normalizedPatientRM ? `RM ${normalizedPatientRM}` : '',
  patientFacilityDisplay,
].filter(Boolean);
const nameTooltip = nameTooltipParts.join(' — ') || undefined;
```

Replace the `.patient-bar` block (the whole block from `<div className="patient-bar">` at line 285 through its closing `</div>` at line 361) with:

```tsx
<div className="patient-bar">
  <span
    className="patient-field patient-field--identity patient-cell patient-cell--name"
    title={nameTooltip}
  >
    {patientNameDisplay}
  </span>
  <span className="patient-cell patient-cell--warning patient-cell--warning-1">
    {vitalWarnings[0] ? `${vitalWarnings[0].label} ${vitalWarnings[0].value}` : ''}
  </span>
  <div
    className="patient-cell patient-cell--history patient-cell--history-top"
    aria-label="Riwayat kronis slot 1 sampai 3"
  >
    {[0, 1, 2].map((slotIndex) => {
      const value = chronicHistoryTopSlots[slotIndex] ?? '';
      return (
        <span
          key={`history-top-${slotIndex}`}
          className={`patient-history-slot${value ? '' : ' patient-history-slot--empty'}`}
          title={value}
          aria-hidden={value ? undefined : true}
        >
          {value}
        </span>
      );
    })}
  </div>
  <div className="patient-cell patient-cell--meta" aria-label="Usia dan jenis kelamin pasien">
    {patientAgeDisplay ? (
      <span className="patient-field patient-cell patient-cell--age" title={patientAgeDisplay}>
        {patientAgeDisplay}
      </span>
    ) : null}
    {patientGenderDisplay ? (
      <span className="patient-field patient-cell patient-cell--sex" title={patientGenderDisplay}>
        {patientGenderDisplay}
      </span>
    ) : null}
  </div>
  <span className="patient-cell patient-cell--warning patient-cell--warning-2">
    {vitalWarnings[1] ? `${vitalWarnings[1].label} ${vitalWarnings[1].value}` : ''}
  </span>
  <div
    className="patient-cell patient-cell--history patient-cell--history-bottom"
    aria-label="Riwayat kronis slot 4 sampai 6"
  >
    {[0, 1, 2].map((slotIndex) => {
      const value = chronicHistoryBottomSlots[slotIndex] ?? '';
      return (
        <span
          key={`history-bottom-${slotIndex}`}
          className={`patient-history-slot${value ? '' : ' patient-history-slot--empty'}`}
          title={value}
          aria-hidden={value ? undefined : true}
        >
          {value}
        </span>
      );
    })}
  </div>
</div>
```

This removes the old `patient-cell--rm` and `patient-cell--facility` spans entirely (their data now lives in `nameTooltip`), and adds `patient-cell--warning-1`/`patient-cell--warning-2` plus `patient-cell--history-top`/`patient-cell--history-bottom` modifier classes so each cell can be placed explicitly in the grid (Step 4), independent of DOM order.

In `entrypoints/sidepanel/style.css`, add explicit grid placement rules directly after the existing `.card-header .patient-cell--history` rule (around line 2376, before `.patient-history-slot`):

```css
.card-header .patient-cell--name {
  grid-column: 1;
  grid-row: 1;
}

.card-header .patient-cell--meta {
  grid-column: 1;
  grid-row: 2;
}

.card-header .patient-cell--warning {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 20px;
  color: #ff8a8a;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-header .patient-cell--warning-1 {
  grid-column: 2;
  grid-row: 1;
}

.card-header .patient-cell--warning-2 {
  grid-column: 2;
  grid-row: 2;
}

.card-header .patient-cell--history-top {
  grid-column: 3;
  grid-row: 1;
}

.card-header .patient-cell--history-bottom {
  grid-column: 3;
  grid-row: 2;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @the-abyss/med-assist exec vitest run components/sidepanel/SidePanelHeader.test.tsx`
Expected: PASS (3/3)

Run: `pnpm --filter @the-abyss/med-assist typecheck`
Expected: clean

Run full suite to catch any pre-existing `SidePanelHeader` test that asserted the old RM/facility cell text directly (search first): `pnpm --filter @the-abyss/med-assist exec vitest run -t "SidePanelHeader\|patient-bar\|patientRM\|patientFacility"` — if anything else in the suite asserted `patient-cell--rm`/`patient-cell--facility` text visibility, update those assertions to check the `title` tooltip instead, following the same reasoning as this task's own test.

- [ ] **Step 5: Commit**

```bash
git add components/sidepanel/SidePanelHeader.tsx components/sidepanel/SidePanelHeader.test.tsx entrypoints/sidepanel/style.css
git commit -m "feat(med-assist): redesign patient-bar into 3 columns with vital-warning slots"
```

---

## Final Verification (run once, after Task 9)

```bash
pnpm --filter @the-abyss/med-assist typecheck
pnpm --filter @the-abyss/med-assist exec eslint entrypoints/content.ts entrypoints/background.ts entrypoints/sidepanel/main.tsx components/clinical/TTVInferenceUI.tsx components/sidepanel/SidePanelHeader.tsx lib/scraper/vital-signs.ts lib/clinical/vital-warning-selector.ts utils/messaging.ts
pnpm run test
pnpm run build
```

Expected: all green, `.output/chrome-mv3-dev` rebuilt with the new code (per the project's standing rule to always rebuild after a completed slice).

Update `.agent/HANDOFF.md` with the final commit hashes and verification evidence per this repo's session-end protocol before considering the feature done.
