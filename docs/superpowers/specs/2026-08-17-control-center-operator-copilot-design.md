# Control Center Operator Copilot — Design (2026-08-17)

## Goal

Give Chief a local Control Center chat that answers repository readiness questions by calling the existing allowlisted executor. Local Ollama and OpenAI are both available. The operator picks one. There is no silent fallback.

## Status

Chief approved the explicit Local / OpenAI switch on 2026-08-17. This document is the locked design for one implementation plan.

## Risk

R2: new AI capability runtime, shared package dependencies, environment placeholders, and Control Center command-surface changes. Designated review is required before merge. R3 remains out of scope.

## Decisions locked

| Topic | Choice |
| --- | --- |
| Surface | New Control Center section `copilot`, seq 09, after Knowledge |
| Default provider | `local` |
| Provider switch | Explicit only. Never auto-switch Local to OpenAI |
| Read tools | Auto-run: `doctor`, `status`, `task-list`, `saf-gate-all` |
| Mutating tools | `setup`, `db-start`, `db-stop`, `db-generate`, `db-migrate`, `db-seed` require AI SDK `toolApproval: "user-approval"` plus the existing confirm phrase |
| JSON honesty | Allowlist `doctor` and `task-list` gain `--json` |
| Secrets | Presence only. Never print, log, or stream key values |
| Env ownership | Control Center still must not import `@safrs/env/server` |
| Tests | Deterministic doubles. CI never calls a live model |
| Worktree | Implement in `../Monorepo.worktrees/feat-operator-copilot` |

## Why this exists

Control Center already has an allowlisted executor. The missing piece is a question box that uses those same ids. AI SDK 6 is the adapter, not a second command system.

## Architecture

```text
Chief question
  -> Copilot panel (provider = local | openai)
  -> POST /api/copilot
  -> resolveProvider(selection)
       local  -> Ollama OpenAI-compatible at 127.0.0.1:11434
       openai -> @ai-sdk/openai with OPENAI_API_KEY present
  -> ToolLoopAgent
       read tools execute through runCommand(id)
       mutating tools pause for approval, then runCommand(id, phrase)
  -> structured Indonesian answer + evidence
```

The browser never sends a shell string. It sends the question, the provider id, and later an approval decision. The server looks up command ids in `RUNNABLE_COMMANDS`.

## Components

1. `resolveProvider(selection)` — returns a model or a typed refusal.
2. Allowlisted AI tools — thin wrappers over `runCommand`.
3. `operatorCopilot` ToolLoopAgent — instructions, tools, structured output.
4. `POST /api/copilot` — local-only route, no secrets in the response.
5. Copilot panel — provider switch, chat, approval UI, readiness card.
6. Catalog/capability evidence — status derived from files, not hand-written.

## Provider contract

Selection values: `local` | `openai`. Default `local`.

Local is ready only when `http://127.0.0.1:11434/api/tags` answers and the configured model is listed. Otherwise the UI says the local runtime is not ready and offers install guidance. It does not call OpenAI.

OpenAI is ready only when `OPENAI_API_KEY` is a non-empty environment value. The UI may show `tersedia` or `tidak tersedia`. It must never show the key, a prefix, or its length.

Pinned packages, all older than the repository `minimumReleaseAge` of 1440 minutes as of 2026-08-17:

- `ai` 6.0.240
- `@ai-sdk/react` 3.0.240
- `@ai-sdk/openai` 2.0.80
- `@ai-sdk/openai-compatible` 1.0.30

Default models:

- Local: `llama3.1:8b` at `http://127.0.0.1:11434/v1`
- OpenAI: `gpt-4.1-mini` via `openai.chat(...)`

Override only through non-secret env names: `SAFRS_LOCAL_MODEL`, `SAFRS_OPENAI_MODEL`, `SAFRS_OLLAMA_BASE_URL`.

## Tool policy

Read tools auto-execute and must request `--json` output: `doctor`, `status`, `task-list`, `saf-gate-all`.

Mutating tools require user approval, then the existing confirm phrase: `setup`, `db-start`, `db-stop`, `db-generate`, `db-migrate`, `db-seed`.

Forbidden in v1: `dev`, `check`, `test`, `build`, `lint`, `typecheck`, governance full verify, any R3 id, shell, apply_patch, MCP, corpus query, and any command not in the allowlist.

Tool output sent back to the model is truncated. Full JSON stays in the UI evidence drawer.

## Answer contract

Every completed turn must produce:

- `ready`: boolean | null
- `summary`: Indonesian, one or two sentences
- `evidence`: command ids actually run
- `nextStep`: one Indonesian action or an honest unknown
- `provider`: `local` | `openai`

If a required tool fails, `ready` is false or null. The model may not invent a green status.

## Error handling

| Case | Operator sees |
| --- | --- |
| Local selected, Ollama down | Runtime lokal belum siap. Tidak ada panggilan OpenAI. |
| Local selected, model missing | Model belum diunduh. Perintah pull ditampilkan. |
| OpenAI selected, key absent | Kunci OpenAI tidak tersedia. Tidak ada panggilan jaringan. |
| Unknown command id | Perintah tidak ada dalam daftar yang diizinkan. |
| Confirm phrase mismatch | Frasa konfirmasi tidak cocok. |
| Provider/network failure | Permintaan gagal. Tidak ada tebakan status. |

## UI

Keep the existing Control Center visual language and `@sentra/token`. No new color or radius literals.

The Copilot section contains:

1. Provider switch: Lokal / OpenAI, with live availability.
2. Question field and send button.
3. Transcript with tool cards.
4. Approval card for mutating tools, including effect text, phrase field, and Setuju / Tolak.
5. Final readiness card from the structured output.

User-facing copy is Indonesian. Identifiers stay English.

## Testing

- Unit: provider resolution, JSON allowlist args, approval mapping, secret redaction, structured output parse.
- Route: selected provider is the one constructed; local failure does not construct OpenAI.
- UI: Local/OpenAI switch, disabled OpenAI when key absent, approval card appears for `db-start`.
- No live model, no real API key, no network model call in CI.

## Files

| File | Responsibility |
| --- | --- |
| `projects/control-center/apps/web/src/lib/copilot/provider.ts` | Resolve Local/OpenAI or typed refusal |
| `projects/control-center/apps/web/src/lib/copilot/tools.ts` | Allowlisted tools over `runCommand` |
| `projects/control-center/apps/web/src/lib/copilot/agent.ts` | ToolLoopAgent and output schema |
| `projects/control-center/apps/web/src/app/api/copilot/route.ts` | POST handler |
| `projects/control-center/apps/web/src/app/copilot-panel.tsx` | Chat and approval UI |
| `projects/control-center/apps/web/src/lib/exec/commands.ts` | Add `--json` to doctor and task-list |
| `projects/control-center/capabilities.json` | Record capability `ai` |
| `.env.example` | Empty `OPENAI_API_KEY` and local model placeholders |
| `pnpm-workspace.yaml` | Pin the four AI packages |

## Non-goals

No Corpus Engine merge, no medical answers, no production deploy, no Vercel AI Gateway requirement, no Prisma/Postgres MCP, no second design system, no Golden Path chat, no DurableAgent, no image tools, no free shell.

## Approval

Chief approved both providers with an explicit switch and no silent fallback. Implementation waits for the written plan and Chief's execution choice.
