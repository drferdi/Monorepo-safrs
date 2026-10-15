---
description: Devin CLI operating notes for the SAFRS monorepo (adapter only; policy lives in AGENTS.md)
trigger: always_on
---

# Devin adapter

- Canonical policy is root `AGENTS.md` and the documents it routes to. This file adds only Devin mechanics.
- Skills come from `.agents/skills/`: start sessions with `safrs-session`, finish with `verify`; use `abyss-review` for reviews.
- Subagents: `subagent_explore` for research (cheaper model); `safrs-auditor` before declaring work complete; `token-guard` after UI, CSS, or email changes. Avoid `subagent_general` for read-only work: it runs on the parent's model.
- The SAFRS guard (`.devin/hooks/safrs-guard.mjs`) blocks what other agents would ask about (merge, pull, `reset --hard`, `.env` mentions). A block means: stop, tell Gaffer the exact command, and let Gaffer run it.
- Call the `jev_route` MCP tool per `AGENTS.md` (Jev Decision Layer). No Devin hook calls Jev automatically yet.
- Commit trailer: `Co-Authored-By: Devin <noreply@cognition.ai>`. Never push.
