# AGENTS.md - SAFRS v1.1 Repository Briefing

## Identity And Boundaries
Reduce Gaffer's workload through an optional AI control plane, never a capsule lifecycle dependency. Authority: explicit human input > L1 Constitution/[SAFRS](SAFRS_SPEC.md) > [approved purpose](docs/architecture/MONOREPO_PURPOSE.md) > root AGENTS > nested AGENTS > task docs > low-impact assumptions. Report conflicts immediately; canonical purpose overrides legacy patterns.

Capsules at `projects/<domain>/<capsule>/` own their toolchain, lockfile, configuration, tests, and lifecycle. Domain folders hold only `AGENTS.md`/`README.md`, never application code. Root workspace/catalog/lockfile/configuration/paths/scripts/tools/packages/infrastructure and cross-capsule source/path imports or links are forbidden lifecycle dependencies, including runtime, build, test, and deploy. Reuse capsule-local code or pinned versioned artifacts. Existing coupling is non-conformance, not precedent, even when documented; root has no demonstrator. Sentra tokens: local snapshot or pinned artifact, never root `packages/token`; see `docs/design-system/reference/`.

[Capsule contract](docs/governance/SAFRS_PROJECT_CAPSULES.md): run argv `[program, args]` from the capsule root. `install`, `build`, `test`, `run`, `deployDryRun` must pass (dry-run without side effects); only `lint`/`typecheck` permit `N/A` with non-empty justification. Require structural AND isolated extraction proof; extraction is decisive.

## Commands
Root: pnpm **11.21.0**, Node **>=24.18.0 <25**; capsules use their own declared versions.

- Optional root diagnostics/setup: `pnpm run doctor` -> `pnpm run setup` -> `pnpm dev`; never capsule prerequisites.
- Root/governance/cross-project merge gate: `pnpm run governance` (cross-platform), or `bash scripts/safrs-verify.sh`; not full quality verification.
- Full root quality: `pnpm check` = governance -> check:tokens -> lint -> typecheck -> test -> build. CI adds checks and explicit package exclusions; root checks do not prove excluded-capsule quality.
- Focused repository test: `node --test tests/repository/workspace-config.test.mjs`; substitute existing paths for other focused tests.
- Capsules: local verification first; `pnpm project:status` discovers structural status; `pnpm project:verify <domain/capsule>` proves extraction by running installs/lifecycle commands, not read-only analysis.
- Root `pnpm test` enables database integration; configure a disposable database (`DATABASE_URL`). Never print environment values or prescribe destructive resets.

## Execution Safeguards
- Autonomously perform scoped, reversible local engineering, tools/tests/builds, local services, and disposable migrations; never make Gaffer a terminal operator or housekeeping approver.
- One writer per bounded scope; isolate worktrees under `../Monorepo.worktrees/<branch-name>`, never inside this repo. Stop conflicting-path mutations; resolve ownership. Document stale/orphan evidence before `SUPERSEDED`. Record inherited failures, compare delta, prevent regressions, proceed.
- Risk: R0 read-only; R1 reversible local; R2 boundary changes (dependencies/APIs/auth/migrations/CI/governance/token schema), reviewed per boundary package; R3 production data/infrastructure/credentials/deployments, irreversible data mutations, and safety/clinical logic require prior explicit Gaffer approval. Escalate material scope creep, canonical ambiguity, active collisions, and high-impact operations, not deterministic housekeeping. See `.safrs/policy.json`; no self-approval of verification-control integrity.
- Ask and wait for Gaffer's approval for **each** merge, including pull, fast-forwarding `main`, and PR merge; "go", "merge it", or any clear agreement in the current conversation approves that merge only. Never enable auto-merge. Codex: without `~/.codex/rules/safrs-merge.rules`, or for fast-forwarding `main`, stop; Gaffer performs the merge. Publication requires separate authority under [.agents/BOUNDARIES.md](.agents/BOUNDARIES.md); missing gates never imply permission.
- Agent commits require `Co-Authored-By: <Agent/Vendor> <email>`.
- Windows: RTK may filter `git`; use `git.exe` for raw diffs. Check `git.exe diff --ignore-cr-at-eol --stat` before treating edits as substantive; never discard others' work.

