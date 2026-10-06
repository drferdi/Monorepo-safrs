# Audit Remediation (Cursor audit 2026-10-06) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the verified findings of the Cursor audit that need no clinical decision, give Chief
ready-to-run tasks for the R3 findings, and list the decisions the rest waits for.

**Architecture:** Three parts. Part A (Tasks 1-3) touches no R3 path and no protected file and can
run at once. Part B (Tasks 4-7) sits under `lib/iskandar-diagnosis-engine/**` (R3): each task runs
only after Chief says "jalankan" for that task. Part C is a list of decisions; each becomes its own
plan after Chief chooses.

**Tech Stack:** WXT (MV3), React, TypeScript strict, Vitest (jsdom), Node 24 `.mjs` scripts, pnpm
through `scripts/pnpm.mjs`.

**Spec:** the Cursor audit pasted by Chief on 2026-10-06 and its verification in the same session
(summary in "Verified findings" below; every line was checked against the files named).

## Global Constraints

- Capsule root: `D:\DEV\monorepo\projects\healthcare\med-assist`. Never call npm/pnpm directly;
  use `node scripts/pnpm.mjs ...`.
- Single test: `node scripts/pnpm.mjs exec vitest run <path>`.
- Capsule gates, in this order, build last: `run lint`, `run typecheck`, `run test`,
  `run test:e2e`, `exec wxt build --mode development`, `run run:check`, `run build`.
- Root gates (from `D:\DEV\monorepo`, HANDOFF already updated): governance, check:tokens, lint,
  typecheck, test, build. Known red before this plan: governance 1, lint 1 (gaffer), test 1
  (PostgreSQL 54329 down).
- Test first, and see it fail before the fix. A test that pins correct existing behaviour is shown
  to bite by a temporary mutation of the code under test, then the mutation is undone and
  `git diff --stat <file>` must be empty.
- Never change an assertion silently; name every migrated assertion in the commit body.
- R3, Chief's "jalankan" per task: `lib/iskandar-diagnosis-engine/**`, `lib/emergency-detector/**`,
  `lib/clinical/**`, `public/data/penyakit.json`.
- Protected: `entrypoints/sidepanel/main.tsx`, `components/clinical/TTVInferenceUI.tsx`,
  `SentraAssistPanel.tsx`. `entrypoints/sidepanel/style.css` is append-only.
- Not this session's, never staged: `lib/api/sentra-api.ts`,
  `lib/api/sentra-api.recommend-prescription.test.ts`, `tests/e2e/zz-verify-kb-rx.spec.ts`,
  `docs/brand/`, root `.agents/HANDOFF.md`.
- Never read `.env*` contents; synthetic data only. No live model call.
- Commits: local, explicit paths, no push, no PR. Trailer:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. HANDOFF overwritten and DECISIONS
  appended (CRLF; Python edits with `newline=''`) in the commit that closes each part.

## Verified findings this plan answers

| # | Finding (verified 2026-10-06) | Where | Plan |
|---|---|---|---|
| F1 | The panel's RME transfer may fill another patient's tab: tab choice is a score with a fallback to the active tab; nothing re-checks the patient before `execFill` | `entrypoints/background.ts:454-477`, `lib/rme/transfer-targeting.ts:135-167` | Task 1 |
| F2 | Static credentials reach the bundle; `diagnosis-v2.ts:47` and `hybrid-trajectory.ts:257` read the whole `import.meta.env`, so every `VITE_*`/`SENTRA_*` value is inlined | `lib/api/sentra-api.ts:62,765`, `lib/diagnosis-engine/mira-engine.ts:65,102` | Task 2 (gate), C2 (token) |
| F3 | `run-diagnosis.ts:5` says `legacy` is the default; production builds set `mira` (`wxt.config.ts:71-74`). `docs/architecture.md:450-452` counts 140 test files and 961 tests (now 204 files) | as named | Task 3 |
| F4 | qSOFA thresholds tested on neither side of the line | `red-flags.ts:107-119`, `red-flags.test.ts:82-86` | Task 4 |
| F5 | NEWS2 band edges untested; SpO2 Scale 2 ignores the oxygen flag, so a COPD patient on air with SpO2 95 % scores 2 (RCP 2017: 0). `hasCOPD` is live (`hybrid-trajectory.ts:995,1054`) | `clinical-trajectory-intelligence.ts:182-194,312` | Task 5 |
| F6 | KB contract never asserts `diagnosis_banding` (75 of 159 empty) or `structured_criteria` (107 of 159 absent); no entry has a confidence tier | `penyakit-kb.contract.test.ts:92-162` | Task 6, C4 |
| F7 | The audit log stores the context before anonymisation is validated | `engine.ts:251-266` | Task 7 |
| F8 | Engine authority text contradicts the build (README:42, `project.contract.json:37`, `AGENTS.md:59-60`, `mira-engine.ts:14`) | as named | C1 |
| F9 | Encounter (24 h) and auth session persist in `storage.local`; `main.tsx:207` reads the encounter there | `utils/storage.ts:39,78,128`, `lib/api/auth-store.ts:202` | C3 |
| F10 | No CI runs the capsule: the root workspace glob is `projects/*/*/apps/*` and med-assist has no `apps/` | `pnpm-workspace.yaml:2` | C5 |
| F11 | Trajectory refuses fewer than 2 visits; `AGENTS.md:61` says "from one visit onward" | `ClinicalTrajectory.tsx:349` | C6 |
| F12 | Unused dependencies (`apexcharts`, `@pieces.app/pieces-os-client`; `react-apexcharts` only in `vi.mock`; `tesseract.js` only in `services/medlens-local`); dead override `@vitejs/plugin-react` 5.0.4 (lock 5.2.0) | `package.json` | C7 |
| F13 | `calculateDosage` unused and untested | `lib/clinical/dosage-database.ts:346` | C8 |

