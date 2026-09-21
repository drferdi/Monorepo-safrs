# Claude Code adapter

`CLAUDE.md` is an adapter: read root `AGENTS.md`, follow its routing and risk rules, do not duplicate policy.

Claude automation (hooks, subagents, skills, MCP posture) lives in `.claude/` and is documented in `docs/bootstrap/CLAUDE_SETUP.md`. `.claude/**` is classified R2. `.claude/settings.json` and `.claude/hooks/**` are verification controls.
