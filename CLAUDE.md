# Claude Adapter

This repository's canonical agent policy is `AGENTS.md` plus the documents it routes to.

Before significant work:
1. Read `AGENTS.md`.
2. Follow its context-routing (Read order) and SAFRS risk rules.
3. Treat this file only as a Claude-specific adapter; do not create policy here that conflicts with or duplicates canonical repository policy.

Claude Code automation for this repository — hooks, subagents, skills, and MCP posture —
lives in `.claude/` and is documented in `docs/bootstrap/CLAUDE_SETUP.md`. Those files are
adapters too: `.claude/**` is classified R2, and `.claude/settings.json` plus
`.claude/hooks/**` are verification controls.
