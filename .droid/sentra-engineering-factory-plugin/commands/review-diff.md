---
description: Evidence-based code review of a diff or branch. Read-only.
argument-hint: [diff, commit, or branch]
---

Review the following with evidence: $ARGUMENTS

Use the `security-review` skill for the security pass and `test-and-verify` to assess test coverage claims. Do NOT modify files.

Structurally report:
1. Intent — what the change is meant to do.
2. Correctness risks — logic, edge cases, regressions (file:line references).
3. Security findings — severity: Critical/High/Medium/Low/Informational, with evidence and suggested mitigation (do NOT fix).
4. Test coverage — is the change tested? Gaps?
5. Maintainability / governance adherence (AGENTS.md, policy files).
6. Rollback/migration hazards.

Every finding must cite evidence (line/path or command output). Distinguish confirmed issues from concerns. Do not propose unsupported changes.
