# Claude Code adapter

`CLAUDE.md` is an adapter: read root `AGENTS.md`, follow its routing and risk rules, do not duplicate policy.

Claude automation (hooks, subagents, skills, MCP posture) lives in `.claude/` and is documented in `docs/bootstrap/CLAUDE_SETUP.md`. Path-scoped context rules in `.claude/rules/safrs-*.md` are generated from `.safrs/document-registry.json` (`python tools/safrs/generate_routing.py`); only Claude Code reads them. The read-only subagents `safrs-auditor` and `token-guard` run on `model: sonnet`. `.claude/**` is classified R2. `.claude/settings.json` and `.claude/hooks/**` are verification controls.
