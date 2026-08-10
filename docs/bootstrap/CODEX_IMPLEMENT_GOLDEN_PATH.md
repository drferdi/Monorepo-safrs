# Codex Prompt — Implement the SAFRS Solo-Developer Golden Path

You are working directly in `D:\DEV\Monorepo`.

## Goal

Implement the approved SAFRS v1.1 solo-developer golden path end to end. The default stack is Next.js, Hono RPC, Zod, PostgreSQL, and Prisma. Python is permitted only when a written technical requirement demands it. Electron, WXT, Stripe, email, and AI remain optional capabilities. Renovate is pull-request-only.

The primary user is a non-coding solo developer. Optimize every operator workflow for one obvious command, plain Indonesian diagnostics, safe automatic recovery, and AI-readable technical evidence.

## Mandatory read order

Read these files completely before changing code:

1. `00_READ_FIRST.md`
2. `02_OBJECTIVES.md`
3. `03_ARCHITECTURE.md`
4. `04_CONTEXT.md`
5. `05_ENGINEERING.md`
6. `06_CODING.md`
7. `07_DOCUMENTATION.md`
8. `08_DECISIONS.md`
9. `09_PRODUCTS.md`
10. `11_RESPONSE_STANDARDS.md`
11. `AGENTS.md`
12. `SAFRS_SPEC.md`
13. `SECURITY.md`
14. `FEATURE_COVERAGE.md`
15. `docs/governance/SAFRS_PROJECT_CAPSULES.md`
16. `docs/governance/SAFRS_MULTI_AGENT_PROTOCOL.md`
17. `docs/superpowers/specs/2026-08-10-solo-dev-golden-path-design.md`
18. `docs/superpowers/plans/2026-08-10-solo-dev-golden-path-implementation.md`

Then read the nearest nested `AGENTS.md` before modifying an app, package, tool, or project capsule.

## Required workflow

1. Create or resume one explicit goal covering the complete objective.
2. Inspect `git status` and treat all existing uncommitted content as user-owned.
3. Preserve all SAFRS bootstrap capabilities and checks.
4. Classify each implementation task using `.safrs/policy.json`.
5. Execute every task in the approved implementation plan in order.
6. Use test-driven development: failing focused test, minimal implementation, passing test, then integration verification.
7. Keep changes scoped to the task's owned files and review the diff before each commit.
8. Use stable/Active-LTS dependencies only; verify current official release information and package compatibility before locking versions.
9. Never add a speculative product feature.
10. Never configure production deployment, production secrets, real financial activity, or real external messages.

## Sol Advisor pattern

If the exact Sol Advisor compatibility lane is observable:

1. Run the shipped non-mutating agent preflight and require success.
2. Use `sol_advisor_terra_implementer` for implementation tasks.
3. Keep architecture, task specification, primary verification, and acceptance in the parent task.
4. Before consequential architecture or security boundaries, request a fresh `sol_advisor_sol_reviewer` verdict.
5. After implementation and primary verification, request a fresh read-only final review returning exactly `ship`, `fix-first`, or `rethink`.
6. Do not substitute another role, model, or effort if the exact lane fails.

## Non-negotiable outcomes

- `pnpm run setup` safely prepares the repository.
- `pnpm run doctor` diagnoses prerequisites and prints plain Indonesian recovery steps without secrets.
- `pnpm dev` starts the local database and default development application without manually coordinating terminals.
- Hono RPC types flow from Zod-validated backend contracts into the frontend.
- Missing required environment variables fail locally and in CI with readable errors.
- PostgreSQL/Prisma studio, generate, migrate, seed, and guarded reset commands work.
- Biome and Husky provide fast staged-file hygiene.
- The project wizard creates a complete SAFRS capsule through preview-before-write.
- Optional capability manifests exist without installing unselected runtimes.
- Renovate never auto-merges.
- CI uses immutable action SHAs and performs no production deployment.
- Root and nested agent instructions remain concise routers to canonical policy.
- Deployable applications live under `projects/<project>/apps/*`, product-neutral shared capabilities under `packages/*`, and repository-wide tooling under `tools/*`; do not introduce root `apps/*` or `tooling/*` trees.

## Verification

Do not claim completion until all relevant commands have actually passed:

~~~text
pnpm run doctor
pnpm run governance
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm check
git diff --check
~~~

Also prove:

- an unsafe `DATABASE_URL` is rejected by `pnpm db:reset`;
- a missing required environment variable fails without exposing its value;
- a temporary API contract change causes the expected frontend type error;
- the project wizard preview performs no writes and its applied temporary capsule passes topology validation;
- unselected email, Stripe, AI, Electron, WXT, and Python runtime dependencies are absent.

Run the SAFRS checks directly as part of the evidence:

~~~text
powershell -ExecutionPolicy Bypass -File scripts/safrs-verify.ps1
python tools/safrs/check_actions_pinning.py
python tools/safrs/check_sensitive_changes.py
~~~

## Final evidence

Create `docs/evidence/SAFRS_GOLDEN_PATH_VERIFICATION.md` containing:

- goal;
- assumptions;
- exact commits and files created/changed;
- requirement-to-evidence matrix;
- commands, exit status, and concise observed results;
- dependency versions;
- achieved SAFRS conformance;
- independent review verdict and observed isolation;
- unresolved gaps;
- safe next actions.

Do not add a remote, push, open a pull request, merge, or deploy unless Chief separately authorizes it.
