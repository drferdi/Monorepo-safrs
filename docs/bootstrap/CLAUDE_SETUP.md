# Claude Code Setup — Automation Pack (August 2026)

Operational guide for Claude Code on this SAFRS monorepo. Canonical policy remains
`AGENTS.md` and the documents it routes to. Everything under `.claude/` is an **adapter**,
not a second policy tree.

## Layout

| File | Role |
| --- | --- |
| `CLAUDE.md` | Thin adapter pointing at `AGENTS.md` |
| `.claude/settings.json` | Hook wiring plus read-deny for credential files |
| `.claude/hooks/guard-sensitive-paths.mjs` | PreToolUse: shared-guard verdicts for shell commands and file writes |
| `.claude/hooks/format-edited-file.mjs` | PostToolUse: run Biome on the edited file |
| `.claude/hooks/session-context.mjs` | SessionStart: branch, `git status --short`, and the head of the root HANDOFF |
| `.claude/hooks/handoff-reminder.mjs` | Stop: one HANDOFF reminder per session when edits skipped HANDOFF |
| `.claude/agents/*.md` | Read-only reviewers (SAFRS classification, design tokens) on `model: sonnet` |
| `.claude/rules/safrs-*.md` | Path-scoped context rules, generated from `.safrs/document-registry.json` |
| `.claude/skills/*/SKILL.md` | Repeatable workflows (verification, capability activation, session protocol, Prisma migration) |

Tracked in git: `settings.json`, `hooks/`, `agents/`, `skills/`, `rules/`. Ignored: everything else
under `.claude/`, including `settings.local.json` (personal overrides go there).

## Hooks

Both hooks are Node scripts invoked as `node .claude/hooks/<name>.mjs` — a relative path
with no shell expansion, so they behave identically on Windows PowerShell, Git Bash, and
POSIX shells. Payload arrives on stdin as JSON.

### guard-sensitive-paths.mjs (PreToolUse: Bash, PowerShell, Edit, Write, NotebookEdit)

The hook translates the payload with `tools/automation/src/adapters/claude.mjs` and asks
the shared guard (`tools/automation/src/guard.mjs`), so Claude reaches the same verdict as
Cursor and Codex.

- **Shell commands:** force-push, self-granted publication (`CHIEF_PUSH_OK`,
  `--no-verify`, `core.hooksPath`), and credential-file access are denied. `git merge`,
  `git pull`, fast-forwarding `main`, `gh pr merge`, `git reset --hard`, and destructive
  database commands **ask**: Claude Code shows a permission prompt
  (`permissionDecision: "ask"`), and Gaffer approves or rejects. Every spelling counts:
  `git.exe`, `git -C <path>`, `git -c key=value`.
- **Exit 2 (blocks)** for credential files: `.env`, `.env.*`, `**/*.pem`, `**/*.p12`,
  `**/*.pfx`, `**/*.key`, `**/id_rsa*`. `.env.example` is explicitly allowed.
- **Exit 0 with a stderr notice** when the path matches
  `.safrs/sensitive-paths.json` — separate messages for `verification_control_patterns`
  (never weaken, keep out of implementation change sets) and ordinary R2 `patterns`.
- The R2 pattern list is **read from the registry**, not duplicated here. Editing
  `.safrs/sensitive-paths.json` changes hook behaviour automatically.
- Writes to the guard's own files (`guard.mjs`, the Codex adapter, `.codex/hooks/**`,
  `.codex/config.toml`, `.husky/pre-push`) are denied for every agent.
- Fail-closed: a malformed payload blocks the call (exit 2). The credential list is
  hard-coded so it still applies when the registry is unreadable.
- Commands from the `Bash` and `PowerShell` tools get the same verdicts.
- Plan mode's plan file (a direct `.md` child of `<CLAUDE_CONFIG_DIR or ~/.claude>/plans/`)
  skips the outside-repository deny in the Claude adapter; any other path outside the
  repository is still denied.

### format-edited-file.mjs (PostToolUse: Edit, Write)

Runs `biome check --write --no-errors-on-unmatched <file>` through the local binary at
`node_modules/@biomejs/biome/bin/biome` for TypeScript, JavaScript, JSON, and CSS files.
Never blocks; unfixable findings go to stderr. This moves format drift from
`.husky/pre-commit` and CI to edit time.

### session-context.mjs (SessionStart: startup, resume, clear, compact)

