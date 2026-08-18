# SAFRS Governance Remediation Plan

**Status:** ACTIVE

**Goal:** Close governance gaps found in the 2026-08-11 SAFRS v1.1 audit (Phase 1 structure,
Phase 2 comparison vs SEN-001, Phase 3 mapping of 8 golden-path features) without weakening
working controls.

**State:** ACTIVE
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
- [ ] Enable branch protection on `main` (Chief, on GitHub — Settings → Branches → Add rule,
      or with an admin-scoped token):

      ```bash
      gh api -X PUT repos/drferdii/Monorepo-safrs/branches/main/protection \
        -f 'required_status_checks[strict]=true' \
        -f 'required_status_checks[contexts][]=SAFRS Governance' \
        -f 'required_status_checks[contexts][]=CI' \
        -F 'enforce_admins=true' \
        -f 'required_pull_request_reviews[require_code_owner_reviews]=true' \
        -F 'required_pull_request_reviews[required_approving_review_count]=1' \
        -F 'restrictions=null' -F 'allow_force_pushes=false' -F 'allow_deletions=false'
      ```

      **Consequence to accept first:** direct pushes to `main` stop working — every change,
      including agent sessions like today's, must go through a PR that Chief approves.
- [x] `bash scripts/safrs-verify.sh` run after the CODEOWNERS change (R2 auto-classified, green).
- [ ] Raise `docs/governance/SAFRS_CONFORMANCE.md` from Core to Controlled **only after**
      branch protection is verified with real evidence (screenshot / `gh api` output).

**Exit:** a PR touching R2/R3 paths is actually blocked by GitHub until a code owner approves —
proven with a real test PR, not just configuration.

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
- [ ] Obtain final designated R2 and verification-integrity approval, then merge with Chief approval.

**Exit:** sibling worktrees see the same leases; overlap, unowned changes, stale review evidence,
and cross-worktree task mutation fail closed.

---

## Phase 3 — Live Verification Impossible from the Audit Sandbox (R0, Chief's machine)

Golden-path features #1, #3, #4 are `EXISTS_BUT_INCOMPLETE` only because the audit sandbox lacked
a native toolchain and Docker — not because the code is wrong (audit §10).

- [ ] Run full `pnpm check` (`governance && lint && typecheck && test && build`) on Windows;
      keep output as Feature #1 evidence.
- [ ] Run a small `git commit` to time the Biome pre-commit hook (claim: "<100ms"). Feature #3.
- [ ] Run `pnpm dev` (Docker Postgres via `compose.yaml`), then `pnpm db:seed` and
      `pnpm db:studio`. Feature #4.

**Exit:** all three move to `EXISTS_AND_VERIFIED` with real command evidence.

---

## Phase 4 — Decision: Feature #7 Renovate Auto-Merge (R2, blocked on Chief)

Direct conflict between Feature #7 and (a) Chief's own standing rule, (b) invariant SAFRS-02,
(c) the deliberate `automerge: false` in `renovate.json`. **No change without Chief's explicit choice.**

- [ ] Chief picks one: (a) automerge limited to non-sensitive patch/minor, (b) full automerge,
      (c) keep `automerge: false`.
- [ ] If (a) or (b): add matching `packageRules` — R2, Chief review before merge.

**Exit:** `renovate.json` reflects Chief's explicit decision, not an agent assumption.

---

## Phase 5 — Decision: Feature #5 Email/Stripe Dev Server (R1–R2, blocked on Chief)

Currently `MISSING` — only capability manifests exist (`tools/capabilities/manifests/email.json`,
`stripe.json`), nothing installed.

- [ ] Chief confirms: activate now (install `react-email`/`resend` + `stripe`, add
      `dev:email`/`stripe:listen` scripts) or keep as optional pack for later.
- [ ] If activated: new dependencies → R2 per `SAFRS_SPEC.md` §7; flag for review.

**Exit:** Feature #5 becomes `EXISTS_AND_VERIFIED`, or stays `MISSING` as a recorded conscious
decision.

---

## Phase 6 — Documentation Nuances (R1, low priority, `REQUIRES_SPECIFICATION_REVIEW`)

- [ ] Decide whether `SAFRS_SPEC.md` §13 document classes should align with SEN-001's lifecycle
      (`DRAFT → ACTIVE → CANONICAL → SUPERSEDED → ARCHIVED`) — notably the missing `DRAFT` status
      and the extra "Historical" class. Needs the 5-Paper normative spec; keep flagged until it exists.
- [ ] Consider splitting the numbered KB files into true L1 Constitution (non-negotiable) vs
      L2 Context (guidance) — SEN-001 wants the constitution "under two pages".
- [ ] Add an explicit "Tailwind-only, no inline style" rule to root `AGENTS.md` if that is the
      real convention (currently implicit in `projects/golden-path/docs/architecture.md`).

**Exit:** not urgent — safe to do anytime.

---

## Acceptance criteria

- No working control (governance checkers, CI, pre-commit, reset-guard) is weakened by this plan.
- Phase 1 completes before claiming any conformance level above Core.
- Phases 4 and 5 execute only on recorded, explicit Chief decisions.
- Anything touching `.safrs/**`, `.github/workflows/**`, or `renovate.json` is treated as R2
  minimum per `SAFRS_SPEC.md` §12, regardless of diff size.
- Move this plan to `docs/plans/completed/` only when every box is checked or explicitly dropped
  with a recorded reason.