## Review Focus

1. A transfer while the encounter's own page is closed and another patient's page is active must
   refuse, not fill. Test in Task 1 (unit and background).
2. An encounter with a blank id must keep the old choice (best ePuskesmas tab, then the active
   tab), so a page without a numeric id still transfers. Test in Task 1.
3. A short env value (for example `"1"`) must not fail the release check by matching random code.
   Test in Task 2.
4. A credential baked in by an older build, while today's env is empty, must still fail the
   release check. Test in Task 2.
5. A COPD patient on room air must be scored by RCP Scale 2's air bands. Test in Task 5 (expected
   red; the fix waits for Chief).

---

## Part A: no R3, no protected file

### Task 1: The panel's RME transfer fills only the encounter's pelayanan tab

**Files:**
- Modify: `lib/rme/transfer-targeting.ts` (new export after `selectBridgeTransferTab`, line 191)
- Modify: `entrypoints/background.ts:454-477` (`resolveTransferTabId`), `:663-668` (error in
  `executeRMEFillStep`), and its import from `@/lib/rme/transfer-targeting`
- Test: `lib/rme/transfer-targeting.test.ts`, `tests/runtime/background.exec-scrape.test.ts`

**Interfaces:**
- Produces: `selectPanelTransferTab(candidates: TransferTabCandidate[], options: { encounterId?: string; step?: RMETransferStepStatus; activeTabId?: number }): number | undefined`
- Consumes: `selectBridgeTransferTab`, `selectBestTransferTab` (same file). The orchestrator
  already maps `PATIENT_MISMATCH` to non-recoverable (`transfer-orchestrator.ts:323`), and the
  panel already shows "Halaman pasien entri ini tidak terbuka; tidak diisi ke pasien lain."
  (`ClinicalDifferential.tsx:421`).

- [ ] **Step 1: Write the failing unit tests.** Add `selectPanelTransferTab` to the import at the
  top of `lib/rme/transfer-targeting.test.ts` and append:

```ts
describe('panel transfer targeting', () => {
  const host = 'https://kotakediri.epuskesmas.id';

  it("fills the encounter's pelayanan tab, not the active tab of another patient", () => {
    const selected = selectPanelTransferTab(
      [
        { id: 61, active: true, url: `${host}/resep/create/90001?from=pelayanan` },
        { id: 62, active: false, url: `${host}/resep/create/83206?from=pelayanan` },
      ],
      { encounterId: '83206', step: 'resep', activeTabId: 61 }
    );

    expect(selected).toBe(62);
  });

  it("returns no tab when the encounter's page is closed, even with another patient active", () => {
    const selected = selectPanelTransferTab(
      [{ id: 71, active: true, url: `${host}/anamnesa/create/90001?from=pelayanan` }],
      { encounterId: '83206', step: 'anamnesa', activeTabId: 71 }
    );

    expect(selected).toBeUndefined();
  });

  it('keeps the best ePuskesmas tab, then the active tab, without an encounter id', () => {
    const candidates = [
      { id: 81, active: true, url: 'chrome-extension://sentra/sidepanel.html' },
      { id: 82, active: false, url: `${host}/anamnesa/create/90001` },
    ];
    expect(selectPanelTransferTab(candidates, { step: 'anamnesa', activeTabId: 81 })).toBe(82);
    expect(
      selectPanelTransferTab(candidates, { encounterId: ' ', step: 'anamnesa', activeTabId: 81 })
    ).toBe(82);
    expect(
      selectPanelTransferTab([{ id: 91, active: true, url: 'https://example.org/' }], {
        activeTabId: 91,
      })
    ).toBe(91);
  });
});
```

- [ ] **Step 2: Write the failing background test.** In
  `tests/runtime/background.exec-scrape.test.ts`:
  - Add `const transferRun = vi.fn();` after `const executeScript = vi.fn();` (line 18).
  - Replace the orchestrator mock (lines 62-64) with:

