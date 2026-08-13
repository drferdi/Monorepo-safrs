# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-13 (automation phases 1-5 merged to main; repository clean)

## Current state

- **Automation phases 1-5 are on `main`** (PRs #12, #14, #15, #17, #18 plus repairs #13, #19,
  #20, #21). `main` verifies clean locally: governance PASS, 136/136 node tests,
  `saf gate --all` 8/8.
  - Phase 1 — unsafe-workflow gates (piped installers, autonomy flags, unregistered endpoints).
  - Phase 2 — 7 v1 schemas, automation policy, monotonic risk, Node↔Python digest parity.
  - Phase 3 — remote lease authority (issues ledger + fencing tokens), lifecycle checker.
  - Phase 4 — one shared guard, budget ledger with breaker, adapter parity, thin vendor hooks.
  - Phase 5 — 8 stable PR gates, sealed/redacted evidence, exact-binding approvals, publisher
    separation (evaluation-only until the publisher identity exists).
- **Gate defects found and fixed** (#19, #20, #21): stale integrity evidence now means "review
  required" instead of crashing; session memory files no longer count as implementation (the
  handoff rule forces them in, which made every governance-only change look coupled);
  CODEOWNERS/PR-template and root-level `tests/architecture|security` are now verification
  controls; the Claude guard no longer denies writes into sibling worktrees (AGENTS.md rule 8
  mandates them — Phase 4 had broken that).
- Hygiene: no open PRs, `origin` has only `main`, every task claim CLOSED, stale branches and
  worktrees pruned.
- **README repository-state section refreshed** to match reality: quick start, the governance and
  `pnpm saf` command table, what phases 1-5 actually delivered (with links to the canonical docs
  rather than duplicated prose), gate semantics, and honest capability statuses. Fixed a factual
  error it carried — Renovate was described as auto-merging while `renovate.json` sets
  `automerge: false` — and flagged that `main` has no branch protection, so the eight gates are
  published but not required.

## Blockers

- **CI `verify` is red on `main` at the browser-smoke step** — pre-existing, unmasked only now
  that governance passes. `next dev` never comes up on 127.0.0.1:3001 in CI (no `[WebServer]`
  output at all), and `ci.yml` sets `APP_URL` to port 3000 while the Playwright config serves
  3001. Not caused by the automation work; needs an app/e2e owner.
- **Phases 6-8 need Chief's four activation decisions** (autonomous provider + budgets; control
  identities; R3 authority + retention; Droid disposition). Droid stays `read_only_disabled`.
- **`main` has no branch protection** (verified against the API). The Phase 5 gates exist but
  nothing requires them; that is Phase 6 work and needs Activation Decision 2.
- **Open classification question:** should `tests/governance/test_sensitive_classification.py`
  be a verification control like its three siblings? Classifying it would exempt
  checker-plus-test coupling from the integrity gate, so it was left for Chief deliberately
  (see `DECISIONS.md` 2026-08-13).

## Next actions

| Area | Action |
| --- | --- |
| **e2e CI** | Fix the browser-smoke step (port/APP_URL mismatch is the first suspect) |
| **Activation decisions** | Decide the four gates in plan §3 to unblock Phase 6 |
| **Branch protection** | Require the eight `SAFRS <Gate>` checks + `governance` on `main` |
| **Classification** | Rule on the governance-test question above |

## Session guardrails

- PowerShell for commands; explicit staging only, never `git add -A`.
- `.agents/knowledge/` — no changes without Chief's approval.
- Worktrees: sibling `../Monorepo.worktrees/<branch>` only, and keep the directory name stable —
  the task registry keys ownership on the worktree id.
- Chat diagnostics in Bahasa Indonesia; docs/code in English.
- An agent never writes its own `verification-integrity.json` approval.
