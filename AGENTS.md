# AGENTS.md — SAFRS v1.1 Repository Router

## Mission & Core Principles
- **SAFRS v1.1:** Human-Governed · Agent-Executed · Machine-Enforced.
- Monorepo root is an optional AI control/automation plane; never a runtime, build, config, path, tooling, or infra dependency for capsules.
- Primary goal: Reduce Gaffer workload; never degrade Gaffer into a terminal operator or janitor.
- **Epistemic Principle:** Canonical architecture & approved purpose > Existing code patterns/git history. Violating legacy patterns are systemic non-conformance, not precedents.
- Authority order: (1) Explicit human input, (2) L1 Constitution/SAFRS, (3) `docs/architecture/MONOREPO_PURPOSE.md`, (4) Root `AGENTS.md`, (5) Nested `AGENTS.md`, (6) Task docs, (7) Low-impact assumptions. Report conflicts immediately.

## Language, Tone & Reporting
- Language: Bahasa Indonesia mixed with English (~70:30). Direct address: **Gaffer** (or **Doc**). Forbidden pronouns: *kamu, elu, elo, gua, gue*.
- Control Center: UI sidebar/titles in English; status/descriptions in concise Indonesian. Display original repo name alongside labels.
- Home Dashboard: **SAFRS Dashboard** (not "Overview"). Scope: Gaffer orchestration, product capsules, shared/standalone tools.
- Mandatory 3-line execution summary at final report end:
  `Orchestrator: <model> <reasoning tier>`
  `Worker: <model> <reasoning tier|none>`
  `Result: <Success|Partial|Blocked> / <Verified|Unverified>`
  *(Populate per active model/tier. Claim `Verified` only when verification execution is directly observed).*

## Topology & Capsule Standalone Contract
- Topology: `projects/<domain>/<capsule>/`. Domain directories (`healthcare`, `academic`, `corporate`, `internal`, `product`) store nav/docs only (`AGENTS.md`, `README.md`); application code is strictly prohibited.
- Capsule rules: `docs/governance/SAFRS_PROJECT_CAPSULES.md`. Shared/Tooling: `tools/` (repo tools), `tests/` (cross-project integration).
- Reusable logic: Pin via versioned external package or localize inside capsule. Never consume root `packages/` via source/path dependencies.
- **Independent Contract (Mandatory from capsule root via argv `[program, args]`):**
  - Must pass: `install`, `build`, `test`, `run`, `deployDryRun` (no side-effects). Cannot be `N/A`.
  - `lint` & `typecheck` may be `N/A` only with non-empty justification.
- **Capsule Invariants (Strict Isolation):**
  - Forbidden: Consuming root workspace, lockfile, catalog, configs, scripts, tools, or packages.
  - Forbidden: Cross-capsule imports or linking during runtime, build, test, or deploy.
- **Standalone Proof:** Must pass structural verification (paths/deps) AND empirical extraction verification (isolate capsule to temp dir + execute commands). Extraction pass is absolute ground truth.
- **Design Tokens:** Use Sentra tokens via local snapshot or pinned distributed package. Extractions must never resolve root `packages/token`. Ref: `docs/design-system/reference/`.

## Agent Behavior, Scope & Governance
- **Local Autonomy (Scoped Sandbox):** Unrestricted read/search, recoverable file edit/delete, run tools/linters/tests/builds, local docker/services, in-scope refactors, disposable migrations.
- **Escalate to Gaffer ONLY for:** Material scope creep, canonical ambiguity, active mutation collisions, R3/high-impact operations, prod credentials/access, prod deployments, irreversible real-data mutations, safety/clinical logic. Never escalate deterministic housekeeping.
- **Deterministic Resolution:**
  - *Stale/Orphan Claims:* Document evidence -> mark `SUPERSEDED` -> resume task.
  - *Inherited Failures:* Log baseline -> evaluate delta -> prevent new regressions -> proceed.
  - *Active Collision:* Halt mutations on conflicting path -> identify conflict -> resolve ownership. Single-writer applies per bounded scope, not globally.
- **Git Worktrees:** Create parallel worktrees strictly under `../Monorepo.worktrees/<branch-name>`. Never inside repo root.
- **Windows Shell Quirks:** A user-level RTK hook rewrites Shell `git` to `rtk git` and may filter output; use `git.exe` for raw diffs. Worktree "uncommitted edits" are often CRLF-only; confirm with `git.exe diff --ignore-cr-at-eol --stat` before discarding.
- **pnpm Overrides:** pnpm 9.x ignores `overrides` in `pnpm-workspace.yaml`; capsules on pnpm 9 put overrides in `package.json` `pnpm.overrides`.
- **Attribution:** Every agent git commit must include trailer: `Co-Authored-By: <Agent/Vendor> <email>`.