```ts
vi.mock('@/lib/rme/transfer-orchestrator', () => ({
  RMETransferOrchestrator: class {
    run = transferRun;
  },
}));
```

  - Append inside the `describe` block, after the last `it.each`:

```ts
  // The panel's transfer fills the encounter's pelayanan only; with that page closed it refuses
  // rather than fill the active tab, which may hold another patient (audit 2026-10-06).
  it("refuses a panel transfer when only another patient's tab is open", async () => {
    getEncounter.mockReset();
    getEncounter.mockResolvedValue(buildEncounter('83206'));
    const other = {
      id: 31,
      active: true,
      url: 'https://kotakediri.epuskesmas.id/resep/create/90001',
    };
    tabsQuery.mockResolvedValue([other]);
    tabsGet.mockResolvedValue(other);
    let execute: ((step: 'resep', payload: unknown) => Promise<unknown>) | undefined;
    transferRun.mockImplementation(async (_payload: unknown, executor: typeof execute) => {
      execute = executor;
      return {
        runId: 'run-1',
        fingerprint: 'fp',
        state: 'failed',
        steps: {},
        reasonCodes: [],
        totalLatencyMs: 0,
      };
    });
    const backgroundMain = (await import('../../entrypoints/background'))
      .default as unknown as () => void;
    backgroundMain();

    await registeredHandlers.get('transferRME')!({
      data: { resep: {}, options: { onlyStep: 'resep' } },
    });

    await expect(execute?.('resep', {})).rejects.toThrow('PATIENT_MISMATCH');
    expect(sendMessageToTabWithTimeout).not.toHaveBeenCalled();
  });
```

- [ ] **Step 3: Run both test files and see them fail.**
  Run: `node scripts/pnpm.mjs exec vitest run lib/rme/transfer-targeting.test.ts tests/runtime/background.exec-scrape.test.ts`
  Expected:
  - unit: FAIL, `selectPanelTransferTab is not a function`;
  - background: FAIL, because the old code picks tab 31 and either messages it or times out.
    Either way the error is not `PATIENT_MISMATCH`.

- [ ] **Step 4: Implement the selector.** In `lib/rme/transfer-targeting.ts`, after
  `selectBridgeTransferTab`:

```ts
/**
 * The tab the side panel's transfer may fill. With an encounter, only its pelayanan's ePuskesmas
 * tab, as for a bridge entry, so another patient's active tab is never filled (audit 2026-10-06).
 * Without one, the best-scoring tab, then the active tab, as before.
 */
export function selectPanelTransferTab(
  candidates: TransferTabCandidate[],
  options: { encounterId?: string; step?: RMETransferStepStatus; activeTabId?: number }
): number | undefined {
  if (options.encounterId?.trim()) {
    return selectBridgeTransferTab(candidates, {
      pelayananId: options.encounterId,
      step: options.step,
    });
  }
  return selectBestTransferTab(candidates, { step: options.step }) ?? options.activeTabId;
}
```

- [ ] **Step 5: Wire the background.**
  - In `entrypoints/background.ts`, replace the body of `resolveTransferTabId` (lines 454-477) with:

```ts
async function resolveTransferTabId(step?: RMETransferStepStatus): Promise<number | undefined> {
  const encounter = await getEncounter().catch(() => null);
  const activeTabs = await browser.tabs.query({ active: true, currentWindow: true });
  const activeTab = activeTabs[0];
  const epuskesmasTabs = await browser.tabs.query({ url: '*://*.epuskesmas.id/*' });
  return selectPanelTransferTab(
    [activeTab, ...epuskesmasTabs].filter(
      (candidate, index, list) =>
        typeof candidate?.id === 'number' &&
        list.findIndex((item) => item?.id === candidate.id) === index
    ),
    { encounterId: encounter?.id || undefined, step, activeTabId: activeTab?.id }
  );
}
```

  - Replace the `if (!tabId) { ... }` block in `executeRMEFillStep` (lines 663-668) with:

```ts
  if (!tabId) {
    // A bridge entry, or the panel's encounter, names its patient: never fill another tab.
    const pelayananId =
      bridgePelayananId ?? ((await getEncounter().catch(() => null))?.id || undefined);
    if (pelayananId !== undefined) {
      throw new Error(`PATIENT_MISMATCH: no ePuskesmas tab of pelayanan ${pelayananId}`);
    }
    throw new Error('No active tab');
  }
```

  - In the import from `@/lib/rme/transfer-targeting`, add `selectPanelTransferTab`. Remove
    `selectBestTransferTab` only if `background.ts` no longer uses it (`grep -n selectBestTransferTab entrypoints/background.ts`).

- [ ] **Step 6: Run the two files again.**
  Run: same command as Step 3. Expected: PASS, including the four existing bridge tests and the
  three existing background tests.

