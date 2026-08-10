# SAFRS v1.1 Feature Coverage

This file maps every major capability from the design discussion to an implementation artifact.

| Capability | Implemented in |
|---|---|
| Human-Governed · Agent-Executed · Machine-Enforced model | `SAFRS_SPEC.md`, `AGENTS.md` |
| Six layers L0–L5 | `SAFRS_SPEC.md` §3 |
| Trust boundary / least privilege | `SAFRS_SPEC.md` §3, §8; `.safrs/policy.json` |
| No production credentials for coding agents | `AGENTS.md`, `SECURITY.md`, `.safrs/policy.json` |
| Vendor-neutral canonical policy | `SAFRS_SPEC.md` §5; `AGENTS.md` |
| Thin agent adapters | `GEMINI.md`; Cursor/OpenCode consume `AGENTS.md` directly |
| Project capsules / nested AGENTS | `SAFRS_SPEC.md` §4; `SAFRS_PROJECT_CAPSULES.md`; `projects/_template/`; topology check |
| Agent roles independent of model/vendor | `SAFRS_SPEC.md` §6; `SAFRS_AGENT_PERMISSIONS.md`; policy JSON |
| R0–R3 risk tiers | `SAFRS_SPEC.md` §7; control matrix; policy JSON; R3 classifier overrides and integration test |
| Human approval for R3 | `SAFRS_SPEC.md` §7/§18; policy JSON |
| Risk-tiered autonomy | control matrix + PR template |
| Multi-agent state machine | `SAFRS_MULTI_AGENT_PROTOCOL.md` |
| Single mutation owner per bounded scope | `SAFRS_MULTI_AGENT_PROTOCOL.md` |
| Worktree isolation | spec §10; implementation Phase 5 |
| Isolation of DB/cache/queue/ports/shared state | spec §10; implementation Phase 5 |
| Executable governance | spec §11; scripts + CI workflow |
| Architecture/security/business invariant tests | spec §11; `tests/architecture/test_safrs_topology.py`; product-specific invariants added with real capsules |
| Sensitive path classification | `.safrs/sensitive-paths.json`; `check_sensitive_changes.py` |
| Verification gaming protection | spec §12; sensitive classifier; PR template |
| Documentation lifecycle | spec §13; document lifecycle doc; document registry check |
| Canonical/Active/Historical/Superseded/Archived classes | document lifecycle + registry |
| ADR and execution-plan lifecycles | spec §13; lifecycle doc |
| Completed bootstrap implementation record | `docs/plans/completed/SAFRS_BOOTSTRAP_IMPLEMENTATION.md` |
| Prompt/context injection boundary | `AGENTS.md`, `SECURITY.md`, spec §14 |
| Tool/MCP poisoning controls | spec §15; `.safrs/tool-inventory.json`; tool inventory check |
| Network + data exfiltration considerations | spec §8/§15; deny-unless-authorized inventory policy |
| Supply-chain controls | `SECURITY.md`, spec §15, action pinning check |
| Full-SHA GitHub Action enforcement | `check_actions_pinning.py` + CI |
| Secret scanning / push protection | `SECURITY.md`; implementation Phase 3 |
| OIDC/short-lived CI credentials | spec §16; implementation Phase 3 |
| Runaway agent / cost / retry limits | spec §17; policy JSON |
| Auditability | core invariant SAFRS-09; R2/R3 controls |
| Human deep system comprehension | spec §18 |
| Conformance Core/Controlled/Secure/Regulated | spec §19; conformance doc |
| Minimal-scope/no-regression adoption | implementation plan Phase 0 + acceptance criteria |
| Local one-command verification | `scripts/safrs-verify.sh` |
| Native Windows verification adapter | `scripts/safrs-verify.ps1` |
| CI governance gate | `.github/workflows/safrs-governance.yml` |
| CODEOWNERS scaffold | `.github/CODEOWNERS.example` |
| PR risk/verification template | `.github/pull_request_template.md` |

## Solo-developer golden path

| Capability | Implemented in |
|---|---|
| Single-command local workflow | `pnpm run doctor`, `pnpm run setup`, and `pnpm dev` via `tools/doctor/`, `scripts/setup.mjs`, and `scripts/dev.mjs` |
| End-to-end typed Database → API → Web contract | `packages/schemas/`, `packages/api/`, `projects/golden-path/apps/web/`, and contract tests |
| Build-time environment validation | `packages/env/` using T3 Env and Zod |
| Local PostgreSQL/Prisma seed, Studio, and reset guard | `packages/database/`, `compose.yaml`, and root `db:*` scripts |
| Fast staged code hygiene | `.husky/pre-commit`, Biome, and `tests/repository/precommit.test.mjs` |
| Browser golden journey | Playwright configuration and `projects/golden-path/apps/web/e2e/` |
| Optional capability selection without baseline bloat | `tools/capabilities/` manifests for email, Stripe, AI, Electron, WXT, and Python |
| PR-only dependency updates | `.github/renovate.json`, `.safrs/tool-inventory.json`, and `tests/repository/automation-policy.test.mjs` |
| Non-deploying full CI | `.github/workflows/ci.yml` with immutable action SHAs |
| Reusable AI implementation context | `AGENTS.md`, nearest boundary routers, and `CODEX_IMPLEMENT_GOLDEN_PATH.md` |
