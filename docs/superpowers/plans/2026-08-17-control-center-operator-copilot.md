# Control Center Operator Copilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Control Center Copilot that answers readiness questions through the existing allowlisted executor, with an explicit Local / OpenAI switch and no silent fallback.

**Architecture:** Keep `runCommand(id)` as the only execution path. AI SDK 6 `ToolLoopAgent` is an adapter over that allowlist. Local uses Ollama's OpenAI-compatible endpoint. OpenAI uses `@ai-sdk/openai` only when Chief selects it and `OPENAI_API_KEY` is present. Mutating tools pause for `toolApproval` and still require the existing confirm phrase.

**Tech Stack:** Next.js 16 App Router (Control Center), AI SDK 6.0.240, `@ai-sdk/react` 3.0.240, `@ai-sdk/openai` 2.0.80, `@ai-sdk/openai-compatible` 1.0.30, Zod 4, node:test, Ollama at `127.0.0.1:11434`, OpenAI Chat Completions.

**Spec:** `docs/superpowers/specs/2026-08-17-control-center-operator-copilot-design.md`

## Global Constraints

- Address the user as Chief in chat diagnostics. Repository files, identifiers, and commit messages stay in English.
- User-facing Control Center copy stays Indonesian.
- Risk is **R2**. Do not execute R3. Do not print, log, or stream `.env` values.
- Isolated worktree only: `../Monorepo.worktrees/feat-operator-copilot` on branch `feat/operator-copilot`. Never create a worktree inside the repo root.
- Smallest viable change. No drive-by refactors. No Golden Path chat. No Corpus Engine. No Vercel AI Gateway requirement.
- Never `git add -A`. Stage explicit paths only.
- Line endings: CRLF on Windows-edited files. PowerShell for local commands.
- Control Center must not import `@safrs/env/server`.
- Design tokens only. No raw colour or radius values.
- Evidence before assertions. CI must not call a live model or a real API key.
- Pin only these AI packages, already older than `minimumReleaseAge` 1440 minutes as of 2026-08-17: `ai@6.0.240`, `@ai-sdk/react@3.0.240`, `@ai-sdk/openai@2.0.80`, `@ai-sdk/openai-compatible@1.0.30`.
- After install, verify AI SDK 6 exports against `node_modules/ai/docs` and `node_modules/ai/src`. If `createAgentUIStreamResponse` is missing, use `createAgentUIStream` and wrap a `Response`. Do not invent APIs from memory.

## File map

| File | Responsibility |
| --- | --- |
| `pnpm-workspace.yaml` | Catalog pins for the four AI packages |
| `projects/control-center/apps/web/package.json` | Add AI dependencies |
| `projects/control-center/capabilities.json` | Record capability `ai` |
| `.env.example` | Empty `OPENAI_API_KEY` and local model placeholders |
| `projects/control-center/apps/web/src/lib/exec/commands.ts` | Add `--json` to `doctor` and `task-list` |
| `projects/control-center/apps/web/src/lib/copilot/types.ts` | Shared provider, request, and answer types |
| `projects/control-center/apps/web/src/lib/copilot/provider.ts` | Resolve Local/OpenAI or typed refusal |
| `projects/control-center/apps/web/src/lib/copilot/redact.ts` | Strip secret-shaped strings from outbound text |
| `projects/control-center/apps/web/src/lib/copilot/tools.ts` | Allowlisted tools over `runCommand` |
| `projects/control-center/apps/web/src/lib/copilot/agent.ts` | ToolLoopAgent, instructions, output schema |
| `projects/control-center/apps/web/src/app/api/copilot/route.ts` | POST chat handler |
| `projects/control-center/apps/web/src/app/api/copilot/status/route.ts` | GET availability, presence only |
| `projects/control-center/apps/web/src/app/copilot-panel.tsx` | Chat, switch, approval UI |
| `projects/control-center/apps/web/src/lib/control-center.ts` | Add `copilot` nav item |
| `projects/control-center/apps/web/src/app/control-center.tsx` | Render Copilot section |
| `projects/control-center/apps/web/src/lib/repo/catalog.ts` | Evidence-backed Copilot feature |
| `.agents/HANDOFF.md` | Current state after the work |

---

### Task 1: Isolated worktree, pins, capability record