- [ ] **Step 7: Run the transfer-adjacent suites.**
  Run: `node scripts/pnpm.mjs exec vitest run components/clinical/ClinicalDifferential.rme-transfer.e2e.test.tsx components/clinical/ClinicalDifferential.logic-contract.test.tsx tests/runtime/message-contract-parity.test.ts`
  Expected: PASS.

- [ ] **Step 8: Commit.**

```bash
git add lib/rme/transfer-targeting.ts lib/rme/transfer-targeting.test.ts entrypoints/background.ts tests/runtime/background.exec-scrape.test.ts
git commit -m "fix(med-assist): the panel's RME transfer fills only the encounter's pelayanan tab" -m "Audit 2026-10-06 (F1): the transfer chose the best-scoring tab and fell back to the active tab, which could hold another patient. With an encounter it now takes only that pelayanan's ePuskesmas tab, as a bridge entry does, and refuses with PATIENT_MISMATCH otherwise. Without an encounter id the old choice stays. Test mock migrated: RMETransferOrchestrator is now a class with run = transferRun (was an empty class); no assertion changed." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Known residual, for Chief (C9): the encounter is the last ePuskesmas page that loaded. If Chief
opens patient B after A and goes back to A's tab, the transfer goes to B's tab, because B is the
stored encounter. That is better than today's fallback to the active tab, but it is still not a
re-read of the patient on the target page.

### Task 2: Release check that refuses a bundle carrying a credential

**Files:**
- Create: `scripts/release-check.mjs`, `scripts/release-check.test.mjs`
- Modify: `package.json` (scripts: add `"release:check": "node scripts/release-check.mjs"` after
  `"run:check"`)

**Interfaces:**
- Produces: `releaseFailures(env: Record<string, string | undefined>, files: Record<string, string>, options?: { allowDevToken?: boolean }): string[]` and `SECRET_ENV`. Each failure reads `"<VAR> tertanam di <file>"` and never contains a value.

- [ ] **Step 1: Write the failing test** `scripts/release-check.test.mjs`:

```js
import { describe, expect, it } from "vitest";

import { releaseFailures } from "./release-check.mjs";

// Synthetic values only.
const TOKEN = "synthetic-mira-token-0123456789";
const KEY = "synthetic-api-key-abcdefghij";

