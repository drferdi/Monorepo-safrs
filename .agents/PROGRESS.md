# PROGRESS — Milestones and Area Status

Legend: [x] done, [~] in progress, [ ] not started, [!] blocked

Last updated: 2026-08-18 | Branch: main

> Area status board — this file is the execution board. Detailed work logs: `docs/plans/active/` → `completed/`.
> Durable decisions: `DECISIONS.md`. Session state: `HANDOFF.md`.
> **Everything waiting on Chief is collected in one place: `HANDOFF.md` — Waiting on Chief.**

---

## 🟢 Phase 0 — SAFRS Scaffold & Golden Path

- [x] SAFRS v1.1 bootstrap (six layers, policy.json, roles, sensitive-paths)
- [x] Golden-path demonstrator: Next.js + Hono API in `projects/golden-path/apps/web`
- [x] Shared packages: api, schemas, env, database, ui, config, design-tokens
- [x] Tooling: safrs, doctor, project-wizard, capabilities
- [x] Contract tests + `pnpm test:contracts`
- [x] Capability packs active: email + Stripe (commit 72e08d9)
- [x] ADR 0001 accepted (golden path)

## 🟡 Phase 1 — Solo-Developer DX

- [x] SOTA enhancements v1+v2 (deps-graph, visual regression, telemetry, codegen, OpenAPI endpoint, property tests, supply-chain scan) implemented + verified (2026-08-12); plan moved to `docs/plans/completed/`
- [x] KB re-route → `.agents/knowledge/` (commit `de1410f`, pushed)
- [ ] DX friction fixes (9 items) — not started; every step in the plan is still unchecked and
      `pnpm verify`, `pnpm check:quick`, `INSTALL.md`, and `.husky/pre-commit.ps1` do not exist
      (`docs/superpowers/plans/2026-08-11-solo-dev-dx-friction-fixes.md`)
- [x] Five agent memory files — registered in registry, in generated `AGENTS.md` read order,
      HANDOFF machine-enforced (Chief GO 2026-08-11)
- [x] Active docs converted to concise English (2026-08-11)
- [~] Claude Code automation pack (`.claude/` hooks, subagents, skills) — implemented;
      Chief decision 2 (`docs/bootstrap/CLAUDE_SETUP.md`); Postgres MCP deferred
- [~] Codex repository automation pack (`.codex/` hooks/config/agents + `.agents/skills`) — implemented;
      Chief decision 3 — a "yes" from Chief is the whole approval
- [ ] Complete `.env.example` + capability variable docs
- [ ] Python prerequisite documented (INSTALL.md) + setup detection
- [~] Sentra wiki — plan approved by Chief 2026-08-18 and now `ACTIVE`; `sentrawiki/` already holds
      content, so the plan's remaining sections are the work left
      (`docs/plans/active/2026-08-12-wiki-setup-plan.md`)

## 🟡 Master Remediation (plan: `docs/plans/active/MASTER REMEDIATION PLAN — SENTRA MONOREPO.md`)

Assignments: `docs/plans/active/MASTER REMEDIATION AGENT ASSIGNMENTS.md`.
Baseline evidence: `docs/evidence/MONOREPO GROUND TRUTH BASELINE v1.md`.

- [x] Phase 1 — verification integrity. `fix/phase-1-verification-integrity` (`3ecc116`, deterministic
      lint baseline) merged as `3e05005`; independent review evidence recorded in `8e22025`.
> Phase 2 onward cannot start until D-001, D-002, and D-003 are settled (Chief decisions 1 and 4).
> D-004 is accepted: Chief's explicit "yes" is the R2 authorization.

- [ ] Phase 2 — platform enforcement (exact main SHA CI, `main` ruleset, R2 merge bridge, negative tests)
- [ ] Phase 3 — operational Control Center (evidence ladder, verification semantics, lifecycle,
      bounded local process supervisor)
- [ ] Phase 4 — verification depth (coverage baseline, API compatibility, migration drift, Control Center E2E)
- [ ] Phase 5 — supply-chain and platform security depth
- [ ] Phase 6 — monorepo performance optimization

## 🟡 SAFRS Full Automation (plan: `docs/plans/active/SAFRS_FULL_AUTOMATION_IMPLEMENTATION_PLAN.md`)

- [x] Phase 1 — baseline safety: unsafe-workflow gates, droid exclusion (PR #12, merged)
- [x] Interim — lockfile/catalogs repair + LFS push (PR #13, merged)
- [x] Phase 2 — contracts, 7 schemas, monotonic risk, Node↔Python digest parity (PR #14, merged; 6 bot-review rounds addressed)
- [x] Phase 3 — remote leases, fencing, lifecycle (PR #15, merged)
- [x] Phase 4 — shared guard, adapter parity, hard budgets (PR #17, merged)
- [x] Phase 5 — PR gates, evidence, approvals, publisher separation (PR #18, merged)
- [x] Gate repairs — stale-evidence handling, memory-file exemption, classification gaps,
      sibling-worktree guard (PRs #19, #20, #21, merged)
- [ ] Phases 6-8 — GitHub platform controls + drift audit, autonomous R0/R1/R2 executor, inert R3
      and cutover. All three are held by the four activation gates in Chief decision 5.

## ⚪ Phase 2 — Project Migration from abyss-monorepo

> Capsules that exist today: `projects/_template/`, `projects/golden-path/`, `projects/control-center/`.
> Every project listed below is still unbuilt — no directory, no code.

- [x] Project mapping done (22 → 14 active) + per-project stack decisions
- [x] Multi-tenant + demo pattern design (smartboard as reference)
- [x] Repo prep verified (2026-08-11): policy.json capsule root, workspace glob
      `projects/*/apps/*`, `pnpm project:new` wizard (preview tested), template capsule,
      topology enforcement for every new `projects/*`
- [ ] Pilot: `ferdiiskandar` → `projects/ferdiiskandar/`
- [ ] Smartboard rewrite (FastAPI+Mongo+CRA → Next+Hono+Postgres)
- [ ] Tier 1 Next.js: assistverse, medboard, sentraverse
- [ ] Tier 2: med-assist (R3 clinical), referralink, sidelab
- [ ] Tier 3: socialmedia (Python)
- [ ] Studio: unicom, dataset-studio, sentra-prompt, wikirepo, sentrahub

## 🔴 Blocked / Deferred

- [!] Smartboard Phase B/C — blocked until the project is actually migrated into `projects/`;
      it does not exist in this repository yet, so there is nothing to decide today

- [ ] 8 skeleton projects (skripsipintar, smartboard-docs-only, clinical-copilot,
      healthsphere, hoamanagement, mantra, melinda, rag-dashboard) — skip

## Guardrails

- Shared packages / DB schema / CI changes = R2, review required.
- Never weaken SAFRS governance to pass a task.
- `.agents/knowledge/` — do not modify (re-routed KB).
