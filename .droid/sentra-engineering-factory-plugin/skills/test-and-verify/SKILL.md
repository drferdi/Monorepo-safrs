---
name: test-and-verify
description: Find the correct test command, run tests with approval when needed, read failures systematically, and report evidence — never claim success without proof. Produces a residual-risk report.
version: 1.0.0
allowed-tools:
  - Read
  - LS
  - Grep
  - Glob
  - Execute
compatibility: droid
---

# Test and Verify

Run and interpret tests and verification to validate a change with **evidence**, not assertion.

## When to use this skill

- After implementing a change.
- When asked to verify that tests pass.
- Before declaring a task complete.
- Triggered by `/verify-change`.

## Preconditions

- A working directory with the repo and any relevant manifests.
- Approval required from the user before running commands that modify state or take significant time; read-only commands may run freely.
- Know the package manager / test runner from repo config (see `repository-archaeology`).

## Workflow

1. **Find the correct command.** Identify the test runner, type-check, lint, and build commands from manifests, scripts, CI config, or docs. Prefer repo instructions over assumptions.
2. **Ask approval for side-effect or slow commands.** Show the exact command and what it does; run only after approval. Read-only/dry-run checks can run immediately.
3. **Run the narrowest relevant test first** (single file/module), then expand as needed.
4. **Read errors systematically.** Capture exit codes, first error, and the failing test/assertion context. Do not guess the cause from a truncated fragment.
5. **Fix forward only when fixing is in scope.** If this is a verification-only call, report failures and stop; do not silently refactor.
6. **Collect evidence**: command, exit status (`0`/non-zero), and a concise relevant excerpt.
7. **Write a residual-risk report** listing anything not verified and why (no integration env, long-running suite skipped, flaky known failures, etc.).

## Output contract

A verification report with a table/section per check:

| Check | Command | Status (PASS/FAIL/SKIP) | Evidence |

Always end with:

- **Residual risks**: what wasn't verified and why.
- **Failure details** (if any): exact error excerpt and suspected cause, clearly labeled.

## Stop conditions

- All in-scope checks completed and reported, or
- A blocking failure is confirmed — report it, do not mark success.

## Security boundaries

- Do not run destructive commands.
- Do not mutate test code, weaken tests, or skip checks to make a task pass.
- Do not read or print secrets in test output.
- Respect repo governance (e.g. `scripts/safrs-verify.sh` if defined).

## Example usage

> `pnpm test -- packages/schemas` when the user asked to verify a schema change; report PASS/FAIL with the exact output.

## Anti-patterns

- Saying "tests pass" without running them or showing output.
- Ignoring a failing test to claim success.
- Running the whole suite when the narrow test proves the point.
- Modifying tests to make them pass.
- Guessing the cause of a failure from a single line without context.