**Files:**
- Create worktree: `../Monorepo.worktrees/feat-operator-copilot`
- Modify: `pnpm-workspace.yaml`
- Modify: `projects/control-center/apps/web/package.json`
- Modify: `projects/control-center/capabilities.json`
- Modify: `.env.example`
- Test: `projects/control-center/apps/web/src/lib/copilot/pins.test.ts`

**Interfaces:**
- Consumes: current `main` at the worktree base commit
- Produces: catalog pins `ai` `6.0.240`, `@ai-sdk/react` `3.0.240`, `@ai-sdk/openai` `2.0.80`, `@ai-sdk/openai-compatible` `1.0.30`; Control Center depends on those catalog entries; `capabilities.json` contains `{ "id": "ai", "risk": "R2" }`

- [ ] **Step 1: Create the worktree**

```powershell
git -C D:\DEV\Monorepo worktree add D:\DEV\Monorepo.worktrees\feat-operator-copilot -b feat/operator-copilot
Set-Location D:\DEV\Monorepo.worktrees\feat-operator-copilot
```

Expected: new branch from current `main`, clean worktree, no files inside `D:\DEV\Monorepo\.worktrees`.

- [ ] **Step 2: Write the failing pin test**

Create `projects/control-center/apps/web/src/lib/copilot/pins.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("workspace catalog pins the approved AI SDK 6 set", async () => {
  const workspace = await readFile("../../../../../pnpm-workspace.yaml", "utf8");
  assert.match(workspace, /"ai": 6\.0\.240/);
  assert.match(workspace, /"@ai-sdk\/react": 3\.0\.240/);
  assert.match(workspace, /"@ai-sdk\/openai": 2\.0\.80/);
  assert.match(workspace, /"@ai-sdk\/openai-compatible": 1\.0\.30/);
});
```

Resolve the relative path from the test file to the worktree root before running if the depth is wrong. Prefer reading via `repoRoot()` once Task 3 exists; for this task, compute the path from `import.meta.dirname` up to the worktree `pnpm-workspace.yaml`.

- [ ] **Step 3: Run the test to verify it fails**

```powershell
pnpm --filter @sentra/control-center test
```

Expected: FAIL because the catalog pins are absent.

- [ ] **Step 4: Add catalog pins and package dependencies**

In `pnpm-workspace.yaml` catalog, add:

```yaml
ai: 6.0.240
"@ai-sdk/react": 3.0.240
"@ai-sdk/openai": 2.0.80
"@ai-sdk/openai-compatible": 1.0.30
```

In `projects/control-center/apps/web/package.json` dependencies add:

```json
"ai": "catalog:"
"@ai-sdk/react": "catalog:"
"@ai-sdk/openai": "catalog:"
"@ai-sdk/openai-compatible": "catalog:"
```

Do not add these to Golden Path.

- [ ] **Step 5: Record the capability and env placeholders**

```powershell
node tools/capabilities/src/cli.mjs --apply --capability ai --project control-center --confirm "ENABLE ai FOR control-center"
```

Append to `.env.example` (empty values only):

```
# Capability: ai (tools/capabilities/manifests/ai.json)
OPENAI_API_KEY=
SAFRS_OPENAI_MODEL=gpt-4.1-mini
SAFRS_LOCAL_MODEL=llama3.1:8b
SAFRS_OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
```

Never copy values from `.env`.

- [ ] **Step 6: Install and verify the pin test**

```powershell
pnpm install
pnpm --filter @sentra/control-center test
```

Expected: pin test PASS. Then confirm the installed `ai` package docs exist:

```powershell
Test-Path node_modules/ai/docs
```

- [ ] **Step 7: Commit**

```powershell
git add pnpm-workspace.yaml pnpm-lock.yaml projects/control-center/apps/web/package.json projects/control-center/capabilities.json .env.example projects/control-center/apps/web/src/lib/copilot/pins.test.ts
git commit -m "feat(control-center): pin AI SDK 6 and record the ai capability"
```

---

### Task 2: Make doctor and task-list machine-readable

**Files:**
- Modify: `projects/control-center/apps/web/src/lib/exec/commands.ts`
- Test: `projects/control-center/apps/web/src/lib/exec/commands.test.ts`

**Interfaces:**
- Consumes: `RUNNABLE_COMMANDS`
- Produces: `runnableById("doctor").args` includes `--json`; `runnableById("task-list").args` includes `--json`; `status` already includes `--json` and stays unchanged

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { runnableById } from "./commands.ts";

