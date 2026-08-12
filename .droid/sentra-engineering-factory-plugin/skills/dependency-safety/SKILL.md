---
name: dependency-safety
description: Safely manage dependencies and lockfiles. Identify the package manager, compare changes before updates, assess breaking changes and known vulnerabilities, and never update blindly. Protects lockfiles and the working tree.
version: 1.0.0
allowed-tools:
  - Read
  - LS
  - Grep
  - Glob
  - Execute
compatibility: droid
---

# Dependency Safety

Keep dependencies correct, minimal, and safe. This skill treats the lockfile and the working tree as user work to protect, and treats dependency updates as deliberate, reviewable actions.

## When to use this skill

- Before adding, upgrading, or removing any dependency.
- Auditing existing dependencies / vulnerability status.
- When a lockfile is out of sync or a change touches it.
- Related to `/verify-change` for dependency diffs.

## Preconditions

- Identify the package manager from manifests/lockfiles (pnpm/npm/yarn/uv/pip/cargo/go) and respect its locking behavior.
- A clean, understood starting point. Check `git status` before touching anything (do not overwrite uncommitted work).
- The update requires explicit approval from the user unless it is a read-only check.

## Workflow

1. **Protect the lockfile and working tree.** Confirm nothing is in a dirty/inconsistent state that would be clobbered. Never run blind `install`/`update` that rewrites the lockfile without consent.
2. **Audit current state** (read-only): `pnpm outdated` / `npm outdated` / `pip list --outdated`, and vulnerability scans (`pnpm audit`, `npm audit`, `pip-audit`) if available. Record findings only; do not act yet.
3. **Compare before updating.** If an update is requested: show current vs proposed version, the semantic-version delta, and what changed in the new version's release notes when you can fetch them (use official sources).
4. **Assess breaking change and vulnerability.** Classify:
   - Breaking-change risk (major version / breaking minors, removed APIs, migration notes).
   - Known vulnerabilities in the target version (audit/advisory sources).
   - Impact on the changed diff and runtime.
5. **Update deliberately.** After approval, update the minimum set needed (not everything "latest"), let the lockfile update correctly for that package manager, then run the repo's verification (tests/build) narrowed to affected areas.
6. **Report**: what changed (version, why), verification status and evidence, residual risk (anything not testable locally), and rollback note (original version + how to revert).

## Output contract

A Markdown report:

- **Decision outcome**: UPDATED / NOT UPDATED / PARTIAL, with the exact versions.
- **Comparison**: current → target, delta type.
- **Risk assessment**: breaking-change and vulnerability findings with sources.
- **Verification**: commands run, status, evidence.
- **Residual risk & rollback**.

## Stop conditions

- A read-only audit → complete at step 2 with the report.
- An approved update → complete after verification passes (or the failure is reported).
- Any unapproved destructive/global action → stop and request approval.

## Security boundaries

- **Never update blindly** (`pnpm update -i`-style mass upgrades without review).
- **Do not touch the lockfile outside the approved scope.**
- Do not install from untrusted or unreviewed sources; verify package provenance when in doubt.
- Never read or print secret-driven dependency config (e.g. `.npmrc` with auth tokens, private registry creds).

## Example usage

> "Is it safe to upgrade axios to v1.x?" → audit current, compare, fetch release notes, classify risk, then ask before updating; after update run the narrow test.

## Anti-patterns

- Running `update`/`install` that silently rewrites the lockfile without approval.
- Upgrading everything to latest "because they're out of date".
- Ignoring vulnerability reports to avoid breaking tests.
- Not checking the release notes for breaking changes before a major bump.