Prints the branch, `git status --short` (first 30 paths), the first 40 lines of
`.agents/HANDOFF.md`, and the names of its later sections into the model context, so the
HANDOFF read survives a context compaction. Git runs without optional locks; a failed git
call prints `(unavailable)`. Prints nothing outside a git repository. Never blocks.

### handoff-reminder.mjs (Stop)

Reads the session transcript. When it shows `Edit`, `Write`, or `NotebookEdit` calls but none
touched a `.agents/HANDOFF.md` (root or capsule), the first stop is blocked once with a
reminder to overwrite the HANDOFF of every touched scope or to say why none is due yet.
`stop_hook_active` and a per-session marker in the temp directory stop it from looping.
Files under the Claude config directory (plans, memory) and the temp directory do not count.
Any error, and a payload without `session_id`, allows the stop.

Limits: Stop fires at the end of every turn, so the single reminder lands on the first turn
that ends after an edit, often mid-task; later turns are not reminded again. Edits made by
subagents (separate transcripts) or through Bash/PowerShell are not seen.

Hook tests: `node --test .claude/hooks/*.test.mjs`. The sibling-worktree guard test needs the
main checkout (its precondition fails inside a linked worktree).

**Restart caveat:** Claude Code snapshots hook configuration at session start. After
changing `.claude/settings.json` or a hook script, start a new session — the running one
keeps the old configuration. Verify a hook change directly instead of assuming:

```bash
node -e "const {spawnSync}=require('node:child_process');const r=spawnSync(process.execPath,['.claude/hooks/guard-sensitive-paths.mjs'],{input:JSON.stringify({tool_name:'Write',tool_input:{file_path:'.env'}}),encoding:'utf8'});console.log(r.status,r.stderr)"
```

Expected: exit code `2` for `.env`, `0` for `.env.example`.

## Subagents

| Agent | Use it for |
| --- | --- |
| `safrs-auditor` | Risk classification of a change set, integrity-review check, drafted HANDOFF/DECISIONS |
| `token-guard` | Design-token review of UI, CSS, and email surfaces before `pnpm check:tokens` |

Both are read-only (`Read, Grep, Glob, Bash`) and report; the calling session applies.

## Skills

| Skill | Invocation | Purpose |
| --- | --- | --- |
| `verify` | `/verify` — user only (`disable-model-invocation: true`) | The SAFRS verification sequence and how to read its failures |
| `new-capability` | user or model | Capability-pack activation and project capsules through `pnpm capability:add` / `pnpm project:new` |
| `safrs-session` | user or model | Claude adapter of `.agents/skills/safrs-session`: session start, scope, and session-end HANDOFF protocol |
| `prisma-migration` | `/prisma-migration` — user only | Claude adapter of `.agents/skills/prisma-migration`: safe migration through repository wrappers; the validation script stays in `.agents/skills/prisma-migration/scripts/` |

## MCP servers

**context7** is not shipped by the repository. Install it per user (no `.mcp.json`, so no R2
change), pinned to an exact release (4.1.1, published 2026-09-14):

```bash
claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp@4.1.1
```

A PostgreSQL MCP server was evaluated and **deferred** — no `.mcp.json` is shipped:

| Candidate | Verdict |
| --- | --- |
| `@modelcontextprotocol/server-postgres@0.6.2` | Rejected — npm-deprecated: "Package no longer supported" |
| `@henkey/postgres-mcp-server`, `postgres-mcp` | Rejected for now — third-party, unvetted against `.safrs/tool-inventory.json` review requirements |
| `prisma mcp` (Prisma 7.9.1, already a repository dependency) | Deferred — exposes mutating tools (`migrate-dev`, `Prisma-Studio`) that bypass the `packages/database/scripts/run-local-prisma.mjs` command allowlist and its local-database guard |

Enabling any of them is an R2 change: it needs a `.mcp.json` entry, a matching
`.safrs/tool-inventory.json` record (`data_scope`, `network_endpoints`, `review_status`),
and designated review. Never put a real connection string in `.mcp.json`; reference
`${DATABASE_URL}` and keep the credential in the untracked `.env`.

## Governance

`.claude/**` and `.mcp.json` are classified R2 in `.safrs/sensitive-paths.json`.
`.claude/settings.json` and `.claude/hooks/**` are additionally listed as
verification controls: changing them together with implementation code triggers
`SAFRS_VERIFICATION_INTEGRITY_REVIEW=required` and must be split or independently reviewed.