test("read tools used by Copilot request JSON output", () => {
  assert.deepEqual(runnableById("doctor")?.args, [
    "tools/doctor/src/cli.mjs",
    "--json",
  ]);
  assert.deepEqual(runnableById("status")?.args, [
    "tools/status/src/cli.mjs",
    "--json",
  ]);
  assert.deepEqual(runnableById("task-list")?.args, [
    "tools/task/src/cli.mjs",
    "list",
    "--json",
  ]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
pnpm --filter @sentra/control-center exec node --test src/lib/exec/commands.test.ts
```

Expected: FAIL on missing `--json`.

- [ ] **Step 3: Add `--json` to the two allowlist entries**

In `commands.ts`, change only those two `args` arrays:

```ts
args: ["tools/doctor/src/cli.mjs", "--json"],
```

```ts
args: ["tools/task/src/cli.mjs", "list", "--json"],
```

Do not change labels, confirm phrases, or mutating commands.

- [ ] **Step 4: Run the test to verify it passes**

```powershell
pnpm --filter @sentra/control-center test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add projects/control-center/apps/web/src/lib/exec/commands.ts projects/control-center/apps/web/src/lib/exec/commands.test.ts
git commit -m "fix(control-center): request JSON from doctor and task-list"
```

---

### Task 3: Provider resolver with no silent fallback

**Files:**
- Create: `projects/control-center/apps/web/src/lib/copilot/types.ts`
- Create: `projects/control-center/apps/web/src/lib/copilot/provider.ts`
- Create: `projects/control-center/apps/web/src/lib/copilot/redact.ts`
- Test: `projects/control-center/apps/web/src/lib/copilot/provider.test.ts`
- Test: `projects/control-center/apps/web/src/lib/copilot/redact.test.ts`

**Interfaces:**
- Consumes: `process.env.OPENAI_API_KEY`, `SAFRS_LOCAL_MODEL`, `SAFRS_OPENAI_MODEL`, `SAFRS_OLLAMA_BASE_URL`, and an injected `fetch`
- Produces:
  - `export type CopilotProviderId = "local" | "openai"`
  - `export type ProviderRefusal = { ok: false; provider: CopilotProviderId; code: "local-unreachable" | "local-model-missing" | "openai-key-missing" | "unknown-provider"; message: string }`
  - `export type ProviderReady = { ok: true; provider: CopilotProviderId; modelId: string }`
  - `export async function inspectProviders(env?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch): Promise<{ local: { ready: boolean; modelId: string; reason: string | null }; openai: { ready: boolean; reason: string | null } }>`
  - `export async function resolveProvider(selection: CopilotProviderId, env?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch): Promise<ProviderReady | ProviderRefusal>`
  - `export function redactSecrets(text: string): string`

- [ ] **Step 1: Write failing tests**

`redact.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { redactSecrets } from "./redact.ts";

test("redactSecrets strips sk- and Bearer values", () => {
  const input = "Bearer sk-abc123 and OPENAI_API_KEY=sk-live-secret";
  const output = redactSecrets(input);
  assert.equal(output.includes("sk-abc123"), false);
  assert.equal(output.includes("sk-live-secret"), false);
  assert.match(output, /\[redacted\]/);
});
```

`provider.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveProvider } from "./provider.ts";

test("local does not fall back to OpenAI when Ollama is down", async () => {
  const result = await resolveProvider("local", {}, async () => {
    throw new Error("ECONNREFUSED");
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.provider, "local");
    assert.equal(result.code, "local-unreachable");
    assert.match(result.message, /tidak ada panggilan OpenAI/i);
  }
});

test("openai is refused when the key is absent", async () => {
  const result = await resolveProvider("openai", { OPENAI_API_KEY: "" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "openai-key-missing");
  }
});

test("openai is ready when a non-empty key exists", async () => {
  const result = await resolveProvider("openai", { OPENAI_API_KEY: "sk-test" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.provider, "openai");
    assert.equal(result.modelId, "gpt-4.1-mini");
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
pnpm --filter @sentra/control-center exec node --test src/lib/copilot/provider.test.ts src/lib/copilot/redact.test.ts
```

Expected: FAIL, modules missing.

- [ ] **Step 3: Implement types, redaction, and resolver**

`types.ts` exports `CopilotProviderId`, `ProviderReady`, `ProviderRefusal`.

`redact.ts` replaces `sk-[A-Za-z0-9_-]+`, `Bearer\s+\S+`, and `OPENAI_API_KEY=\S+` with `[redacted]`.

`provider.ts` rules:

- Default local model `llama3.1:8b`, default OpenAI model `gpt-4.1-mini`, default Ollama tags URL derived from `SAFRS_OLLAMA_BASE_URL` by replacing a trailing `/v1` with `/api/tags`.
- `inspectProviders` never returns the key or its length.
- `resolveProvider("local")` fetches tags. On network error return `local-unreachable`. If the model id is not in `models[].name` / `models[].model`, return `local-model-missing`.
- `resolveProvider("openai")` checks only whether `OPENAI_API_KEY` is a non-empty string. It must not construct an OpenAI client in this function.
- Indonesian messages from the spec error table.

- [ ] **Step 4: Run tests to verify they pass**

```powershell
pnpm --filter @sentra/control-center test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add projects/control-center/apps/web/src/lib/copilot/types.ts projects/control-center/apps/web/src/lib/copilot/provider.ts projects/control-center/apps/web/src/lib/copilot/provider.test.ts projects/control-center/apps/web/src/lib/copilot/redact.ts projects/control-center/apps/web/src/lib/copilot/redact.test.ts
git commit -m "feat(control-center): resolve local and openai providers without fallback"
```

---


### Task 4: Allowlisted Copilot tools

**Files:**
- Create: `projects/control-center/apps/web/src/lib/copilot/tools.ts`
- Test: `projects/control-center/apps/web/src/lib/copilot/tools.test.ts`

**Interfaces:**
- Consumes: `runCommand(id: string, confirmation?: string)` and `runnableById`
- Produces:
  - `export const COPILOT_READ_TOOL_IDS = ["doctor", "status", "task-list", "saf-gate-all"] as const`
  - `export const COPILOT_MUTATING_TOOL_IDS = ["setup", "db-start", "db-stop", "db-generate", "db-migrate", "db-seed"] as const`
  - `export function createCopilotTools(run: typeof runCommand)`
  - Each tool `execute` calls `run(id)` for read tools, or `run(id, confirmation)` for mutating tools
  - `toModelOutput` returns truncated JSON, max 4000 characters, after `redactSecrets`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { createCopilotTools } from "./tools.ts";

test("read tools call runCommand with the allowlisted id only", async () => {
  const calls: Array<{ id: string; confirmation?: string }> = [];
  const tools = createCopilotTools(async (id, confirmation) => {
    calls.push({ id, confirmation });
    return {
      ok: true,
      summary: "Selesai tanpa kesalahan.",
      exitCode: 0,
      stdout: JSON.stringify({ ok: true }),
      stderr: "",
      durationMs: 1,
      refused: null,
    };
  });

  const doctor = tools.doctor;
  assert.ok(doctor.execute);
  await doctor.execute!({}, {} as never);
  assert.deepEqual(calls, [{ id: "doctor", confirmation: undefined }]);
});

test("mutating tools require a confirmation phrase and never accept a shell string", async () => {
  const calls: Array<{ id: string; confirmation?: string }> = [];
  const tools = createCopilotTools(async (id, confirmation) => {
    calls.push({ id, confirmation });
    return {
      ok: false,
      summary: "Frasa konfirmasi tidak cocok.",
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: 0,
      refused: "confirmation-mismatch",
    };
  });

  assert.ok(tools["db-start"].execute);
  await tools["db-start"].execute!(
    { confirmation: "NYALAKAN BASIS DATA LOKAL" },
    {} as never,
  );
  assert.deepEqual(calls, [
    { id: "db-start", confirmation: "NYALAKAN BASIS DATA LOKAL" },
  ]);
  assert.equal("shell" in tools, false);
  assert.equal("dev" in tools, false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
pnpm --filter @sentra/control-center exec node --test src/lib/copilot/tools.test.ts
```

Expected: FAIL, module missing.

- [ ] **Step 3: Implement the tools**

Use `tool` from `ai` and Zod 4. Read tools have empty or no input. Mutating tools accept `{ confirmation: z.string() }`. Descriptions are Indonesian and name the exact allowlisted id. After implement, check `node_modules/ai/docs` if `toModelOutput` signature differs and adapt without changing policy.

- [ ] **Step 4: Run tests**

```powershell
pnpm --filter @sentra/control-center test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add projects/control-center/apps/web/src/lib/copilot/tools.ts projects/control-center/apps/web/src/lib/copilot/tools.test.ts
git commit -m "feat(control-center): wrap allowlisted commands as Copilot tools"
```

---

### Task 5: ToolLoopAgent and structured output

**Files:**
- Create: `projects/control-center/apps/web/src/lib/copilot/agent.ts`
- Test: `projects/control-center/apps/web/src/lib/copilot/agent.test.ts`

**Interfaces:**
- Consumes: `createCopilotTools`, `CopilotProviderId`
- Produces:
  - `export const copilotOutputSchema` with `ready: z.boolean().nullable()`, `summary: z.string()`, `evidence: z.array(z.string())`, `nextStep: z.string()`, `provider: z.enum(["local", "openai"])`
  - `export function createOperatorCopilot(args: { model: unknown; provider: CopilotProviderId; run: typeof runCommand })`
  - Agent instructions: Indonesian answers, never invent readiness, never request a command outside the allowlist, never mention or ask for secret values

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { copilotOutputSchema } from "./agent.ts";

test("structured output rejects an invented green status without evidence", () => {
  const parsed = copilotOutputSchema.safeParse({
    ready: true,
    summary: "Semua siap",
    evidence: [],
    nextStep: "Tidak ada",
    provider: "local",
  });
  assert.equal(parsed.success, true);
});

test("structured output rejects unknown provider values", () => {
  const parsed = copilotOutputSchema.safeParse({
    ready: false,
    summary: "Gagal",
    evidence: ["doctor"],
    nextStep: "Periksa Docker",
    provider: "gateway",
  });
  assert.equal(parsed.success, false);
});
```

Also assert `createOperatorCopilot` returns an object with `generate` or the current ToolLoopAgent method after reading `node_modules/ai/docs`.

- [ ] **Step 2: Run the test to verify it fails**

```powershell
pnpm --filter @sentra/control-center exec node --test src/lib/copilot/agent.test.ts
```

Expected: FAIL, module missing.

- [ ] **Step 3: Implement the agent**

Follow current AI SDK 6 docs in `node_modules/ai/docs`. Use `ToolLoopAgent` with `toolApproval` that returns `"user-approval"` for ids in `COPILOT_MUTATING_TOOL_IDS` and `undefined` for read tools. Prefer `Output.object({ schema: copilotOutputSchema })` if that export exists in 6.0.240; otherwise keep the schema and parse the final object in the route. `stopWhen` should be a low step count, `stepCountIs(8)` or the 6.0.240 equivalent.

Instructions must include: answer in Indonesian; use tools before claiming readiness; if a tool fails, `ready` is false or null; never run `dev`, `check`, or a shell.

- [ ] **Step 4: Run tests**

```powershell
pnpm --filter @sentra/control-center test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add projects/control-center/apps/web/src/lib/copilot/agent.ts projects/control-center/apps/web/src/lib/copilot/agent.test.ts
git commit -m "feat(control-center): add Copilot agent with structured readiness output"
```

---


### Task 6: Local API routes

**Files:**
- Create: `projects/control-center/apps/web/src/app/api/copilot/route.ts`
- Create: `projects/control-center/apps/web/src/app/api/copilot/status/route.ts`
- Test: `projects/control-center/apps/web/src/lib/copilot/route-policy.test.ts`

**Interfaces:**
- Consumes: `inspectProviders`, `resolveProvider`, `createOperatorCopilot`, `runCommand`
- Produces:
  - `GET /api/copilot/status` -> `{ local: { ready: boolean; reason: string | null }; openai: { ready: boolean; reason: string | null }; defaultProvider: "local" }`
  - `POST /api/copilot` body `{ provider: CopilotProviderId; messages: unknown[] }` -> UI message stream or JSON refusal
  - Refusal JSON never includes env values

- [ ] **Step 1: Write the failing policy test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveProvider } from "./provider.ts";

test("a local refusal must not mention constructing openai", async () => {
  const result = await resolveProvider("local", { OPENAI_API_KEY: "sk-should-not-leak" }, async () => {
    throw new Error("down");
  });
  assert.equal(result.ok, false);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("sk-should-not-leak"), false);
});
```

- [ ] **Step 2: Run it**

```powershell
pnpm --filter @sentra/control-center exec node --test src/lib/copilot/route-policy.test.ts
```

Expected: PASS if Task 3 redaction/refusal is correct. Keep the test as a regression gate for the route.

- [ ] **Step 3: Implement GET status**

`status/route.ts` calls `inspectProviders()` and returns JSON. Bind to `127.0.0.1` behaviour already provided by `next dev -H 127.0.0.1`. Do not import `@safrs/env/server`.

- [ ] **Step 4: Implement POST chat**

Validate `provider` with Zod. Call `resolveProvider`. On refusal, return HTTP 409 with `{ ok: false, code, message, provider }`. On success, construct only the selected model:

```ts
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// local
const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: process.env.SAFRS_OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1",
  apiKey: "ollama",
});
const model = ollama.chatModel(resolved.modelId);

// openai
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = openai.chat(resolved.modelId);
```

Then `createOperatorCopilot({ model, provider, run: runCommand })`. Stream with the current AI SDK 6 helper from `node_modules/ai`. If the helper name in 6.0.240 is `createAgentUIStreamResponse`, use it. If not, wrap `createAgentUIStream`.

- [ ] **Step 5: Typecheck the new routes**

```powershell
pnpm --filter @sentra/control-center typecheck
pnpm --filter @sentra/control-center test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add projects/control-center/apps/web/src/app/api/copilot/route.ts projects/control-center/apps/web/src/app/api/copilot/status/route.ts projects/control-center/apps/web/src/lib/copilot/route-policy.test.ts
git commit -m "feat(control-center): add local Copilot API routes"
```

---

### Task 7: Copilot panel and navigation

**Files:**
- Create: `projects/control-center/apps/web/src/app/copilot-panel.tsx`
- Modify: `projects/control-center/apps/web/src/lib/control-center.ts`
- Modify: `projects/control-center/apps/web/src/app/control-center.tsx`
- Modify: `projects/control-center/apps/web/src/app/control-center.css` only if a layout class already used nearby must be reused; do not invent colours
- Test: `projects/control-center/apps/web/src/lib/copilot/nav.test.ts`

**Interfaces:**
- Consumes: `NAV`, `NavId`, `/api/copilot`, `/api/copilot/status`
- Produces: nav id `copilot` with `seq: "09"`, `label: "Copilot"`, `hint: "Tanya kesiapan mesin dengan Lokal atau OpenAI"`

- [ ] **Step 1: Write the failing nav test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { NAV } from "../control-center.ts";

test("Control Center exposes a Copilot section after Knowledge", () => {
  const ids = NAV.map((item) => item.id);
  assert.equal(ids.at(-1), "copilot");
  const copilot = NAV.find((item) => item.id === "copilot");
  assert.equal(copilot?.seq, "09");
  assert.equal(copilot?.label, "Copilot");
});
```

- [ ] **Step 2: Run it to verify it fails**

```powershell
pnpm --filter @sentra/control-center exec node --test src/lib/copilot/nav.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add the nav id and render the panel**

Extend `NavId` with `| "copilot"`. Append the NAV item after Knowledge. In `control-center.tsx` add:

```tsx
{section === "copilot" ? <CopilotPanel /> : null}
```

`CopilotPanel` is a client component that:

1. Loads `/api/copilot/status` on mount.
2. Defaults provider to `local`.
3. Disables the OpenAI option when `openai.ready` is false, with Indonesian reason text.
4. Disables send when the selected provider is not ready.
5. Uses `useChat` from `@ai-sdk/react` against `/api/copilot`, sending `{ provider }` in the request body.
6. Renders tool parts as existing `.panel` / `.status` cards.
7. When a mutating tool is in `approval-requested` / `tool-approval-request`, show effect text from `runnableById`, a phrase field, and Setuju / Tolak. Approval must send the exact `confirmPhrase` through the existing tool input, not a new executor.
8. Renders the final structured card: siap / tidak, ringkasan, bukti, langkah berikutnya, provider.

Read `@ai-sdk/react` 3.0.240 docs in `node_modules` before writing `useChat`. If the hook API differs from memory, follow the installed docs.

- [ ] **Step 4: Run tests and lint**

```powershell
pnpm --filter @sentra/control-center test
pnpm --filter @sentra/control-center typecheck
pnpm --filter @sentra/control-center lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add projects/control-center/apps/web/src/app/copilot-panel.tsx projects/control-center/apps/web/src/lib/control-center.ts projects/control-center/apps/web/src/app/control-center.tsx projects/control-center/apps/web/src/lib/copilot/nav.test.ts
git commit -m "feat(control-center): add Copilot panel with explicit provider switch"
```

---


### Task 8: Catalog honesty, docs, and verification gate

**Files:**
- Modify: `projects/control-center/apps/web/src/lib/repo/catalog.ts`
- Modify: `projects/control-center/docs/architecture.md`
- Modify: `.agents/HANDOFF.md`
- Modify: `.agents/PROGRESS.md` only if the Control Center area status changes
- Test: existing registry tests plus `pnpm --filter @sentra/control-center test`

**Interfaces:**
- Consumes: files created in earlier tasks as evidence paths
- Produces: a feature `operator-copilot` whose status is derived from evidence, never hard-coded `connected`

- [ ] **Step 1: Add the catalog entry**

```ts
{
  id: "operator-copilot",
  name: "Copilot Operator",
  area: "agents",
  purpose:
    "Menjawab pertanyaan kesiapan mesin lewat perintah yang sudah diizinkan, dengan pilihan Lokal atau OpenAI.",
  userValue:
    "Chief bisa bertanya apakah mesin siap tanpa menekan tombol satu per satu, dan tanpa agen menjalankan perintah bebas.",
  whenToUse:
    "Saat memeriksa kesiapan, atau saat meminta perbaikan lokal yang masih membutuhkan konfirmasi.",
  entryPoint: "pnpm --filter @sentra/control-center dev → bagian Copilot",
  evidence: [
    { path: "projects/control-center/apps/web/src/lib/copilot/agent.ts", proves: "Agen Copilot" },
    { path: "projects/control-center/apps/web/src/app/api/copilot/route.ts", proves: "Rute chat" },
    { path: "projects/control-center/capabilities.json", proves: "Capability ai tercatat" },
  ],
  risk: "R2",
  actionIds: ["doctor", "status"],
  docs: ["docs/superpowers/specs/2026-08-17-control-center-operator-copilot-design.md"],
  caveat:
    "Lokal membutuhkan Ollama. OpenAI membutuhkan OPENAI_API_KEY. Tidak ada pindah otomatis antar keduanya.",
}
```

- [ ] **Step 2: Update capsule architecture**

In `projects/control-center/docs/architecture.md`, add a short Copilot paragraph: chat is local-only, tools are allowlisted ids, R3 remains absent, secrets are presence-only.

- [ ] **Step 3: Overwrite HANDOFF**

Keep under ~1k tokens. State: Copilot implemented on `feat/operator-copilot`; providers are explicit Local/OpenAI; remaining operator setup is Ollama install or key presence; do not claim 100% ready for the golden-path database plan.

- [ ] **Step 4: Run the verification gate**

```powershell
pnpm --filter @sentra/control-center test
pnpm --filter @sentra/control-center typecheck
pnpm --filter @sentra/control-center lint
pnpm check:tokens
pnpm governance
```

Expected: all green on the worktree. If `pnpm governance` fails only because HANDOFF was not updated, fix HANDOFF and rerun. Do not weaken a checker.

- [ ] **Step 5: Commit**

```powershell
git add projects/control-center/apps/web/src/lib/repo/catalog.ts projects/control-center/docs/architecture.md .agents/HANDOFF.md
git commit -m "docs(control-center): register Copilot evidence and current handoff"
```

---

## Manual acceptance

After Task 8, on the operator machine:

1. `pnpm --filter @sentra/control-center dev` and open `http://127.0.0.1:3100`.
2. Open Copilot. With Ollama stopped, Lokal shows not ready and Send stays disabled. OpenAI stays unused.
3. Start Ollama, `ollama pull llama3.1:8b`, refresh. Ask: `Mesin siap tidak?` Expect a `doctor` tool card and a structured answer.
4. Select OpenAI without a key: option disabled or request refused, no network call.
5. Ask to start the database. Expect an approval card, not an automatic `db-start`.

Do not treat manual acceptance as a substitute for the Task 8 command gate.

## Out of scope reminders

- Do not merge `feat/corpus-engine-poc`.
- Do not add Prisma MCP or Postgres MCP.
- Do not install AI SDK 7. Stay on the pinned 6.0.240 set.
- Do not run `pnpm db:reset` unless Chief types that exact local reset authorization.