describe("releaseFailures", () => {
  it("passes a bundle built with empty credentials", () => {
    const files = { "background.js": 'const e={VITE_MIRA_DEV_TOKEN:"",VITE_SENTRA_API_KEY:""};' };
    expect(releaseFailures({ VITE_MIRA_DEV_TOKEN: "", VITE_SENTRA_API_KEY: "" }, files)).toEqual([]);
  });

  it("names a credential whose value is in the bundle, never the value", () => {
    const files = { "chunks/api.js": `fetch(u,{headers:{Authorization:"Bearer ${KEY}"}})` };
    const failures = releaseFailures({ VITE_SENTRA_API_KEY: KEY }, files);
    expect(failures).toEqual(["VITE_SENTRA_API_KEY tertanam di chunks/api.js"]);
    expect(failures.join(" ")).not.toContain(KEY);
  });

  it("finds a filled credential in the inlined env object even when today's env is empty", () => {
    const files = { "background.js": `const e={"VITE_MIRA_DEV_TOKEN":"${TOKEN}"};` };
    expect(releaseFailures({}, files)).toEqual(["VITE_MIRA_DEV_TOKEN tertanam di background.js"]);
  });

  it("does not match a short env value against unrelated code", () => {
    const files = { "background.js": "const a=1;" };
    expect(releaseFailures({ VITE_SENTRA_API_KEY: "1" }, files)).toEqual([]);
  });

  it("admits the MIRA dev token for Chief's private build, never the API key", () => {
    const files = {
      "background.js": `const e={VITE_MIRA_DEV_TOKEN:"${TOKEN}",VITE_SENTRA_API_KEY:"${KEY}"};`,
    };
    const env = { VITE_MIRA_DEV_TOKEN: TOKEN, VITE_SENTRA_API_KEY: KEY };
    expect(releaseFailures(env, files, { allowDevToken: true })).toEqual([
      "VITE_SENTRA_API_KEY tertanam di background.js",
    ]);
  });
});
```

- [ ] **Step 2: Run it and see it fail.**
  Run: `node scripts/pnpm.mjs exec vitest run scripts/release-check.test.mjs`
  Expected: FAIL, cannot resolve `./release-check.mjs`.

- [ ] **Step 3: Implement** `scripts/release-check.mjs`:

```js
#!/usr/bin/env node
/**
 * Gate before a build leaves Chief's own machines (audit 2026-10-06): the bundle carries no static
 * credential. The production env is read the way Vite reads it; output names variables, never a
 * value. `--allow-dev-token` admits VITE_MIRA_DEV_TOKEN for Chief's private MIRA build (DECISIONS
 * 2026-10-03) until MIRA issues a per-session token.
 * Exit 0 = no credential in .output/chrome-mv3-dev.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SECRET_ENV = ["VITE_MIRA_DEV_TOKEN", "VITE_SENTRA_API_KEY"];
// Shorter values would match ordinary code; a real credential is far longer.
const MIN_SECRET_LENGTH = 8;

export function releaseFailures(env, files, { allowDevToken = false } = {}) {
  const failures = new Set();
  for (const name of SECRET_ENV) {
    if (allowDevToken && name === "VITE_MIRA_DEV_TOKEN") continue;
    const value = env[name]?.trim() ?? "";
    // The whole env object is inlined (diagnosis-v2.ts, hybrid-trajectory.ts), so a filled key
    // shows up by name even when today's env no longer has the value.
    const filledKey = new RegExp(`["']?${name}["']?\\s*:\\s*["'][^"']+["']`);
    for (const [file, content] of Object.entries(files)) {
      const hasValue = value.length >= MIN_SECRET_LENGTH && content.includes(value);
      if (hasValue || filledKey.test(content)) failures.add(`${name} tertanam di ${file}`);
    }
  }
  return [...failures];
}

async function main() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const out = join(root, ".output/chrome-mv3-dev");
  if (!existsSync(join(out, "manifest.json"))) {
    console.error("FAIL .output/chrome-mv3-dev/manifest.json tidak ada; jalankan build dulu.");
    process.exit(1);
  }
  const { loadEnv } = await import("vite");
  const env = loadEnv("production", root, ["VITE_", "SENTRA_"]);
  const files = {};
  for (const entry of readdirSync(out, { recursive: true })) {
    const file = String(entry);
    if (file.endsWith(".js")) files[file] = readFileSync(join(out, file), "utf8");
  }
  const failures = releaseFailures(env, files, {
    allowDevToken: process.argv.includes("--allow-dev-token"),
  });
  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    process.exit(1);
  }
  console.log(`Release check: no credential in ${Object.keys(files).length} bundle files.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
```

- [ ] **Step 4: Run the test.** Same command as Step 2. Expected: PASS (5 tests).

- [ ] **Step 5: Add the script** to `package.json`: `"release:check": "node scripts/release-check.mjs",` directly after the `"run:check"` line.

- [ ] **Step 6: Run it on the current build, reporting names only.**
  Run: `node scripts/pnpm.mjs run release:check; echo "exit $?"`
  Expected: exit 1 with `FAIL VITE_MIRA_DEV_TOKEN tertanam di ...` if Chief's MIRA token is set.
  That is the gate doing its job; record only the exit code and variable names in HANDOFF. Then
  run with `-- --allow-dev-token` and record that exit code too.

- [ ] **Step 7: Lint the new files.**
  Run: `node scripts/pnpm.mjs exec eslint scripts/release-check.mjs scripts/release-check.test.mjs`
  Expected: exit 0.

- [ ] **Step 8: Commit.**

```bash
git add scripts/release-check.mjs scripts/release-check.test.mjs package.json
git commit -m "feat(med-assist): release check refuses a bundle that carries a credential" -m "Audit 2026-10-06 (F2): the bundle inlines the whole env object, so VITE_MIRA_DEV_TOKEN and VITE_SENTRA_API_KEY ship in every build that has them set. release:check scans .output/chrome-mv3-dev for their values and for a filled key in the inlined env, and prints names only. --allow-dev-token admits the MIRA token for Chief's private build (DECISIONS 2026-10-03)." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: Documentation states what the code does

**Files:**
- Modify: `lib/diagnosis-engine/run-diagnosis.ts:5`, `docs/architecture.md:450-452`

- [ ] **Step 1: Fix the engine-mode line.** In `run-diagnosis.ts`, replace line 5
  `` * - `legacy` (default): the legacy engine's response, unchanged.`` with:

```ts
 * - `legacy` (default when `SENTRA_DIAGNOSIS_ENGINE` is unset in development; a production
 *   build without it is built as `mira`, `wxt.config.ts`): the legacy engine's response, unchanged.
```

- [ ] **Step 2: Recount the test files and fix the counts.**
  Run: `for d in lib components tests entrypoints utils data; do echo "$d $(find $d \( -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.test.mjs' \) | wc -l)"; done; find scripts -name '*.test.mjs' | wc -l`
  - Replace `docs/architecture.md` lines 450-452 with the counted numbers, in the existing form:
    `- **[Verified 2026-10-06]** There are N test files: ...`.
  - Drop the "961 passing" line in favour of `- **[Doc only]** Latest reported result: see .agents/HANDOFF.md.`, so the figure stops going stale.

- [ ] **Step 3: Typecheck.**
  Run: `node scripts/pnpm.mjs run typecheck; echo "exit $?"`. Expected: exit 0.

- [ ] **Step 4: Run the Part A gates, update HANDOFF and DECISIONS, then commit.**
  - Run the capsule gates in Global Constraints order, build last, then the root gates.
  - Overwrite `.agents/HANDOFF.md`:
    - Tasks 1-3 with their commits;
    - the gate results;
    - "release: run `release:check`; refuses while VITE_MIRA_DEV_TOKEN is set unless `--allow-dev-token`";
    - the Task 1 residual;
    - the Part B and Part C items still open.
  - Append a DECISIONS entry "2026-10-06 — Audit remediation, part A".

```bash
git add lib/diagnosis-engine/run-diagnosis.ts docs/architecture.md .agents/HANDOFF.md .agents/DECISIONS.md
git commit -m "docs(med-assist): engine default and test counts match the code; audit part A handoff" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Part B: R3, each task after Chief's "jalankan"

### Task 4: qSOFA thresholds on both sides of the line

**Files:** Test: `lib/iskandar-diagnosis-engine/red-flags.test.ts` (append). No code change.

- [ ] **Step 1: Append the test:**

```ts
// qSOFA (Singer 2016): each criterion on both sides of its line. One other criterion is held met,
// so the criterion under test decides whether the flag appears.
describe('checkSepsis qSOFA boundaries', () => {
  it.each([
    ['RR 22 counts', { respiratory_rate: 22, gcs: 14 }, true],
    ['RR 21 does not', { respiratory_rate: 21, gcs: 14 }, false],
    ['systolic 100 counts', { systolic: 100, gcs: 14 }, true],
    ['systolic 101 does not', { systolic: 101, gcs: 14 }, false],
    ['GCS 14 counts', { gcs: 14, respiratory_rate: 22 }, true],
    ['GCS 15 does not', { gcs: 15, respiratory_rate: 22 }, false],
  ])('%s', (_label, vitals, flagged) => {
    expect(checkSepsis(vitals) !== null).toBe(flagged);
  });
});
```

- [ ] **Step 2: Run it.** `node scripts/pnpm.mjs exec vitest run lib/iskandar-diagnosis-engine/red-flags.test.ts`. Expected: PASS (the code matches Singer 2016).
- [ ] **Step 3: Show that the test bites.**
  - Temporarily change `>= 22` to `> 22` at `red-flags.ts:107` and run again. Expected: FAIL on "RR 22 counts".
  - Undo the change. `git diff --stat lib/iskandar-diagnosis-engine/red-flags.ts` must print nothing.
- [ ] **Step 4: Commit** `red-flags.test.ts` with the body "Audit 2026-10-06 (F4); mutation `>= 22` → `> 22` turned it red."

### Task 5: NEWS2 band edges against RCP 2017

**Files:** Test: `lib/iskandar-diagnosis-engine/clinical-trajectory-intelligence.news2.test.ts`
(append). No code change in this task.

- [ ] **Step 1: Append the test:**

```ts
type Vitals = Omit<SymphonyVitalsInput, 'observedAt'>;
const scoreOf = (vitals: Vitals, parameter: string, hasCOPD = false) =>
  calculateClinicalNEWS2({ observedAt, ...vitals }, hasCOPD).parameterScores.find(
    (p) => p.parameter === parameter
  )?.score;

// RCP NEWS2 (2017) chart 1, each band edge on both sides.
describe('calculateClinicalNEWS2 band edges', () => {
  it.each([[8, 3], [9, 1], [11, 1], [12, 0], [20, 0], [21, 2], [24, 2], [25, 3]])(
    'respiration rate %d scores %d',
    (respiratoryRate, score) => expect(scoreOf({ respiratoryRate }, 'respiratory_rate')).toBe(score)
  );
  it.each([[91, 3], [92, 2], [93, 2], [94, 1], [95, 1], [96, 0]])(
    'SpO2 Scale 1 %d scores %d',
    (spo2, score) => expect(scoreOf({ spo2 }, 'spo2')).toBe(score)
  );
  it.each([[90, 3], [91, 2], [100, 2], [101, 1], [110, 1], [111, 0], [219, 0], [220, 3]])(
    'systolic %d scores %d',
    (systolicBp, score) => expect(scoreOf({ systolicBp }, 'systolic')).toBe(score)
  );
  it.each([[40, 3], [41, 1], [50, 1], [51, 0], [90, 0], [91, 1], [110, 1], [111, 2], [130, 2], [131, 3]])(
    'pulse %d scores %d',
    (heartRate, score) => expect(scoreOf({ heartRate }, 'heart_rate')).toBe(score)
  );
  it.each([[35, 3], [35.1, 1], [36, 1], [36.1, 0], [38, 0], [38.1, 1], [39, 1], [39.1, 2]])(
    'temperature %d scores %d',
    (temperatureC, score) => expect(scoreOf({ temperatureC }, 'temperature')).toBe(score)
  );
  // Scale 2 (hypercapnic respiratory failure): the 93-96 and >=97 bands score only on oxygen.
  it.each([
    [83, false, 3], [84, false, 2], [86, false, 1], [88, false, 0], [92, false, 0],
    [93, false, 0], [95, false, 0], [97, false, 0],
    [93, true, 1], [94, true, 1], [95, true, 2], [96, true, 2], [97, true, 3],
  ])('SpO2 Scale 2 %d (on oxygen: %s) scores %d', (spo2, supplementalO2, score) =>
    expect(scoreOf({ spo2, supplementalO2 }, 'spo2_scale2', true)).toBe(score)
  );
});
```

  Add `import type { SymphonyVitalsInput } from './symphony-trajectory-core';` to the imports.

- [ ] **Step 2: Run it.** `node scripts/pnpm.mjs exec vitest run lib/iskandar-diagnosis-engine/clinical-trajectory-intelligence.news2.test.ts`
  Expected:
  - every chart-1 edge PASS;
  - Scale 2 on air FAIL for SpO2 93, 95 and 97 (the code scores 1, 2 and 3; RCP scores 0).
- [ ] **Step 3: Stop and report** the red rows to Chief with the RCP reference.
  - The fix is one line: pass `vitals.supplementalO2` to `scoreSpo2Scale2` and score the 93-96
    and ≥97 bands only when it is `true`.
  - It is made only on Chief's "jalankan".
  - Until then, commit nothing from this task: a red test cannot enter the suite.
- [ ] **Step 4 (after Chief's go): fix, run green, commit** the test and
  `clinical-trajectory-intelligence.ts` together. Body: "Audit 2026-10-06 (F5); Scale 2 air bands red before the fix."

### Task 6: KB completeness ratchet

**Files:**
- Create: `lib/iskandar-diagnosis-engine/penyakit-kb.gaps.json`
- Modify: `lib/iskandar-diagnosis-engine/penyakit-kb.contract.test.ts` (type at lines 6-12, new describe at end)

- [ ] **Step 1: Write the failing test.**
  - In `PenyakitRecord`, add `diagnosis_banding?: unknown;` and `structured_criteria?: unknown;`.
  - Append:

```ts
// AGENTS.md domain rules: every rule needs differential exclusions and input criteria. Today's
// gaps are listed in penyakit-kb.gaps.json and the list may only shrink (audit 2026-10-06): a
// new entry without them fails, and a filled gap must leave the list.
describe('penyakit.json completeness ratchet', () => {
  const gaps = JSON.parse(
    readFileSync(path.resolve(process.cwd(), 'lib/iskandar-diagnosis-engine/penyakit-kb.gaps.json'), 'utf8')
  ) as Record<'diagnosis_banding' | 'structured_criteria', string[]>;
  const filled = (value: unknown): boolean =>
    Array.isArray(value)
      ? value.length > 0
      : typeof value === 'object' && value !== null && Object.keys(value).length > 0;

  it.each(['diagnosis_banding', 'structured_criteria'] as const)(
    'lists exactly the entries without %s',
    (field) => {
      const open = (loadKb().penyakit ?? [])
        .filter((item) => !filled(item[field]))
        .map((item) => item.id)
        .sort();
      expect(open).toEqual([...gaps[field]].sort());
    }
  );
});
```

- [ ] **Step 2: Run it and see it fail.**
  Run: `node scripts/pnpm.mjs exec vitest run lib/iskandar-diagnosis-engine/penyakit-kb.contract.test.ts`
  Expected: FAIL, ENOENT for `penyakit-kb.gaps.json`.
- [ ] **Step 3: Generate the baseline from the KB:**

```bash
node -e "const l=require('./public/data/penyakit.json').penyakit;const f=(v)=>Array.isArray(v)?v.length>0:typeof v==='object'&&v!==null&&Object.keys(v).length>0;const g=(k)=>l.filter(d=>!f(d[k])).map(d=>d.id).sort();require('fs').writeFileSync('lib/iskandar-diagnosis-engine/penyakit-kb.gaps.json',JSON.stringify({diagnosis_banding:g('diagnosis_banding'),structured_criteria:g('structured_criteria')},null,2)+'\n')"
```

  Expected: 75 ids under `diagnosis_banding` and 107 under `structured_criteria`.
- [ ] **Step 4: Run again.** Expected: PASS.
- [ ] **Step 5: Show that it bites.**
  - Delete one id from the gaps file and run. Expected: FAIL.
  - Restore the id. `git diff --stat` on the gaps file must match the Step 3 output.
- [ ] **Step 6: Commit** both files. Body: "Audit 2026-10-06 (F6); baseline 75 / 107 gaps; no confidence tier exists in the KB (C4)."

### Task 7: Audit log only after anonymisation passed

**Files:**
- Modify: `lib/iskandar-diagnosis-engine/engine.ts:251-266`
- Create: `lib/iskandar-diagnosis-engine/engine.audit-order.test.ts`

- [ ] **Step 1: Write the failing test:**

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('./anonymizer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./anonymizer')>()),
  validateAnonymization: () => ({ valid: false, violations: ['NIK'] }),
}));
vi.mock('./audit-logger', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./audit-logger')>()),
  logDiagnosisRequest: vi.fn().mockResolvedValue(undefined),
}));

import { logDiagnosisRequest } from './audit-logger';
import { DEFAULT_ENGINE_CONFIG, runDiagnosisEngine } from './engine';

import { createEmptyEncounter } from '~/utils/storage';

// A context that failed anonymisation may hold PII; it must not reach the audit store.
describe('runDiagnosisEngine audit order', () => {
  it('writes no audit entry for a context that failed anonymisation', async () => {
    const encounter = createEmptyEncounter('83206', 'PATIENT_TBD');
    await expect(
      runDiagnosisEngine(encounter, { ...DEFAULT_ENGINE_CONFIG, enableAudit: true })
    ).rejects.toThrow('PII leak detected');
    expect(logDiagnosisRequest).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it and see it fail.**
  Run: `node scripts/pnpm.mjs exec vitest run lib/iskandar-diagnosis-engine/engine.audit-order.test.ts`
  Expected: FAIL, `logDiagnosisRequest` was called once.
- [ ] **Step 3: Move the block.** In `engine.ts`, move the whole `if (config.enableAudit) { logDiagnosisRequest(...) }` block (lines 251-257) below the validation `if (!anonValidation.valid) { ... throw ... }` block (ending line 266). No other change.
- [ ] **Step 4: Run it again, then the engine folder.**
  Run: `node scripts/pnpm.mjs exec vitest run lib/iskandar-diagnosis-engine`. Expected: PASS.
- [ ] **Step 5: Commit** both files. Body: "Audit 2026-10-06 (F7); red before the move."

Part B close: run the full gates, overwrite HANDOFF, append DECISIONS "2026-10-06 — Audit
remediation, part B", commit them with explicit paths.

---

## Part C: decisions for Chief (each becomes its own plan)

| # | Question | Options | Recommendation |
|---|---|---|---|
| C1 | Engine authority (F8). MIRA is the only differential in production (DECISIONS 2026-10-04); README, contract and AGENTS say KB first. | a) Keep MIRA: rewrite the four texts to "MIRA proposes the differential; the KB safety layer, red flags and triage stay deterministic and always run; on MIRA failure the KB differential returns". b) Production back to `legacy`/`shadow`. | a). It matches Chief's decision and `run-diagnosis.ts:9-19`. |
| C2 | Static credentials (F2) | Per-session token through the native host (MIRA repo, T-10), and the Sentra API key through MedBoard sign-in. | Keep Task 2 as the brake until then. |
| C3 | PHI at rest (F9) | a) Encounter to `storage.session`: `utils/storage.ts:39,78,128` plus one line in protected `main.tsx:207`. b) Also drop the auth `local` copy, so sign-in is lost when Chrome closes. | a) now, b) only if a signed-out restart is acceptable. |
| C4 | KB confidence tier (F6): no entry has one, although AGENTS.md requires it | Add a tier field, or reword the rule | Chief's clinical call. |
| C5 | CI (F10) | a) Root `.github/workflows` job with a path filter (R2 control plane). b) In the published `drferdi/AsistenMedis` repo. | b). The capsule is standalone; first check whether that repo already has CI. |
| C6 | Trajectory from one visit (F11) | Change the UI to show from one visit, or the rule to two | Chief's call. |
| C7 | Dependencies (F12) | Remove `apexcharts`, `react-apexcharts`, `@pieces.app/pieces-os-client`; move `tesseract.js` to devDependencies; drop the dead `overrides` | Yes: one lockfile change, all gates. |
| C8 | `calculateDosage` (F13), R3 | Delete it, or wire it in with paediatric and max-dose tests | Delete (unused since at least the audit). |
| C9 | Task 1 residual | Re-read the RM on the target page before `execFill` | After Task 1, if Chief sees two-tab use at Balowerti. |
| C10 | Three version numbers (1.0.1 / 2.1.0 / Prototype 0.7) | Name one | Chief's call. |

## Not doing, with the reason

- `format:check` in `quality`: 140 files are unformatted today, including protected and R3 files;
  making it a gate means reformatting frozen code.
- ESLint `--ext`: ESLint 9.39.5 accepts it with flat config (since 9.21), so it is not dead.
- Removing the localhost host permissions: MIRA runs at `127.0.0.1:8787` and needs them.
- MIRA supervisor `.catch(() => undefined)`: these are start-up nudges; a failed diagnosis already
  reaches the panel through `engine_notice`.
- `describe.skip` in `zone-classification-audit.test.ts:242`: deferred on purpose; it stays until
  Chief takes the triage-zone work.
- Splitting `background.ts`: only after CI exists (C5).
- MAIN-world message allowlist: low risk (needs a compromised ePuskesmas page); later.
