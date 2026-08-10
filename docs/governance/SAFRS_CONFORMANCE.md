# SAFRS Conformance Levels

## Current repository declaration

**Declared level:** SAFRS Core
**Assessment date:** 2026-08-10
**Scope:** Local repository controls, the verified solo-developer golden path, and committed non-deploying CI scaffolding.

Core is achieved because canonical routing, R0–R3 policy, sensitive-path declaration, document registry, monorepo topology checks, tool inventory checks, and local governance verification are implemented. The golden path adds a typed database-to-browser reference journey, validated environment boundary, local-only data workflow, and deterministic verification without changing that declaration.

Controlled is not yet claimed. CI and Renovate configuration are committed, but it still requires evidence from the actual GitHub repository that branch protection/rulesets require pull requests and the SAFRS Governance check, plus real CODEOWNERS identities and designated R2 review enforcement.

Secure is not yet claimed. It additionally requires platform evidence for secret scanning/push protection, dependency security, approved network/tool permissions, and short-lived CI/deployment credentials where applicable.

Regulated is not claimed and must not be inferred until real regulated domains exist and their safety invariants, approvals, production identities, and evidence-retention requirements are implemented.

## Core
- Root AGENTS router.
- SAFRS policy and risk tiers.
- Sensitive-path declaration.
- Document registry.
- Local governance verification.

## Controlled
Core plus:
- PR CI governance checks.
- Protected default branch and required status checks.
- R2 code-owner/designated review.
- Verification-integrity escalation.

## Secure
Controlled plus:
- Worktree/runtime isolation policy.
- Secret scanning/push protection where available.
- Dependency/supply-chain controls.
- Scoped agent network/tool permissions.
- Short-lived CI credentials where supported.

## Regulated
Secure plus:
- Explicit R3 approval/evidence retention.
- Domain-specific safety/business invariants.
- Controlled production identities and deployment separation.
- Auditable incident/release procedures.
