---
description: Verify a made change: diff, type-check, lint, unit/integration tests, build, security, and documentation impact — with evidence.
argument-hint: [describe the change]
---

Verify the implemented change: $ARGUMENTS

Use the `test-and-verify` skill; do not claim success without evidence.

Run, in order (approval may be needed for commands — request it and show the command):
1. Diff review — summarize exactly what changed and why.
2. Type-check (e.g. `tsc --noEmit`, `pyright`, `cargo check`).
3. Lint (e.g. `eslint`, `biome`, `ruff`).
4. Unit tests — narrowest relevant set first.
5. Integration tests, if available and relevant.
6. Build (if the project defines one).
7. Security pass (see `security-review` skill) on the diff.
8. Documentation impact — does the change require doc updates?

Output a verification report: for each step, the command, status (PASS/FAIL/SKIP), and the exact output evidence. End with a residual-risk report (what was NOT verified and why). Flag anything UNVERIFIED honestly.
