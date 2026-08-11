# PROGRESS — Milestones and Area Status

Legend: [x] done, [~] in progress, [ ] not started, [!] blocked

Last updated: 2026-08-11 | Branch: `feat/safrs-control-plane-v1`

> Area status board. Detailed work logs: `docs/plans/active/` → `completed/`.
> Durable decisions: `DECISIONS.md`. Session state: `HANDOFF.md`.

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

- [x] KB re-route → `.agents/knowledge/` (commit `de1410f`, pushed)
- [~] DX friction fixes (9 items) — **in progress by Claude**
      (`docs/superpowers/plans/2026-08-11-solo-dev-dx-friction-fixes.md`)
- [x] Five agent memory files — registered in registry, in generated `AGENTS.md` read order,
      HANDOFF machine-enforced (Chief GO 2026-08-11)
- [x] Active docs converted to concise English (2026-08-11)
- [~] Claude Code automation pack (`.claude/` hooks, subagents, skills) — implemented,
      awaiting Chief review (`docs/bootstrap/CLAUDE_SETUP.md`); Postgres MCP deferred
- [x] Codex repository automation pack (`.codex/` hooks/config/agents + `.agents/skills`) — implemented; R2 designated review required
- [~] SAFRS Control Plane v1 Increment A — implemented in an isolated worktree; final
      designated R2 and verification-integrity review pending before Chief approval
- [ ] Complete `.env.example` + capability variable docs
- [ ] Python prerequisite documented (INSTALL.md) + setup detection

## ⚪ Phase 2 — Project Migration from abyss-monorepo

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

- [!] Smartboard Phase B/C — awaiting Chief GO (backup + migration dry-run first)
- [~] semayot — deferred (delete or relocate)
- [ ] 8 skeleton projects (skripsipintar, smartboard-docs-only, clinical-copilot,
      healthsphere, hoamanagement, mantra, melinda, rag-dashboard) — skip

## Guardrails

- Shared packages / DB schema / CI changes = R2, review required.
- Never weaken SAFRS governance to pass a task.
- `.agents/knowledge/` — do not modify (re-routed KB).
