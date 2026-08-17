# MONOREPO GROUND TRUTH BASELINE v1

**Plan:** `docs/plans/active/MASTER REMEDIATION PLAN — SENTRA MONOREPO.md`
**Baseline type:** Factual Phase 0A evidence
**Observed:** 2026-08-17
**Repository:** `D:\DEV\Monorepo`
**Observed HEAD:** `124e9e08bbb2b0f1ec89dfb1ac0292cb29b47c62`
**Branch:** `main`
**Freshness:** Local observations are fresh at capture time; historical claims are labeled.
**Mutation authority:** Chief approved this evidence artifact. It does not authorize remediation implementation.

## 1. Decision state

| Decision | Approved state | Evidence/status |
| --- | --- | --- |
| D-001 visibility | `PUBLIC` | GitHub API reports `public`; matches Chief decision |
| D-002 platform authority | R0 read-only; R1 machine verification; R2 explicit Chief authorization; R3 explicit human authorization | Chief approved proposed model |
| D-003 Renovate | All dependency updates may automerge after CI passes | Chief approved; local config does not yet match |
| D-004 R2 authorization | Implementation → fresh verification → evidence package → Chief review → explicit authorization → merge | Chief approved proposed flow |

## 2. Git state

- Repository root: `D:/DEV/Monorepo`.
- Branch: `main`.
- Local HEAD: `124e9e08bbb2b0f1ec89dfb1ac0292cb29b47c62`.
- Remote: `origin` at `https://github.com/drferdii/Monorepo-safrs.git`.
- Local `main` was observed ahead of `origin/main` by 1 and later ahead by 1, behind by 11; this divergence must be reconciled before merge planning.
- Working tree is dirty with 26 paths reported by `pnpm status --json`.
- Dirty state includes pre-existing modified, deleted, and untracked files. This baseline does not assign ownership to those files.
- No staged diff was reported by the Phase 0A Git capture.

## 3. Worktree state

| Path | Branch | HEAD |
| --- | --- | --- |
| `D:/DEV/Monorepo` | `main` | `124e9e08bbb2b0f1ec89dfb1ac0292cb29b47c62` |
| `D:/DEV/Monorepo.worktrees/feat-control-center` | `feat/control-center` | `4e07ddf39bbb0577aae13c9654ef5c18b5463894` |
| `D:/DEV/Monorepo.worktrees/fix-db-100-ready` | `feat/database-100-ready` | `a805bf40d1eaf5c350013b9ee8449018bb98cead` |
| `D:/DEV/Monorepo.worktrees/governance-cc-agents` | `governance/control-center-agents` | `30bdcef915f655453301dfdcefc03ade754ead06` |

## 4. Task and lease state

- `TASK-20260813-CONTROL-CENTER` is `EXECUTING`, risk `R2`, owner `agent:claude:root`, worktree `worktrees/feat-control-center`.
- Its active scope includes `projects/control-center/`, `docs/`, `tools/doctor/`, `package.json`, and `pnpm-workspace.yaml`.
- This active `docs/` ownership blocks a new governance reconciliation claim over the untracked Master Plan until the existing task is reconciled by its owner or Chief-authorized lifecycle action.
- Local lease chain for `TASK-20260813-CONTROL-CENTER` is valid with fencing token 1; remote reconciliation is not recorded.
- `pnpm status --json` reports ownership structurally OK but governance `FAIL`.

## 5. Platform state

- GitHub repository: `drferdii/Monorepo-safrs`.
- Visibility: `PUBLIC`; default branch: `main`.
- Branch protection: not configured; API returned `Branch not protected`.
- Repository rulesets: no ruleset returned by the observed API query.
- GitHub Actions: enabled; allowed actions `all`; SHA pinning required `false`.
- Secret scanning and push protection: enabled.
- Dependabot security updates: enabled.

## 6. Runtime state

- Docker `29.6.2`, Node.js `24.18.0`, pnpm `11.21.0`, Python `3.14.7`, GitHub CLI `2.97.0` available.
- `docker compose ps` returned no running containers.
- No listeners were observed on ports `3000`, `3001`, `3100`, `5432`, `16686`, or `4318`.

## 7. Renovate state

- `renovate.json` exists.
- Global `automerge` is `false`.
- A package rule currently sets patch/minor `automerge` to `true`, `automergeType` to `pr`, and `platformAutomerge` to `false`.
- Current configuration does not implement Chief-approved all-dependency automerge after CI passes.
- No Renovate configuration was changed during Phase 0A.

## 8. Verification baseline

| Command | Result | Freshness/notes |
| --- | --- | --- |
| `pnpm lint` | `FAIL` | Fresh local run; 402 errors, 17 warnings, 2 infos |
| `pnpm typecheck` | `PASS` | Fresh local run; 8/8 tasks, 7 cached task results |
| `pnpm test` | `PASS` | Fresh local run; 15/15 tasks, 14 cached task results |
| `pnpm check` | `FAIL` | Governance task-ownership failure; downstream check chain stopped |
| `pnpm build` | `FAIL` | Golden Path rejected missing `APP_URL`, `DATABASE_URL`; Control Center build succeeded in observed run |
| `scripts/safrs-verify.ps1` | `FAIL` | Initial governance checks passed; task ownership failed |

Governance failure:

```text
changed path has no active owner in main:
docs/plans/active/MASTER REMEDIATION PLAN — SENTRA MONOREPO.md
```

## 9. Contradiction register

| Boundary | Observed contradiction |
| --- | --- |
| Decision ≠ configuration | D-003 approves all-dependency automerge after CI; `renovate.json` only automerges patch/minor |
| Repository ≠ governance | Dirty untracked Master Plan has no active owner; governance fails closed |
| Repository ≠ runtime | Docker/PostgreSQL/app services are not running despite source and workflow files existing |
| Verification ≠ freshness | Typecheck and test include cached task results; service-dependent freshness still requires explicit integration runs |
| Documentation ≠ current state | Active documents and task state describe work in flight not reconciled with current dirty checkout |
| Main ≠ remote | Local `main` is divergent from `origin/main` and must not be merged or rebased implicitly |

## 10. Phase 0A conclusion

Material uncertainty is reduced for Git, worktrees, task state, GitHub state, runtime state, verification state, and contradictions. Phase 0A evidence is complete pending Chief review of this artifact.

Next authorized actions:

1. Keep `RECONCILE-GOVERNANCE` and `RECONCILE-RENOVATE` planned/blocked until scopes and worktrees are valid.
2. Reconcile active `TASK-20260813-CONTROL-CENTER` ownership before touching the untracked Master Plan under `docs/`.
3. Open a separate R2 worktree and claim for Renovate only after baseline acceptance and task-contract registration.
4. Do not start Phase 1 implementation yet.

## 11. Addendum — 2026-08-17 ownership reconciliation

- `TASK-20260813-CONTROL-CENTER` closed at `2026-08-17T10:18:41Z`.
- After that close and before this claim, `docs/` had no active owner.
- `TASK-20260817-RECONCILE-GOVERNANCE` now owns only the six authorized files listed in this task claim.
- The 2026-08-17 observational body above remains a Phase 0A snapshot and is not rewritten.
- `RECONCILE-RENOVATE` remains unopened.
