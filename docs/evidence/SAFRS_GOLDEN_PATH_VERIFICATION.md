# SAFRS golden-path verification evidence

## Goal

Provide a verifiable, non-deploying SAFRS v1.1 monorepo baseline that helps Chief run a typed local Database → API → Web journey with safe setup, one-command development, and optional capabilities left uninstalled.

## Assumptions and scope

- Verification uses only the declared local PostgreSQL/test resources and no production credential or deployment action.
- `pnpm db:reset` is intentionally excluded: Chief has not supplied the repository's required explicit reset authorization.
- SAFRS governance, package/dependency, migration, API, CI, and instruction changes are R2 and require independent review.
- GitHub repository administrator settings are outside the local checkout and are recorded as gaps rather than assumed complete.

## Requirement-to-evidence matrix

| Acceptance criterion | Primary implementation evidence | Fresh verification evidence |
|---|---|---|
| One documented local setup | `scripts/setup.mjs`, root `README.md` | Final gate recorded below |
| Readable prerequisite diagnosis | `tools/doctor/` and its tests | Final gate recorded below |
| One-command local development | `scripts/dev.mjs`, `turbo.json` | Final gate recorded below |
| Zod → Hono → inferred client | `packages/schemas/`, `packages/api/`, web app | Contract/type checks below |
| Frontend detects API drift | `tests/contracts/hono-rpc-contract.test.ts` | Contract/type checks below |
| Safe environment failure | `packages/env/`, contract tests | Test and CI checks below |
| Hygiene and database DX | `.husky/pre-commit`, Biome, `packages/database/`, root `db:*` commands | Targeted/root checks below |
| Unsafe reset rejected | `packages/database/src/reset-guard.ts` | Existing guard test; reset execution remains consent-gated |
| Governed project creation | `tools/project-wizard/` tests | Root test suite below |
| Optional capability packs remain uninstalled | `tools/capabilities/` manifests and tests | Root test suite below |
| PR-only Renovate and non-deploy CI | `.github/renovate.json`, `.github/workflows/ci.yml`, policy tests | Governance/automation checks below |
| Full local quality gate and retained SAFRS capability | `tools/safrs/`, `FEATURE_COVERAGE.md`, this registry | Final gate recorded below |

## Verification results

All commands below ran on 2026-08-10 against the integrated local tree, using only safe local/test resources. No command printed `.env` values, ran `pnpm db:reset`, pushed, merged, or deployed.

| Command | Exit | Observation |
|---|---:|---|
| `pnpm run doctor` | 0 | Node 24, pnpm, Git, Docker, root environment, disposable local PostgreSQL, and Prisma client were all ready. |
| `pnpm run governance` | 0 | Policy, document registry, routing, tool inventory, topology, immutable Actions pins, sensitive classification, and architecture/governance tests passed; it correctly classified the accumulated work as R2. |
| `pnpm lint` | 0 | Biome checked 108 files with no fixes needed. |
| `pnpm typecheck` | 0 | All 6 TypeScript workspace typecheck tasks completed. |
| `pnpm test` | 0 | Root contract suite passed 7 tests; all 9 package test tasks passed. The database suite reported its consent/selection-gated seed integration cases as skipped, while its local tooling and reset-guard tests passed. |
| `pnpm build` | 0 | All build tasks completed; Next.js 16.2.12 produced the optimized web build with Partial Prerendering. |
| `pnpm test:e2e` | 0 | Prisma migrated and seeded a unique `safrs_e2e_*_test` database; Playwright passed the one golden browser journey. |
| `pnpm check` | 0 | Re-ran governance, lint, typecheck, test, and production build successfully. |
| `powershell -ExecutionPolicy Bypass -File scripts/safrs-verify.ps1` | 0 | Native Windows SAFRS entry point passed. |
| `bash scripts/safrs-verify.sh` | 0 | Git Bash SAFRS entry point passed after portable Python resolution was added and regression-tested. |
| `python tests/architecture/test_safrs_topology.py` | 0 | 5 routing/topology assertions passed, including nearest agent routers and portable shell verification. |
| `MANIFEST.txt` count + checksum scope (HEAD `2688b23`) | 0 | `MANIFEST.txt` lists 208 tracked files; every listed file exists and its SHA-256 matches `SHA256SUMS.txt`, verified after `a65fdb6`. |

The commands above the manifest row ran at the integrated tree around commit `3e83f01`. After `a65fdb6` and `2688b23` (documentation and governance-inventory closure, no runtime code), the root suite has not been re-executed; the recorded fresh post-closure checks are `pnpm run governance` and the manifest/checksum validation reported in the final row.

## Review status

The accumulated change is R2 because it includes shared contracts, database/migration tooling, dependencies, CI, agent routing, and governing verification. The consolidated final Sol review returned `fix-first` with five findings: ledger references to ignored report files, root dependency/CI/verifier paths not classified as R2, Renovate missing from the tool inventory, lifecycle links pointing at the active plan after it moved to completed, and checksums generated from an uncommitted working tree. All five findings were closed in commit `a65fdb6` under Chief's explicit authorization for this closure round, without requesting a re-review. The `MANIFEST.txt` scope covers 208 tracked files, and the regenerated `SHA256SUMS.txt` matches that committed manifest scope.

## Conformance and gaps

**Achieved level:** SAFRS Core. The repository has local machine-enforced governance, risk classification, routing, control inventory, CI configuration, and the verified golden path. It does not claim SAFRS Controlled or higher without external GitHub ruleset/branch-protection evidence and real R2 reviewer identities.

Open human/platform actions:

1. Add real `.github/CODEOWNERS` identities and require their review for R2 paths.
2. Configure GitHub branch protection/rulesets to require pull requests and SAFRS Governance.
3. Enable secret scanning, push protection, dependency security, and OIDC/short-lived cloud credentials where available.
4. Add domain-specific R3 invariants only when a real regulated, financial, healthcare-critical, or production capability is authorized.
