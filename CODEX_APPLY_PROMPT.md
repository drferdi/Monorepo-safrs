# Codex Application Prompt — SAFRS v1.1 Bootstrap

Apply the SAFRS v1.1 bootstrap to the current repository as a **governance-only, no-feature-regression change**.

## Objective
Adopt the contents and behavior defined by this bootstrap while preserving all current product functionality, source architecture, APIs, tests, data behavior, and project documentation unless a change is strictly required for SAFRS integration.

## Constraints
1. Do not refactor product code.
2. Do not move existing governance documents in the first adoption PR.
3. Do not delete or rewrite existing project knowledge merely for style.
4. Reuse the existing root files `00_READ_FIRST.md` through `11_RESPONSE_STANDARDS.md` and `99_SELF_AUDIT.md`.
5. Add root `AGENTS.md` as the canonical agent router.
6. Add the SAFRS files from this package surgically.
7. If a target file already exists, compare semantics and merge only what is required; never blindly overwrite repository-specific policy.
8. Keep vendor-specific configuration thin. Cursor and OpenCode should use root/nested `AGENTS.md` where supported. `GEMINI.md` should remain an adapter pointing to canonical policy.
9. Do not add production secrets or require coding agents to access production credentials.
10. Any change to existing CI must preserve all existing checks; add SAFRS governance rather than replacing unrelated workflows.

## Required implementation
- `AGENTS.md`
- `SAFRS_SPEC.md`
- `SECURITY.md`
- `.safrs/policy.json`
- `.safrs/sensitive-paths.json`
- `.safrs/document-registry.json`
- `docs/governance/*`
- `docs/plans/completed/SAFRS_BOOTSTRAP_IMPLEMENTATION.md` as the completed adoption record; create a new active plan for repository-specific follow-up work.
- `tools/safrs/*`
- `scripts/safrs-verify.sh`
- `.github/workflows/safrs-governance.yml`
- `.github/pull_request_template.md` merged carefully with any existing PR template
- `.github/CODEOWNERS.example` unless real organization team/user handles can be verified from repository/org context
- `GEMINI.md` adapter unless an existing canonical Gemini context file requires surgical merge

## Repository-specific adaptation
Inspect the actual repo and update only these configuration points:
- actual default branch name if not `main`;
- actual sensitive paths (auth, migrations, production config, safety-critical modules, shared APIs/packages);
- existing test/build/lint/typecheck commands to append to verification, without removing current commands;
- actual CODEOWNERS handles only if verifiable;
- nested project `AGENTS.md` only where local instructions are genuinely needed.

## Verification
1. Run `bash scripts/safrs-verify.sh`.
2. Run the repository's existing lint/typecheck/test/build commands affected by the adoption.
3. Verify that all third-party `uses:` in GitHub workflows are pinned to full 40-character commit SHAs, or report existing violations rather than silently breaking workflows.
4. Verify the SAFRS document registry references real files.
5. Exercise sensitive-change classification against at least one known sensitive path and confirm R2 output.
6. Confirm no product runtime behavior was intentionally changed.

## Output
Return:
- files added/modified;
- SAFRS conformance level reached now;
- tests/checks run and exact results;
- existing repository issues that prevent Controlled/Secure conformance;
- repository settings that require a human GitHub admin action (rulesets, secret scanning, push protection, CODEOWNERS team handles, OIDC/cloud trust configuration).

Do not claim completion unless verification commands have actually passed.
