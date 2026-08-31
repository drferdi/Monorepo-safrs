# 2026 agent-platform best-practice brief

Applied 2026-08-31 during the Rakazo → Sentra Bot rebrand and audit pass. Sources checked: Anthropic
"Effective harnesses for long-running agents", Anthropic prompt-engineering best practices,
OpenAI Operator System Card, Northflank "How to sandbox AI agents in 2026", OpenRouter BYOK docs,
public 2026 agent-containment incident write-ups.

## What the research recommends

1. Separate tool-call validation/approval from LLM output; gate irreversible actions on an
   independent state machine, not on the model's own claim of what it did.
2. Default production sandboxes to microVM-class isolation (E2B/Firecracker, gVisor) over shared-kernel
   containers; keep plain Docker for local dev only.
3. Defense-in-depth against prompt injection from untrusted web/tool content (typed tool calls,
   content tagged as data not instructions, no implicit trust of page text).
4. Full action tracing (prompt + tool call + reasoning + model version) per agent step, for
   post-mortem capability.
5. Explicit SSRF guarding on any user-supplied custom model endpoint (BYOK / OpenAI-compatible URL):
   scheme allowlist, private/link-local IP blocking, resolve-then-pin DNS.

## What this codebase already had (verified by audit, not assumed)

- **#1 (approval gate)**: `packages/adapters/src/approval-effect.ts` already does atomic
  `updateMany({where:{status:X}})` state transitions and refuses to blindly replay an "uncertain"
  interrupted side effect.
- **#2 (sandbox tiering)**: already supports Docker (dev default), E2B/Daytona/Box (remote,
  production-grade isolation) as pluggable `SANDBOX_PROVIDER` values; `docs/self-host.md` already
  recommends E2B for public/multi-user deployments and the prod compose file already defaults to it.
- **#3 (prompt injection)**: `packages/adapters/src/history-compaction.ts` explicitly tags compacted
  history as `untrusted historical data, not instructions`; `connector-safety.ts` exists as a
  dedicated trust-boundary module for connector output.
- **#5 (SSRF)**: `openai-compatible-url.ts` + `network-address.ts` wire a DNS-rebind-safe custom
  `lookup` into the actual `undici.Agent` used for the request (not just a one-time hostname string
  check) — this is stronger than what's typically documented publicly for this pattern.
- **#4 (tracing)**: OpenTelemetry (`OTEL_EXPORTER_OTLP_ENDPOINT`) and a `telemetry` package are
  already wired through the API/worker request path.

No new abstraction was added for #1–#5 — the existing implementation already matches or exceeds the
researched best practice. Adding a second layer here would have been speculative complexity per this
project's "minimum sufficient change" rule.

## What was actually broken and fixed

The rebrand's mechanical `rakazo` → `sentrabot` replace correctly renamed the **product**, but the
GitHub **org** (`elie222`, the upstream author) was never Chief's — self-update
(`packages/core/src/self-update.ts`), the update-image resolver (`packages/core/src/compose-update.ts`),
the Electron auto-updater config (`apps/desktop/package.json`), and doc/workflow references all still
pointed at `github.com/elie222/...` / `ghcr.io/elie222/...`, which don't exist under that name. Fixed
across 20 files (source, tests, docs, CI workflow, issue templates, `.env.example`) to
`github.com/drferdii/sentrabot`. One test fixture (`self-update.test.ts`) had a rebrand artifact —
a literal space inserted into a URL path segment — corrected to a valid path.

## Follow-up: memory-system re-check (2026-08-31)

Audited `packages/memory` (the bot's own persistent-memory feature) on request. Found and fixed one
real bug: `MemoryDocument`'s unique constraint was `(workspaceId, scope, botId, path)` — missing
`userId` — while every read/search/commit query in `packages/memory/src/index.ts` already scopes by
`userId` unconditionally. Effect: for `scope: "user"` (personal memory, `botId` null), two different
users in the same workspace committing memory at the same `path` (e.g. a common name like
`notes.md`) would collide on the DB unique index — the second user's `create()` throws an unhandled
Prisma `P2002`. Not a cross-tenant read leak (every read/search already filters by `userId`), but a
functional bug that would crash a legitimate personal-memory write.

Fix: migration `20260830231722_memory_document_unique_per_user` — dropped the old index, added
`@@unique([workspaceId, userId, scope, botId, path])`. Regression test added in
`packages/memory/src/index.test.ts` asserting the DB lookup/create both scope by the committing
user's id, matching the new index. Applied to the local dev database; `pnpm --filter @sentrabot/memory
test` (3/3) and `pnpm check` (19/19) both pass after the change.

## Verification run after the fixes

- `pnpm check` — 19/19 packages, clean.
- `pnpm --filter @sentrabot/core --filter @sentrabot/api --filter @sentrabot/desktop test` —
  349 + 160 + 104 tests passing.
- Full stack re-verified live: Postgres, API (`/health` → `ok:true`), Worker, Sandbox Supervisor,
  Web all responding after every change in this session.

## Follow-up: infra/updater test failures on Windows (2026-08-31)

12 of the previously-failing tests, root cause: `resolveUpdaterConfig` in `updater-logic.ts`
correctly requires `SENTRABOT_DEPLOY_DIR` to be POSIX-absolute (the deploy dir is always a Linux
container bind mount in production, and downstream code joins paths under it with `path.posix`).
The `deployment()` test fixture in `index.test.ts` built its temp directory with
`mkdtemp(path.join(os.tmpdir(), ...))`, which on Windows returns a drive-letter-rooted path
(`C:\Users\...`) that can never satisfy a POSIX-absolute check — no amount of separator-flipping
fixes this, since a drive letter isn't valid at all in `path.posix`. Production code was correct and
untouched; the test fixture's assumption was the bug. Fixed by rooting the fixture at a fixed
POSIX-style `/tmp/sentrabot-updater-test-*` path instead — Node's fs APIs resolve a leading `/`
against the current drive on Windows and accept forward slashes on every platform, so the same path
string satisfies both the real filesystem calls in the tests and `resolveUpdaterConfig`'s check.

One further failure after that fix: "preserves the environment owner and surrounding values with
mode 0600" — expected `mode 0o600`, got `0o666`. Root cause: Windows/NTFS has no POSIX permission
bits; Node's `chmod()` on Windows only toggles the read-only attribute, and any "writable" mode
collapses to `0o666`. The 0600 behavior itself is real and enforced correctly in production (Linux
only); it is simply not observable through `chmod()`/`lstat()` on Windows. Skipped this one test on
`process.platform === "win32"` with a comment explaining why — it still runs on Linux/CI.

Unrelated bug found during this re-verification: `infra/compose/docker-compose.images.yml` had a
duplicate top-level `name: sentrabot` key (lines 1 and 11), which is invalid YAML and made
`compose-images.test.ts` fail with `YAMLParseError: Map keys must be unique`. Removed the duplicate.

Result: `pnpm --filter @sentrabot/updater test` — 53 passed, 1 skipped (Windows-only), 0 failed.
`pnpm check` — 19/19 clean.
