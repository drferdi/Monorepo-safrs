# SAFRS v1.1 Bootstrap Implementation Plan (Completed)

**Goal:** Adopt SAFRS without changing product behavior or removing any existing project capability.

**Current state:** COMPLETED
**Repository:** `D:\DEV\Monorepo`
**Risk:** R2 because governance, CI, policy, and verification controls were created together.
**Declared conformance:** SAFRS Core; external platform controls remain open.

**Completion record:** The repository-local SAFRS bootstrap and solo-developer golden path were integrated on 2026-08-10. The verified evidence is recorded in `docs/evidence/SAFRS_GOLDEN_PATH_VERIFICATION.md`. GitHub administrator controls remain explicit follow-up work and prevent a Controlled claim.

## Phase 0 — Baseline and no-regression boundary
- [x] Use the dedicated empty target directory and initialize Git on `main`.
- [x] Record baseline: no product files, dependencies, build commands, tests, or existing CI were present.
- [x] Add SAFRS files without moving or deleting bootstrap governance documents.
- [x] Confirm no product runtime files changed; none exist in this new repository.

**Exit:** governance-only diff; baseline functionality unchanged.

## Phase 1 — Canonical routing and machine-readable policy
- [x] Add `AGENTS.md`.
- [x] Add `SAFRS_SPEC.md` and `SECURITY.md`.
- [x] Add `.safrs/policy.json`, `sensitive-paths.json`, `document-registry.json`, and `tool-inventory.json`.
- [x] Run local SAFRS checks.

**Exit:** `bash scripts/safrs-verify.sh` passes.

## Phase 2 — CI enforcement
- [x] Add `.github/workflows/safrs-governance.yml`.
- [ ] Make `SAFRS Governance` a required PR check.
- [ ] Enable default-branch protection/ruleset: PR required, force-push disabled, required checks enabled.
- [ ] Configure R2/R3 ownership in actual `.github/CODEOWNERS` using real team/user handles.

**Exit:** PR touching governance/sensitive paths is detected and cannot bypass required review policy.

## Phase 3 — Repository security settings
- [ ] Enable secret scanning and push protection if plan/license supports it.
- [ ] Enable dependency graph/dependency review where supported.
- [x] Audit the supplied GitHub Actions workflow permissions; it uses `contents: read`.
- [x] Pin every current third-party Action to a full commit SHA.
- [ ] Replace long-lived cloud CI credentials with OIDC/short-lived credentials where supported.

**Exit:** no agent/coding workflow requires production secrets.

## Phase 4 — Project capsules and adapters
For each active product/module:
- [x] Add a neutral nested `AGENTS.md` template; no fictional active product capsule was created.
- [x] Add capsule README and architecture/data/testing templates.
- [x] Add thin Gemini, Cursor, and GitHub Copilot adapters.
- [x] Keep adapters as pointers without duplicated SAFRS risk or security policy.

**Exit:** an agent can enter a project and identify objective, boundaries, commands, tests, and prohibited actions without reading the entire repo.

## Phase 5 — Isolation and multi-agent execution
- [x] Require one worktree per concurrent mutation task in machine-readable policy.
- [x] Require every activated capsule to identify shared mutable dev resources.
- [x] Require isolation or serialization of conflicting R2/R3 test resources.
- [x] Adopt the task state/handoff protocol.

**Exit:** two agents can work concurrently without sharing uncontrolled mutable state.

## Phase 6 — Domain controls
- [x] Add executable architecture tests for the current governance/topology boundaries.
- [ ] Add business/security invariant tests for high-value flows.
- [x] Add R3 designation for safety-critical/production-execution surfaces in capsule policy; actual domain paths must be registered when created.
- [ ] Add deployment separation and approval evidence where applicable.

**Exit:** deterministic critical invariants fail closed in CI.

## Phase 7 — Conformance
- [x] Declare current level: Core.
- [x] Record platform/domain gaps without creating speculative product controls.
- [x] Close this plan after local integration and evidence acceptance.

## Acceptance criteria
- No existing feature removed or behavior intentionally changed by SAFRS bootstrap.
- Root routing is authoritative and vendor-neutral.
- R0–R3 risk tiers are machine-readable and documented.
- Verification-control changes are automatically elevated.
- Sensitive path changes are surfaced in CI.
- Documentation registry integrity is automated.
- Agent execution cannot rely on production credentials.
- Parallel mutation has an isolation protocol.
- R3 actions cannot be self-authorized by an agent.