## Risk Tiers (`.safrs/policy.json`)
- **R0:** Read-only analysis.
- **R1:** Reversible local modifications.
- **R2:** Boundary-affecting (deps, shared APIs, non-prod auth, migrations, CI/CD, governance). Review per boundary work package, not per command. Token schema change = R2.
- **R3:** High-impact / irreversible (prod infra/data, prod credentials, clinical logic, prod deploy). Requires explicit Gaffer approval prior to execution.

## Jev Decision Layer
- **MUST call Jev before**: the first web search or browse in a task, spawning a subagent, retrying an approach that already failed, any consequential or approval-needing action, or choosing between materially different routes. Skip for simple answers, deterministic calculations, routine file edits, or `bypass jev`. Keep irreversible actions behind human confirmation.
- **How**: use the `jev_route` MCP tool (one-line English goal, no secrets). Server and setup: `tools/jev/README.md`. Fallback on Windows, from `tools/jev/playbook`: `.venv/Scripts/python.exe -c "import json; from src.router import route_task; print(json.dumps(route_task({'goal':'<goal>','kind':'coding','cached_artifact':False,'cached_note':'','prior_error':'','same_error_count':0,'sources_found':0,'constraints':''})))"` — never the JSON CLI entry point (this shell strips its quotes).
- Honor `route.action` only when a live call returns `jev_used: true` and `mode: active`. Jev never grants authority to expose secrets, change permissions, execute production actions, or perform irreversible operations. On error or timeout, continue through the normal safe path.
- Review the first 20–50 active decisions. Demote or rewrite the pack if high-confidence accuracy is below 9/10, accuracy is below 90% over at least 30 decisions, or routing cost/latency exceeds the work it gates.

## Task Lifecycle & Documentation
- Lifecycle: `PROPOSED → CLAIMED → PLANNED → EXECUTING → VERIFYING → REVIEW → MERGED → CLOSED`.
- Exceptions: `BLOCKED`, `CONFLICT`, `FAILED`, `ABORTED`, `SUPERSEDED`.
- Active plans: `docs/plans/active/` (move to `docs/plans/completed/` on close). Decisions: ADR. Stable docs: Canonical docs.
- **Capsule memory (ADR 0007 decision 7):** Capsule-scoped work reads `projects/<domain>/<capsule>/.agents/HANDOFF.md` then `CONTEXT.md` first; it overwrites that `HANDOFF.md` and appends capsule-only decisions to that `DECISIONS.md`. `check_handoff.py` requires the handoff of every scope a change set touches; a capsule-only change set never needs the root handoff.
- Root `.agents/*` (`HANDOFF`, `DECISIONS`, `PROGRESS`) is control-plane only (root tooling, governance, CI, `packages/`, cross-capsule orchestration); scope workers update it only when explicitly tasked with repo coordination.

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
5. `.agents/knowledge/03_ARCHITECTURE.md`
6. `.agents/knowledge/04_CONTEXT.md`
7. `.agents/knowledge/12_LESSONS.md`
8. `docs/architecture/MONOREPO_PURPOSE.md`

**Always (SHOULD):** `.agents/knowledge/01_COLLABORATION.md`, `.agents/knowledge/11_RESPONSE_STANDARDS.md`, `SAFRS_SPEC.md`, `.agents/CONTEXT.md`

**Task-scoped (SHOULD):**

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

## Known Non-Conformance & Remediation
- Root-coupled repos/demonstrators are current-state defects, not templates or precedents.
- Root has no demonstrator (Gaffer, 2026-09-25): `projects/internal/golden-path` is excluded from the root workspace and is a capsule like any other. Optional root debug commands: `pnpm run doctor` -> `pnpm run setup` -> `pnpm dev` (governance: `pnpm run governance`).
- Remediation sequence: Isolate dependency closure -> localize/pin external dependencies -> local verification -> empirical extraction verification -> declare standalone.

## Completion & Verification Gate
1. Local project verification passes from capsule root.
2. Extraction test confirms capsule autonomy without root leakage.
3. For root, governance, or cross-project merges, execute repository verifier:
   ```bash
   bash scripts/safrs-verify.sh
   ```
   Windows: `pnpm governance`.
