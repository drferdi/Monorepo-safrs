---
description: Produce a read-only repository audit: structure, build/test/lint status, governance, security findings, DX friction, and prioritized recommendations.
argument-hint: [focus area]
---

Perform a read-only audit of this repository using the `repository-archaeology` skill, plus a security pass with the `security-review` skill where applicable.

Scope: $ARGUMENTS

Do NOT modify any files. Produce the audit as a final Markdown report with:

1. Executive summary (3-5 bullets).
2. Structure map (top-level layout, packages/projects, entry points).
3. Build/test/lint status (commands found and whether they were run; evidence for anything claimed).
4. Governance status (AGENTS.md/CLAUDE.md, .factory/, .safrs/, policy files, CI config).
5. Security findings (severity: Critical/High/Medium/Low/Informational) — only ones you can evidence.
6. DX friction (missing commands, unclear docs, unnecessary config burden).
7. Prioritized recommendations (each with a rough effort estimate and why).

Stop when the report covers the above. If you cannot verify a status, say "UNVERIFIED" rather than guessing.
