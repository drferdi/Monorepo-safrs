# Codex Repository Automation — Design (2026-08-11)

## Goal

Add a portable, Git-tracked Codex adapter for this monorepo. Codex must follow SAFRS,
enforce high-value guardrails, expose focused workflows, and support read-only specialist
review without duplicating canonical policy.

## Constraints

- Repository-only: do not modify `~/.codex/config.toml` or other user state.
- `AGENTS.md` and its routed documents remain canonical; `.codex/` is an adapter.
- Do not set model or reasoning defaults. Parent/session configuration remains authoritative.
- Keep Prisma/PostgreSQL MCP deferred. Do not add deployment or scheduled automation.
- Preserve the uncommitted Cursor non-coding-agent work; this design does not modify it.
- Risk: **R2**. Codex configuration and hooks are verification controls and require designated review.

## Chosen approach

Use native Codex repository surfaces:

- `.codex/config.toml` for project settings, subagent concurrency, and MCP.
- `.codex/hooks.json` plus Node hook adapters for lifecycle enforcement.
- `.codex/agents/*.toml` for focused read-only reviewers.
- `.agents/skills/*/SKILL.md` for repository workflows.

This is preferred over an `AGENTS.md`-only setup because it adds mechanical guardrails,
and over refactoring all vendor adapters into a shared runtime because that would expand
the R2 change across working Claude, Cursor, and Cline integrations.

## Repository layout

```text
.codex/
  config.toml
  hooks.json
  hooks/
    guard-tool-use.mjs
    format-edited-files.mjs
  agents/
    safrs-reviewer.toml
    security-reviewer.toml
.agents/skills/
  verify/SKILL.md
  prisma-migration/
    SKILL.md
    scripts/validate-migration.mjs
docs/bootstrap/CODEX_SETUP.md
```

Local Codex state remains ignored. `.gitignore` allowlists only the shared files above.

## Project configuration

`.codex/config.toml` will:

- enable project subagents with at most three concurrent child threads;
- configure Context7 as the only repository MCP server using an exact package version;
- avoid sandbox, approval, model, reasoning, provider, telemetry, and credential settings.

The project must be trusted before Codex loads this configuration or its hooks.

## Hooks

### PreToolUse guard

`guard-tool-use.mjs` handles `Bash` and `apply_patch` payloads.

- Deny reads or writes targeting credential-shaped paths while allowing `.env.example`.
- Deny force-push and direct destructive database commands that bypass repository wrappers.
- Classify touched paths from `.safrs/sensitive-paths.json` and return model-visible R2 or
  verification-integrity context.
- Fail closed for recognized credential/destructive operations; malformed or irrelevant
  payloads report a warning without inventing a target.
- Do not replace the database reset guard or human authorization requirements.

### PostToolUse formatter

`format-edited-files.mjs` extracts repository-local paths changed by `apply_patch`, skips
generated/vendor output, and runs the local Biome binary only for supported file types.
Formatting failures are reported but do not conceal the original tool result.

Both hooks use repository-relative Node commands and a Windows `commandWindows` override.
No shell interpolation or downloaded runtime is required.

## Skills

### `verify`

Runs the canonical SAFRS and repository verification sequence, distinguishes pre-existing
failures from regressions, and enforces the HANDOFF/session-close protocol before success
is claimed.

### `prisma-migration`

Adapts the existing Cline migration workflow to Codex. It requires R2 review, uses only the
repository Prisma wrappers, preserves the disposable-local reset guard, validates generated
SQL with its bundled script, and requires package-scoped tests.

`api-route` is intentionally deferred to a later batch so the initial Codex skill surface
stays small and focused on universal verification plus the highest-risk repeated workflow.

## Subagents

### `safrs-reviewer`

Read-only reviewer for risk classification, package boundaries, token compliance, HANDOFF,
and verification-control coupling. It reports evidence and never edits or self-approves.

### `security-reviewer`

Read-only reviewer for Stripe/webhooks, environment boundaries, credentials, database reset,
input validation, and dependency changes. It follows `SECURITY.md` and reports findings by
severity with file references.

Both agents set `sandbox_mode = "read-only"`, contain explicit no-mutation instructions,
and inherit the parent model and reasoning effort. A parent session's live permission
override can supersede the configured sandbox, so these reviewers are guardrails rather
than an independent security boundary.

## MCP and plugins

Context7 is the only repository MCP server. Its inventory entry records documentation-only
purpose, public package/docs data, npm provenance, endpoints, and review status. MCP output
remains untrusted data.

No repository plugin is required. Installed GitHub and Codex Security plugins may be used
when available, but the checked-in workflow must remain functional without them. Playwright
uses the repository test dependency rather than another MCP server. Prisma/PostgreSQL MCP
remains deferred until a separate reviewed decision supersedes the current one.

## Governance and documentation

- Add `.codex/**` to `.safrs/sensitive-paths.json` R2 patterns.
- Add `.codex/config.toml`, `.codex/hooks.json`, and `.codex/hooks/**` to
  `verification_control_patterns`.
- Register Context7 in `.safrs/tool-inventory.json`, covering all repository adapters that
  use it.
- Add `docs/bootstrap/CODEX_SETUP.md` and register it in the document registry.
- Record the durable adapter/MCP decision and update PROGRESS and HANDOFF.
- Flag `SAFRS_VERIFICATION_INTEGRITY_REVIEW=required` because controls and their tests change
  together.

## Verification

Add contract tests for:

- valid TOML/JSON and required Codex agent fields;
- hook allow/deny behavior for credentials, `.env.example`, force-push, R2 paths, and
  malformed payloads;
- formatter path extraction and generated-path exclusions;
- skill metadata and bundled migration validator presence;
- Context7-only MCP posture and matching tool-inventory entry;
- `.codex/**` sensitive and verification-control classification.

Run the hook contract tests, `pnpm governance`, affected package checks, `pnpm check`, and
`bash scripts/safrs-verify.sh`. Report known baseline failures separately.

## Non-goals

- User/global Codex configuration or authentication
- Model, reasoning, sandbox, or approval defaults
- Shared refactor of Claude, Cursor, or Cline adapters
- Database, browser, deployment, or production MCP servers
- Scheduled tasks, auto-commit, auto-push, merge, or deployment authority
- Changes to the concurrent Cursor non-coding-agent design or plan

## Acceptance criteria

1. A trusted checkout loads the repository Codex config, hooks, skills, and agents.
2. Credential access and prohibited commands are blocked by tested hooks.
3. R2 and verification-control edits produce SAFRS context without duplicating policy.
4. Context7 is the only configured MCP server and is registered in the tool inventory.
5. Both custom agents default to a read-only sandbox, prohibit mutation in their
   instructions, and inherit session model/reasoning settings.
6. Verification evidence is recorded, with designated review required before merge.
