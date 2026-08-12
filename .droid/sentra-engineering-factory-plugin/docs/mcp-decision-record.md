# MCP Decision Record

**Decision: ship zero MCP servers in this plugin (`mcp.json` is absent).**

This decision follows the official [MCP documentation](https://docs.factory.ai/harness/mcp.md) and the plugin's least-privilege principle: only add MCP servers with a verified, real need, reviewed provenance, minimum permissions, and no hardcoded secrets.

## Evaluated MCP candidates

| MCP | Use case | Official/trust | Permissions | Secret needed | Real need now | Decision |
|---|---|---|---|---|---|---|
| GitHub / Git provider | issues, PRs, review, repo metadata | Would require a connector or GitHub token | Read/write risk | Yes (token) | Not verified for a fixed repo | **Not installed** (optional later) |
| Documentation / knowledge | external docs lookups | Depends on server | Read | Possibly | No external docs dependency in this package | **Not installed** |
| Database | DB debugging/validation | Would need credentials | Write risk | Yes | Not a plugin core workflow | **Not installed** |
| Browser (Playwright) | QA / browser verification | Would need a browser MCP | High (drives a browser) | No | Not a core requirement here | **Not installed** |
| Observability (Sentry etc.) | logs/metrics/tracing | Would need project + DSN | Read/Write | Yes | No repo confirmed using it | **Not installed** |
| Project management (Linear etc.) | issue/roadmap sync | Would need org connection | Read/Write | OAuth/key | No confirmed integration need | **Not installed** |

## Rules applied (from official docs)

1. **No secrets in `mcp.json`** — the plugin would never embed tokens; they'd come via `${ENV_VAR}` expansion if a server were added.
2. **Minimum permissions** and `disabled: true` by default for any added server.
3. **Write-access servers disabled by default.**
4. **Only verified-provenance servers.**
5. **No unverified external servers** — anything not clearly traceable to an official source is rejected.
6. If no real need, add nothing.

## Why zero is the right default here

- The plugin's workflows (audit, review, plan, verify, explain, report) run on **local repository content** and git; none require an external MCP server to function.
- Bundling a GitHub/Linear/etc. MCP would add: an API key/credential burden on every user, a wider attack surface (a leaky or malicious server tool), and per-user approval friction — for no current benefit.
- Users who need GitHub MCP can add it directly via `/mcp` (registry) or `droid mcp add` at their own scope, without this plugin forcing it on everyone.

## Trigger to revisit

Add an MCP server only if a concrete need appears (e.g. the monorepo adopts an issue tracker integration that must be part of agent workflow) — and only through the official `/mcp`/`droid mcp` path, with `disabled` default and env-var secrets.

## Status

- [x] Decision recorded
- [x] `mcp.json` intentionally absent
- [x] Documented in README and security model
