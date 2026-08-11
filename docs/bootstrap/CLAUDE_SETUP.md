# Claude Code Setup — Automation Pack (August 2026)

Operational guide for Claude Code on this SAFRS monorepo. Canonical policy remains
`AGENTS.md` and the documents it routes to. Everything under `.claude/` is an **adapter**,
not a second policy tree.

## Layout

| File | Role |
| --- | --- |
| `CLAUDE.md` | Thin adapter pointing at `AGENTS.md` |
| `.claude/settings.json` | Hook wiring plus read-deny for credential files |
| `.claude/hooks/guard-sensitive-paths.mjs` | PreToolUse: block credential writes, warn on R2 paths |
| `.claude/hooks/format-edited-file.mjs` | PostToolUse: run Biome on the edited file |
| `.claude/agents/*.md` | Read-only reviewers (SAFRS classification, design tokens) |
| `.claude/skills/*/SKILL.md` | Repeatable workflows (verification, capability activation) |

Tracked in git: `settings.json`, `hooks/`, `agents/`, `skills/`. Ignored: everything else
under `.claude/`, including `settings.local.json` (personal overrides go there).

## Hooks

Both hooks are Node scripts invoked as `node .claude/hooks/<name>.mjs` — a relative path
with no shell expansion, so they behave identically on Windows PowerShell, Git Bash, and
POSIX shells. Payload arrives on stdin as JSON.

### guard-sensitive-paths.mjs (PreToolUse: Edit, Write, NotebookEdit)

- **Exit 2 (blocks)** for credential files: `.env`, `.env.*`, `**/*.pem`, `**/*.p12`,
  `**/*.pfx`, `**/*.key`, `**/id_rsa*`. `.env.example` is explicitly allowed.
- **Exit 0 with a stderr notice** when the path matches
  `.safrs/sensitive-paths.json` — separate messages for `verification_control_patterns`
  (never weaken, keep out of implementation change sets) and ordinary R2 `patterns`.
- The R2 pattern list is **read from the registry**, not duplicated here. Editing
  `.safrs/sensitive-paths.json` changes hook behaviour automatically.
- Fail-open by design: a malformed payload logs to stderr and allows the call. The
  credential list is hard-coded so it still applies when the registry is unreadable.

### format-edited-file.mjs (PostToolUse: Edit, Write)

Runs `biome check --write --no-errors-on-unmatched <file>` through the local binary at
`node_modules/@biomejs/biome/bin/biome` for TypeScript, JavaScript, JSON, and CSS files.
Never blocks; unfixable findings go to stderr. This moves format drift from
`.husky/pre-commit` and CI to edit time.

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

## MCP servers

**context7** is already available for library documentation and needs no repository
configuration.

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