## Jev Decision Layer
All agents: call `jev_route` before first web search/browse, subagents, failed-approach retries, consequential/approval-needing actions, or materially different routes; skip simple answers, calculations, routine edits, or `bypass jev`. Send no secrets; [setup](tools/typesafe-jev/README.md). Honor actions only for live `jev_used: true`, `mode: active`; errors/timeouts use the normal safe path. Jev cannot authorize secret exposure, permission changes, production, or irreversible actions.

Review first 20-50 active decisions; demote/rewrite below 9/10 high-confidence accuracy, below 90% over at least 30 decisions, or when cost/latency exceeds gated work.

## Memory And Reporting
ADR 0007 decision 7: capsule work reads its `.agents/HANDOFF.md`, then `CONTEXT.md` first; overwrites its HANDOFF and appends capsule-only DECISIONS. Update every touched scope's HANDOFF; capsule-only changes need no root handoff. Root `.agents/*` is control-plane only, updated by scope workers only for explicit repo coordination. Preserve others' open claims. Lifecycle: [SAFRS](SAFRS_SPEC.md#9-multi-agent-protocol); plans in `docs/plans/active/`, completed in `docs/plans/completed/`; architecture decisions in ADRs.

Chat: Bahasa Indonesia/English ~70:30; address **Gaffer** (or **Doc**); never *kamu, elu, elo, gua, gue*. Repository docs: English. End final reports with actual model/tier and directly observed verification only:
```text
Orchestrator: <model> <reasoning tier>
Worker: <model> <reasoning tier|none>
Result: <Success|Partial|Blocked> / <Verified|Unverified>
```

## Context Hydration & Read Order
<!-- SAFRS:ROUTING:BEGIN -->
_Generated from `.safrs/document-registry.json`. Do not edit by hand;
edit the registry, then run `python tools/safrs/generate_routing.py`._

Read only the context required for the task.

**Always (MUST), in order:**

1. `.agents/knowledge/00_READ_FIRST.md`
2. `.agents/HANDOFF.md`
3. `.agents/BOUNDARIES.md`
4. `.agents/knowledge/02_OBJECTIVES.md`
5. `.agents/knowledge/04_CONTEXT.md`
6. `.agents/knowledge/12_LESSONS.md`

**Always (SHOULD):** `.agents/knowledge/01_COLLABORATION.md`, `.agents/knowledge/11_RESPONSE_STANDARDS.md`, `SAFRS_SPEC.md`, `.agents/CONTEXT.md`

**Task-scoped (SHOULD):**

- `task:architecture` → `.agents/knowledge/03_ARCHITECTURE.md`, `docs/architecture/MONOREPO_PURPOSE.md`
- `task:decision` → `.agents/knowledge/08_DECISIONS.md`, `.agents/DECISIONS.md`
- `task:documentation` → `.agents/knowledge/07_DOCUMENTATION.md`
- `task:governance` → `docs/governance/AGENT_AUTONOMY_MODEL.md`, `docs/governance/SAFRS_OPERATIONAL_SOP.md`
- `task:implementation` → `.agents/knowledge/05_ENGINEERING.md`, `.agents/knowledge/06_CODING.md`, `docs/governance/CAPSULE_SOVEREIGNTY.md`
- `task:planning` → `.agents/PROGRESS.md`
- `task:product` → `.agents/knowledge/09_PRODUCTS.md`
- `task:review` → `.agents/knowledge/99_SELF_AUDIT.md`, `docs/governance/PURPOSE_DRIVEN_AUDIT.md`

**Reference (MAY):** `.agents/knowledge/10_GLOSSARY.md`, `docs/context/active/avery.context.md`, `docs/context/active/control-center.context.md`, `docs/context/active/golden-path.context.md`, `docs/context/active/portfolio-drnovia.context.md`, `docs/context/active/sentrabot.context.md`, `docs/context/shared/api-reference.context.md`, `docs/context/shared/architecture.context.md`, `docs/context/shared/design-system.context.md`

Then read the nearest nested `AGENTS.md` for the project/module being modified.
<!-- SAFRS:ROUTING:END -->
