---
name: documentation-maintenance
description: Keep documentation consistent with the actual state of the code. Update, verify, or generate docs (README, module docs, ADRs, plans) only when needed and only where in scope. Never invent facts that are not supported by the code.
version: 1.0.0
compatibility: droid
---

# Documentation Maintenance

Maintain documentation that reflects the real, current state of a repository. The goal is no stale truths and no invented facts.

## When to use this skill

- The user asks to update, verify, or improve documentation.
- A code change makes existing docs stale (included in `/verify-change`).
- Writing ADRs, plans, README sections, or module docs.
- The repository convention requires doc updates for certain changes.

## Preconditions

- Scope: only documentation files the user asked to touch (do not creep into code).
- Respect the repository's documentation rules (e.g. SAFRS: stable truth lives in canonical documents; `docs/plans/active/` for in-flight plans; ADRs for architectural decisions).

## Workflow

1. **Define scope.** Which docs may be edited, in which locations, and for what change.
2. **Follow the docs-are-code discipline.** Read the relevant code/config to confirm the truth before writing. Never state behavior you have not verified.
3. **Check existing docs for staleness.** Read the target doc and diff your knowledge of the code against it; list discrepancies.
4. **Edit minimally.** Only the lines/sections that are wrong or newly needed. Preserve style, tone, and conventions of the file.
5. **Link, do not duplicate.** If the truth lives elsewhere (config, ADR, upstream), reference it instead of copying.
6. **Update adjacent indexes.** Header docs, README tables of contents, registry files the repo uses (e.g. SAFRS document registry, navigation) if the repo convention requires it.
7. **Verify** per repo tooling (markdownlint, checks) and confirm no unrelated file changed.

## Output contract

- **Changes**: files edited and what changed in each (one line).
- **Verification**: commands run and status.
- **Residual**: anything left stale or UNVERIFIED.

## Stop conditions

- All in-scope docs are current and verified, or
- The change would require editing out-of-scope files — stop and report.

## Security boundaries

- Docs are shared surface: **no secrets, private host names, customer data, or internal-only identifiers** — link to source of truth instead.
- Do not fabricate commands, flags, or behavior that were not verified.
- Do not modify code files or governance files unless explicitly in scope.

## Example usage

> A schema field was renamed; the README example still shows the old name → update the example, run markdownlint, verify diff is doc-only.

## Anti-patterns

- Rewriting whole docs when one section is stale.
- Documenting features/commands that don't exist.
- Duplicating truth that already lives in code or another doc.
- Leaving in secrets or placeholders in shared docs.
- Editing code to "match" the docs without a request to do so.
