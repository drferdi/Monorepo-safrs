# SAFRS v1.1 Bootstrap — Install

## Lowest-risk adoption
1. Create a governance-only branch/worktree.
2. Copy the **new** SAFRS files into repository root. Do not overwrite existing governance docs unless they are byte-identical.
3. Run:
   ```bash
   bash scripts/safrs-verify.sh
   ```
4. Commit only governance scaffolding.
5. Open PR and verify `SAFRS Governance` passes.
6. Replace `.github/CODEOWNERS.example` placeholders with real GitHub users/teams and save as `.github/CODEOWNERS`.
7. Configure repository ruleset/branch protection to require PR + SAFRS Governance + code-owner review on sensitive paths.
8. Enable secret scanning/push protection and dependency security features available to the repository.
9. Audit all existing GitHub Actions: least-privilege `permissions`, full-SHA pinning, no production secret inheritance for coding agents.
10. Use `docs/plans/completed/SAFRS_BOOTSTRAP_IMPLEMENTATION.md` as the completed bootstrap record; create a new active plan before any repository-specific follow-up without mixing unrelated product refactors into the adoption PRs.

## Important
The supplied package intentionally keeps the current Sentra governance documents at their existing root paths. Moving them under `docs/` is optional future cleanup and is **not required** for SAFRS adoption.
