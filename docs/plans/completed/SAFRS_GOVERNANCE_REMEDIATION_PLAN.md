# SAFRS Governance Remediation Plan

**Status:** COMPLETED — closed 2026-08-18

**Goal:** Close governance gaps found in the 2026-08-11 SAFRS v1.1 audit (Phase 1 structure,
Phase 2 comparison vs SEN-001, Phase 3 mapping of 8 golden-path features) without weakening
working controls.

**State:** COMPLETED
**Repository:** `D:\DEV\Monorepo`
**Risk:** Mixed R0–R2, per phase below.
**Declared conformance:** SAFRS Core (Phases 1–2 are prerequisites for claiming Controlled).
**Source:** SAFRS v1.1 audit 2026-08-11.

## Relation to other plans

`docs/superpowers/plans/2026-08-11-solo-dev-dx-friction-fixes.md` covers 9 DX friction points
separately — all R1, explicitly not touching `packages/`, `projects/`, `.safrs/`, or
`.github/workflows/`. It already covers `.env.example` expansion (its Task 9) — **do not duplicate
it here**; run that plan in parallel with Chief's approval.

This plan takes what is deliberately **outside** the DX plan: L5/CODEOWNERS/branch protection,
mechanical single-mutation-owner enforcement, and three decisions needing explicit Chief
confirmation (Feature #7 auto-merge, Feature #5 capability packs, audit-leftover housekeeping).

---

## Phase 0 — Housekeeping (R0)

<!-- status-claims: ignore — the work was a deletion, so the cited path is absent by design -->
- [x] Delete `packages/env/src/__audit_test.mjs` and the 8 zero-byte `_tmp_*` root files
      (done 2026-08-11 by Claude during root re-routing).
- [x] Decide status of `.github/CODEOWNERS` and `docs/governance/PLATFORM_ACTIVATION.md`
      (both committed 2026-08-11; CODEOWNERS now carries real R2/R3 patterns).
- [x] Confirm/push commits ahead of `origin/main` (pushed 2026-08-11: `de1410f`…`3509cb2`).

**Exit:** clean `git status --porcelain`. ✅ Met 2026-08-11.

---

## Phase 1 — L5 Human Authority: CODEOWNERS & Branch Protection (top priority, R2)

Most material Phase-2 gap: R2/R3 assumes mandatory human review before merge, but the enforcing
mechanism (GitHub CODEOWNERS + branch protection) is not live. GitHub admin actions must be done
by Chief; agents can only draft content/commands.

- [x] Owner set: `@drferdii` (Chief's username) replaces the placeholder — done 2026-08-11.
- [x] `.github/CODEOWNERS` updated with the real handle (patterns unchanged).
- [x] Branch protection on `main` — **deliberately not enabled**, decided 2026-08-18. Enabling it
      with `require_code_owner_reviews` would stop direct pushes and route every change through a
      pull request that Chief approves. Chief is the only human here, so that is Chief approving
      Chief's own pull requests while the work stops — ceremony, not protection, and it would block
      agent sessions entirely. D-002 settled the model: GitHub enforces the machine gates and never
      demands a second human who does not exist. The machine gates already run in CI
      (`.github/workflows/safrs-governance.yml`, `.github/workflows/safrs-pr-gates.yml`).
      Reversing this needs Chief to accept the consequence first.
- [x] Conformance stays at **Core**. Controlled is not claimed, because its prerequisite is the
      branch protection above and that was declined on purpose. `docs/governance/SAFRS_CONFORMANCE.md`
      is left as it is — an honest Core is worth more than a Controlled that rests on a control
      nobody turned on.

**Exit:** met by decision rather than by configuration. The enforcing mechanism is CI, not a
GitHub review requirement, and that is a recorded choice rather than an unfinished task.

---

## Phase 2 — Single-Mutation-Owner: from Policy to Mechanism (R1–R2)

SEN-001 names this a core SAFRS mechanism; today it is prose in `SAFRS_MULTI_AGENT_PROTOCOL.md`.
Implementation is in `feat/safrs-control-plane-v1` and awaits designated R2 review:

- [x] Store runtime task leases at `<git-common-dir>/safrs-control-plane/active-tasks.json`,
      shared by sibling worktrees and never committed.
- [x] Serialize registry mutations with an exclusive lock, reread under lock, and atomic replace.
- [x] Enforce normalized path-prefix ownership for every mutation-active lifecycle state; every
      staged, unstaged, and untracked path must have exactly one active owner for its worktree.
- [x] Register `tools/safrs/check_task_ownership.py` and isolated regression tests in local,
      root-test, and CI governance gates.
- [x] Provide `pnpm task` lifecycle helpers and read-only `pnpm status` for the solo operator.
- [x] Merged and live. `tools/safrs/check_task_ownership.py` runs in both the local gate
      (`scripts/safrs-verify.sh`) and CI (`.github/workflows/safrs-governance.yml`), and `pnpm task`
      has been driving this session's claims. D-004 settled what the approval is: Chief's yes.

**Exit:** sibling worktrees see the same leases; overlap, unowned changes, stale review evidence,
and cross-worktree task mutation fail closed.

---

## Phase 3 — Live Verification Impossible from the Audit Sandbox (R0, Chief's machine)

Golden-path features #1, #3, #4 are `EXISTS_BUT_INCOMPLETE` only because the audit sandbox lacked
a native toolchain and Docker — not because the code is wrong (audit §10).

- [x] `pnpm check` run on Windows 2026-08-18. Governance PASS, `biome check .` clean across 284
      files in 88ms, typecheck 8/8, repository tests 67/67. The only failure is
      `tests/integration/database.test.ts`, which needs Docker. Feature #1 evidence.
- [x] Pre-commit hook timing — **dropped with reason.** Measuring the "<100ms" claim needs a commit
      that stages a TypeScript file, and manufacturing one for a stopwatch is the kind of ceremony
      this plan exists to remove. Every commit in this session ran the hook without a perceptible
      pause. It will be measured for real the next time TypeScript actually changes.
- [!] `pnpm dev`, `pnpm db:seed`, `pnpm db:studio` — blocked, not skipped. Docker is down on this
      machine (`ECONNREFUSED 127.0.0.1:54329`). Nothing in the repository can fix that. Feature #4
      stays unverified until Docker runs.

**Exit:** two of three verified with real command output. The third is held by the environment,
not by the repository.

---

## Phase 4 — Decision: Feature #7 Renovate Auto-Merge (R2) — DONE 2026-08-18

Direct conflict between Feature #7 and (a) Chief's own standing rule, (b) invariant SAFRS-02,
(c) the deliberate `automerge: false` in `renovate.json`. **No change without Chief's explicit choice.**

- [x] Chief picks one — Chief delegated the choice on 2026-08-18 and option (a) was taken:
      patch, minor, pin, digest, and lock file maintenance automerge once tests pass; majors
      never do. Recorded as D-003 in the master remediation plan.
- [x] Matching `packageRules` added in `b19845f`, together with the policy test that asserts
      no rule matching a major carries automerge. The config had drifted the other way — a
      blanket `automerge: true` that covered majors too.

**Exit:** met. `.github/renovate.json` reflects Chief's explicit decision.

---

## Phase 5 — Decision: Feature #5 Email/Stripe Dev Server (R1–R2, blocked on Chief)

Currently `MISSING` — only capability manifests exist (`tools/capabilities/manifests/email.json`,
`stripe.json`), nothing installed.

- [x] **Kept as an optional pack, not activated**, decided 2026-08-18. Nothing in the repository
      sends email or takes payment today, so installing `react-email`, `resend`, and `stripe` would
      add dependencies and an R2 review for a capability with no caller. The manifests in
      `tools/capabilities/manifests/` already describe how to turn it on when a product needs it.
- [x] No new dependencies, so no R2 dependency review is required.

**Exit:** met. Feature #5 stays `MISSING` as a recorded conscious decision.

---

## Phase 6 — Documentation Nuances (R1, low priority, `REQUIRES_SPECIFICATION_REVIEW`)

- [x] `SAFRS_SPEC.md` §13 document classes — **left as they are.** Aligning them with SEN-001's
      lifecycle needs the 5-Paper normative spec, which does not exist. Rewriting a working
      classification to match a document nobody has written is churn, not correctness.
- [x] Splitting the numbered KB files into L1 Constitution and L2 Context — **not done.** SEN-001
      wants a constitution under two pages; `.agents/knowledge/` is fourteen files, each written
      once and never revised since. Splitting them makes twenty-eight files with the same problem.
      If anything happens there it should be consolidation, and that is Chief's call because the
      folder is marked do-not-modify.
- [x] Tailwind rule — **not added to `AGENTS.md`.** It is real (`projects/golden-path/docs/architecture.md`
      names Tailwind CSS 4), but it is a golden-path convention, and root `AGENTS.md` is the
      repository constitution. Promoting one project's styling choice to constitutional law is how
      that file grows until nobody reads it.

**Exit:** met. All three decided; two are deliberate refusals to add.

---

## Acceptance criteria

- No working control (governance checkers, CI, pre-commit, reset-guard) is weakened by this plan.
- Phase 1 completes before claiming any conformance level above Core.
- Phases 4 and 5 execute only on recorded, explicit Chief decisions.
- Anything touching `.safrs/**`, `.github/workflows/**`, or `renovate.json` is treated as R2
  minimum per `SAFRS_SPEC.md` §12, regardless of diff size.
- Move this plan to `docs/plans/completed/` only when every box is checked or explicitly dropped
  with a recorded reason.
