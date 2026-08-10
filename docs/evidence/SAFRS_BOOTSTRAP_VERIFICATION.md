# SAFRS v1.1 Bootstrap Verification Evidence

## Record

- Task ID: `SAFRS-BOOTSTRAP-20260809`
- Date: 2026-08-09
- Objective: build `D:\DEV\Monorepo` as a new SAFRS v1.1 agent-first monorepo without speculative product features.
- Source: `D:\DEV\SAFRS-v1.1-bootstrap\safrs-v1.1-bootstrap`
- Target: `D:\DEV\Monorepo`
- Task state at capture: REVIEW
- Risk tier: R2 because governance, CI, policy, and governing verification changed together.

## Assumptions and baseline

- The requested bootstrap root was the nested `safrs-v1.1-bootstrap` directory inside the supplied outer directory.
- The target directory existed but was empty and had no Git metadata.
- No product code, dependency manifest, runtime configuration, build, lint, type-check, or product test command existed.
- `main` is the initialized default branch.
- Real GitHub organization/team handles were not verifiable, so `CODEOWNERS.example` was preserved rather than fabricating `.github/CODEOWNERS`.

## Integrity and preservation

- All 38 source bootstrap files passed the supplied `SHA256SUMS.txt` before copying.
- A source-to-target path comparison reported no missing bootstrap file.
- Every bootstrap governance capability remains represented; additions extend topology and enforcement without removing or weakening supplied controls.
- `MANIFEST.txt` is the exact final repository file inventory (excluding Git metadata and the checksum file itself).
- `SHA256SUMS.txt` was regenerated for the final manifest and validated successfully after all repository changes.

## Implemented repository capabilities

- Canonical root router, constitution, SAFRS specification, and security policy.
- Machine-readable R0–R3 policy, sensitive paths, document registry, tool/network inventory, resource bounds, and worktree isolation requirements.
- R3 override enforcement for production and safety-critical paths with an integration regression test.
- GitHub Actions governance scaffold with read-only contents permission and immutable action SHA.
- Project capsule convention and neutral capsule template with nested routing, architecture/data/testing context, source, and tests.
- Shared `packages/`, `tools/`, `tests/`, and `scripts/` conventions.
- Thin Gemini, Cursor, and GitHub Copilot adapters pointing to canonical policy.
- ADR, active/completed/archived plan, and evidence lifecycle directories.
- Bash and native Windows PowerShell verification entry points.
- Deterministic policy, document, routing, tool inventory, topology, action pinning, sensitive-change, architecture, and risk-classification checks.

## Verification results

| Verification | Result |
|---|---|
| Supplied bootstrap `sha256sum -c SHA256SUMS.txt` | PASS, 38/38 files |
| Baseline `bash scripts/safrs-verify.sh` after raw copy | PASS |
| Final `bash scripts/safrs-verify.sh` | PASS |
| Final `powershell -ExecutionPolicy Bypass -File scripts/safrs-verify.ps1` | PASS |
| Architecture invariant tests | PASS, 2 tests |
| R3 classification integration test | PASS, 1 test |
| GitHub Action full-SHA pinning | PASS |
| Document registry integrity | PASS |
| Source bootstrap path preservation comparison | PASS, no missing paths |
| Final adapted `sha256sum -c SHA256SUMS.txt` | PASS |

The working tree classifier reports `SAFRS_RISK=R2` and `SAFRS_VERIFICATION_INTEGRITY_REVIEW=required`, which is the expected classification for this bootstrap.

## Conformance

Achieved: **SAFRS Core**.

Controlled is not claimed until the repository is connected to GitHub and an administrator provides evidence for required PR checks, protected `main`, force-push prevention, and real CODEOWNERS review. Secure and Regulated remain intentionally unclaimed; their platform and domain prerequisites do not exist in this local empty-product repository.

## Unresolved gaps and human actions

1. Create/connect the GitHub repository and require the `SAFRS Governance` check on protected `main`.
2. Replace placeholder ownership entries with verified organization users/teams and create `.github/CODEOWNERS`.
3. Enable secret scanning, push protection, dependency security, and rulesets where supported.
4. Configure OIDC/short-lived credentials only when real deployment workflows exist; do not add production secrets to coding workflows.
5. Add real project capsules and domain-specific architecture/business/security invariants only when product scope is authorized.
6. Sol Advisor native delegation/review was unavailable because its setup gate returned `PLUGIN_DATA must be private (no group/world permission bits)`. No alternate agent was misrepresented as Sol; local acceptance used fresh primary-session verification.

## Next permitted action

Human/code-owner review of this R2 bootstrap, followed by an initial commit and remote platform configuration when repository ownership details are available.
