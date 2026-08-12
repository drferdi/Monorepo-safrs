---
description: Security review of the repository or a diff with severity-sorted findings. Read-only.
argument-hint: [target: repo, diff, or files]
---

Run a security review of: $ARGUMENTS

Use the `security-review` skill (threat-model based covering STRIDE/OWASP/supply-chain). Do NOT modify, delete, or fix anything.

Produce a report sorted by severity (Critical > High > Medium > Low > Informational). For each finding include:
- Category (secret exposure, unsafe shell, dependency risk, permission escalation, injection, MCP trust boundary, prompt injection, supply-chain, unsafe hooks, unreviewed network access).
- Evidence (file:line, command result, or URL when using WebSearch).
- Impact and likelihood.
- Recommended mitigation (for the human to apply).

State explicitly what was scanned, what was NOT scanned (e.g. untracked files, external services not reachable), and mark anything UNVERIFIED. Do not print, persist, or transmit any secret value you encounter.
