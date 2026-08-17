# RECONCILE-GOVERNANCE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the six authorized Master Remediation files a valid R2 owner in a dedicated worktree, reconcile Control Center/`docs/` ownership, and reach governance PASS without weakening the checker or opening Renovate.

**Architecture:** Cut a clean sibling worktree from `main` @ `124e9e0`, claim exactly six files through the SAFRS control plane, import those files from dirty `main`, edit ownership documents in place, then verify inside the new worktree. Stop at `REVIEW`.

**Tech Stack:** Git worktrees, `pnpm task`, `.git/safrs-control-plane/active-tasks.json`, `tools/safrs/check_task_ownership.py`, `scripts/safrs-verify.ps1`, PowerShell 7.

## Global Constraints

- Address the user as Chief in chat diagnostics. Repository files, identifiers, and commit messages stay in English.
- Risk is **R2**. Do not execute R3. Do not print, copy, or commit `.env` values.
- Isolated worktree only: `D:\\DEV\\Monorepo.worktrees\\reconcile-governance` on `feat/reconcile-governance`. Never create a worktree inside the repo root.
- Claim only the six authorized files. Do not claim `docs/` or `docs/plans/active/`.
- Do not modify `tools/safrs/check_task_ownership.py` or any other governance checker.
- Do not change `renovate.json`. Do not start `RECONCILE-RENOVATE`. Do not start Phase 1.
- Do not mutate dirty `D:\\DEV\\Monorepo` except the already-written planning artifacts on `main`.
- Residual dirty paths on `main` stay untouched: `tmp-*`, handbook, `next-env.d.ts`, Copilot files, `AGENTS.md`, deleted `.specstory` files, and other pre-existing changes.
- Never `git add -A`. Stage explicit paths only.
- Line endings: CRLF on Windows-edited files. PowerShell for local commands.
- Evidence before assertions. Do not report REVIEW unless the four verification commands were actually run in the worktree.
- This design spec and this plan stay on `main`. Do not import them into the dedicated worktree.

## File map

| File | Responsibility |
| --- | --- |
| `docs/plans/active/MASTER REMEDIATION PLAN — SENTRA MONOREPO.md` | Status alignment only; no 47KB rewrite |
| `docs/plans/active/MASTER REMEDIATION KANBAN.md` | Move RECONCILE-GOVERNANCE through IN PROGRESS to REVIEW; record Control Center CLOSED |
| `docs/plans/active/MASTER REMEDIATION AGENT ASSIGNMENTS.md` | Authorization boundary: docs/ no longer owned by Control Center |
| `docs/evidence/MONOREPO GROUND TRUTH BASELINE v1.md` | Dated addendum only; keep the 2026-08-17 observational body |
| `.agents/HANDOFF.md` | Overwrite current session state and verification evidence |
| `.agents/DECISIONS.md` | Append-only decision for option B / Approach 1 / this R2 claim |

Planning artifacts that stay on dirty `main` and are not claimed:

- `docs/superpowers/specs/2026-08-17-reconcile-governance-design.md`
- `docs/superpowers/plans/2026-08-17-reconcile-governance.md`

## Definition of done

This plan is done only when all of the following are true in `D:\\DEV\\Monorepo.worktrees\\reconcile-governance`:

1. Dedicated worktree exists on `feat/reconcile-governance` from `124e9e0`.
2. `TASK-20260817-RECONCILE-GOVERNANCE` is claimed R2 with exactly the six authorized scopes.
3. `TASK-20260813-CONTROL-CENTER` remains `CLOSED` and does not own `docs/`.
4. Kanban shows `RECONCILE-GOVERNANCE` at `REVIEW`.
5. Ground Truth has an addendum, not a rewritten body.
6. `pnpm governance` PASS.
7. `powershell -ExecutionPolicy Bypass -File scripts/safrs-verify.ps1` PASS.
8. `git diff --check` clean.
9. `git status --short --branch` shows only the six claimed files plus the branch name.
10. `renovate.json` is unchanged.
11. `RECONCILE-RENOVATE` has not been claimed or started.

If any item fails, stay off `REVIEW` and report the exact blocker.

---

### Task 1: Create the isolated worktree

**Files:**
- Create: `D:\\DEV\\Monorepo.worktrees\\reconcile-governance` as a Git worktree
- Do not modify repository files in this task

**Interfaces:**
- Consumes: `main` @ `124e9e0`
- Produces: clean worktree path `D:\\DEV\\Monorepo.worktrees\\reconcile-governance` on branch `feat/reconcile-governance`

- [ ] **Step 1: Confirm the current checkout is the main working tree, not a linked worktree**

Run from `D:\\DEV\\Monorepo`:

```powershell
$gitDir = (Resolve-Path (git rev-parse --git-dir)).Path
$gitCommon = (Resolve-Path (git rev-parse --git-common-dir)).Path
$super = git rev-parse --show-superproject-working-tree
Write-Output "GIT_DIR=$gitDir"
Write-Output "GIT_COMMON=$gitCommon"
Write-Output "SUPER=$super"
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
```

Expected: `GIT_DIR` equals `GIT_COMMON`, `SUPER` is empty, branch is `main`, HEAD starts with `124e9e0`.

- [ ] **Step 2: Confirm the target path and branch do not already exist**

```powershell
git worktree list
git branch --list feat/reconcile-governance
Test-Path -LiteralPath 'D:\\DEV\\Monorepo.worktrees\\reconcile-governance'
```

Expected: no existing `reconcile-governance` worktree and no `feat/reconcile-governance` branch. If either exists, stop and report the blocker. Do not reuse `governance-cc-agents`.

- [ ] **Step 3: Create the sibling worktree**

```powershell
if (-not (Test-Path -LiteralPath 'D:\\DEV\\Monorepo.worktrees')) {
  New-Item -ItemType Directory -Path 'D:\\DEV\\Monorepo.worktrees' | Out-Null
}
git worktree add --no-track -b feat/reconcile-governance 'D:\\DEV\\Monorepo.worktrees\\reconcile-governance' 124e9e08bbb2b0f1ec89dfb1ac0292cb29b47c62
```

Expected: new worktree created from that exact SHA.

- [ ] **Step 4: Prove the new worktree is clean**

```powershell
Set-Location -LiteralPath 'D:\\DEV\\Monorepo.worktrees\\reconcile-governance'
git status --short --branch
git rev-parse HEAD
```

Expected: `## feat/reconcile-governance` with no dirty paths, HEAD `124e9e08bbb2b0f1ec89dfb1ac0292cb29b47c62`.

---

### Task 2: Claim the official SAFRS task from the new worktree

**Files:**
- Modify: `.git/safrs-control-plane/active-tasks.json` via `pnpm task claim`
- Modify: `.git/safrs-control-plane/lease-events.ndjson` via the claim lease event
- Do not modify the six document files yet

**Interfaces:**
- Consumes: clean worktree from Task 1
- Produces: `TASK-20260817-RECONCILE-GOVERNANCE` in `CLAIMED`, `worktree_id=worktrees/reconcile-governance`, six exact scopes

- [ ] **Step 1: Preview the claim without writing**

Run from `D:\\DEV\\Monorepo.worktrees\\reconcile-governance`:

```powershell
pnpm task claim --id TASK-20260817-RECONCILE-GOVERNANCE --title "Reconcile SAFRS governance ownership for Master Remediation" --owner-id agent:codex:root --owner-label "Codex governance reconciliation" --risk R2 --scope "docs/plans/active/MASTER REMEDIATION PLAN — SENTRA MONOREPO.md" --scope "docs/plans/active/MASTER REMEDIATION KANBAN.md" --scope "docs/plans/active/MASTER REMEDIATION AGENT ASSIGNMENTS.md" --scope "docs/evidence/MONOREPO GROUND TRUTH BASELINE v1.md" --scope ".agents/HANDOFF.md" --scope ".agents/DECISIONS.md" --state CLAIMED
```

Expected: preview JSON containing the six scopes and no overlap error. Do not pass `--yes` yet.

- [ ] **Step 2: Write the claim**

Repeat the same command with `--yes` at the end.

Expected: `Wrote shared claim TASK-20260817-RECONCILE-GOVERNANCE`.

- [ ] **Step 3: Confirm active ownership**

```powershell
pnpm task list --json --active
```

Expected: exactly one active task, `TASK-20260817-RECONCILE-GOVERNANCE`, state `CLAIMED`, risk `R2`, `worktree_id` `worktrees/reconcile-governance`, and the six authorized `scope_prefixes`. `TASK-20260813-CONTROL-CENTER` must not appear in the active list.

---

### Task 3: Import only the six authorized files

**Files:**
- Create in the worktree by copy from dirty `main`:
  - `docs/plans/active/MASTER REMEDIATION PLAN — SENTRA MONOREPO.md`
  - `docs/plans/active/MASTER REMEDIATION KANBAN.md`
  - `docs/plans/active/MASTER REMEDIATION AGENT ASSIGNMENTS.md`
  - `docs/evidence/MONOREPO GROUND TRUTH BASELINE v1.md`
- Modify in the worktree by copy from dirty `main`:
  - `.agents/HANDOFF.md`
  - `.agents/DECISIONS.md`

**Interfaces:**
- Consumes: claimed scopes from Task 2 and the dirty `main` copies of those six files
- Produces: the same six files present in the worktree and no other imported dirty paths

- [ ] **Step 1: Copy the six files with literal paths**

Run from the worktree:

```powershell
$src = 'D:\\DEV\\Monorepo'
$dst = 'D:\\DEV\\Monorepo.worktrees\\reconcile-governance'
$files = @(
  'docs/plans/active/MASTER REMEDIATION PLAN — SENTRA MONOREPO.md',
  'docs/plans/active/MASTER REMEDIATION KANBAN.md',
  'docs/plans/active/MASTER REMEDIATION AGENT ASSIGNMENTS.md',
  'docs/evidence/MONOREPO GROUND TRUTH BASELINE v1.md',
  '.agents/HANDOFF.md',
  '.agents/DECISIONS.md'
)
foreach ($rel in $files) {
  $from = Join-Path $src $rel
  $to = Join-Path $dst $rel
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $to) | Out-Null
  Copy-Item -LiteralPath $from -Destination $to -Force
}
```

- [ ] **Step 2: Prove no extra dirty path arrived**

```powershell
git status --short --branch
```

Expected: only the six authorized paths are dirty. If any other path appears, stop and revert the extra path. Do not continue.

- [ ] **Step 3: Advance the task to PLANNED then EXECUTING**

```powershell
pnpm task state --id TASK-20260817-RECONCILE-GOVERNANCE --to PLANNED --yes
pnpm task state --id TASK-20260817-RECONCILE-GOVERNANCE --to EXECUTING --yes
```

Expected: state is `EXECUTING`.

---

### Task 4: Reconcile the six documents

**Files:**
- Modify: `docs/plans/active/MASTER REMEDIATION KANBAN.md`
- Modify: `docs/plans/active/MASTER REMEDIATION AGENT ASSIGNMENTS.md`
- Modify: `docs/evidence/MONOREPO GROUND TRUTH BASELINE v1.md`
- Modify: `docs/plans/active/MASTER REMEDIATION PLAN — SENTRA MONOREPO.md`
- Modify: `.agents/HANDOFF.md`
- Modify: `.agents/DECISIONS.md`

**Interfaces:**
- Consumes: imported files from Task 3 and live task state `EXECUTING`
- Produces: documents that agree Control Center is CLOSED, `docs/` is free of that owner, and this task is the active R2 owner

- [ ] **Step 1: Update the Kanban**

In `MASTER REMEDIATION KANBAN.md`:

- Set `Last updated:` to `2026-08-17`.
- Remove `RECONCILE-GOVERNANCE` from the `BLOCKED` table.
- Keep `RECONCILE-RENOVATE` in `BLOCKED` with blocker: waiting for `RECONCILE-GOVERNANCE` review; do not claim or implement yet.
- Add or move `RECONCILE-GOVERNANCE` so its status path is `IN PROGRESS` during edits, then `VERIFYING`/`REVIEW` after Task 5.
- During this step, leave the card at `IN PROGRESS`.
- Record `TASK-20260813-CONTROL-CENTER = CLOSED` and that `docs/` is no longer blocked by that task.
- Replace the current snapshot with:

```text
BLOCKED          RECONCILE-RENOVATE waiting for RECONCILE-GOVERNANCE review
READY            none
IN PROGRESS      RECONCILE-GOVERNANCE
VERIFYING        none
REVIEW           GT-INTEGRATION-01 — baseline artifact ready for Chief review
DONE             GT-CLAUDE-01, GT-CODEX-01, GT-CURSOR-01, TASK-20260813-CONTROL-CENTER
```

- [ ] **Step 2: Update Assignments**

Replace the stale authorization sentences that still treat the Master Plan as draft-only and still imply Control Center owns `docs/`. The replacement text must say:

- Chief approved the Master Plan and D-001 through D-004.
- Phase 0A evidence exists in `docs/evidence/MONOREPO GROUND TRUTH BASELINE v1.md`.
- `TASK-20260813-CONTROL-CENTER` is `CLOSED` and no longer owns `docs/`.
- `TASK-20260817-RECONCILE-GOVERNANCE` is the authorized R2 package for these six files.
- Phase 1 and Renovate remain unauthorized until this task is reviewed.

Do not change Wave 1–6 work-package ownership tables.

- [ ] **Step 3: Append a Ground Truth addendum**

Keep every existing observational section unchanged. Append:

```markdown
## 11. Addendum — 2026-08-17 ownership reconciliation

- `TASK-20260813-CONTROL-CENTER` closed at `2026-08-17T10:18:41Z`.
- After that close and before this claim, `docs/` had no active owner.
- `TASK-20260817-RECONCILE-GOVERNANCE` now owns only the six authorized files listed in this task claim.
- The 2026-08-17 observational body above remains a Phase 0A snapshot and is not rewritten.
- `RECONCILE-RENOVATE` remains unopened.
```

- [ ] **Step 4: Align Master Plan status only**

Change the header status from `Draft for Final Approval — No Execution Authorized` to a status that matches already-approved Chief decisions, for example:

`Approved — execution remains gated by claimed work packages`

Do not rewrite the body. Do not treat this as permission to start Phase 1 or Renovate.

- [ ] **Step 5: Overwrite HANDOFF**

Replace `.agents/HANDOFF.md` with current state under ~1k tokens. Required facts:

- Checkout/worktree: `D:\\DEV\\Monorepo.worktrees\\reconcile-governance` on `feat/reconcile-governance` @ `124e9e0`
- Task: `TASK-20260817-RECONCILE-GOVERNANCE`, R2, `EXECUTING`
- Owned paths: the six authorized files
- Control Center task CLOSED; `docs/` no longer blocked by it
- Residual dirty `main` is out of scope
- Do not start Renovate or Phase 1
- Next action: run Task 5 verification

- [ ] **Step 6: Append DECISIONS**

Insert this newest entry immediately after the DECISIONS header, without editing older entries:

```markdown
## 2026-08-17 - RECONCILE-GOVERNANCE claimed as isolated R2 work

Chief approved option B and Approach 1. `TASK-20260813-CONTROL-CENTER` is CLOSED. `TASK-20260817-RECONCILE-GOVERNANCE` owns six exact files in `worktrees/reconcile-governance`. Residual dirty paths on `main` stay out of scope. The ownership checker is unchanged. `RECONCILE-RENOVATE` and Phase 1 remain unopened.
```

---

### Task 5: Verify, record evidence, and stop at REVIEW

**Files:**
- Modify: `docs/plans/active/MASTER REMEDIATION KANBAN.md` to `VERIFYING` then `REVIEW`
- Modify: `.agents/HANDOFF.md` with command evidence
- Test: `pnpm governance`, `scripts/safrs-verify.ps1`, `git diff --check`, `git status --short --branch`

**Interfaces:**
- Consumes: edited six-file working tree and active claim
- Produces: `REVIEW` state only if all four commands pass and no unrelated path changed

- [ ] **Step 1: Advance to VERIFYING**

```powershell
pnpm task state --id TASK-20260817-RECONCILE-GOVERNANCE --to VERIFYING --yes
```

Set the Kanban card to `VERIFYING` in the same step.

- [ ] **Step 2: Run the required verification commands**

Run from `D:\\DEV\\Monorepo.worktrees\\reconcile-governance`:

```powershell
pnpm governance
powershell -ExecutionPolicy Bypass -File scripts/safrs-verify.ps1
git diff --check
git status --short --branch
```

Expected:

- `pnpm governance` PASS, including ownership
- `scripts/safrs-verify.ps1` PASS
- `git diff --check` produces no output and exit code 0
- `git status --short --branch` shows `feat/reconcile-governance` and only the six claimed files

If any command fails, do not go to `REVIEW`. Report the exact command, exit code, and failing path. Do not change the checker.

- [ ] **Step 3: Record evidence in HANDOFF**

Overwrite HANDOFF again with the four command results, freshness `FRESH`, HEAD SHA, worktree path, and explicit statements:

- No unrelated path changed
- `renovate.json` unchanged
- `RECONCILE-RENOVATE` not started

- [ ] **Step 4: Promote to REVIEW only after a green rerun**

If Step 3 changed HANDOFF, rerun the four commands. Only if they still pass:

```powershell
pnpm task state --id TASK-20260817-RECONCILE-GOVERNANCE --to REVIEW --yes
```

Set the Kanban card to `REVIEW`. Do not `MERGED`. Do not `CLOSED`. Do not claim `RECONCILE-RENOVATE`.

- [ ] **Step 5: Commit the six claimed files only if verification is green**

```powershell
git add --literal-path ".agents/DECISIONS.md"
git add --literal-path ".agents/HANDOFF.md"
git add --literal-path "docs/evidence/MONOREPO GROUND TRUTH BASELINE v1.md"
git add --literal-path "docs/plans/active/MASTER REMEDIATION AGENT ASSIGNMENTS.md"
git add --literal-path "docs/plans/active/MASTER REMEDIATION KANBAN.md"
git add --literal-path "docs/plans/active/MASTER REMEDIATION PLAN — SENTRA MONOREPO.md"
git diff --cached --name-only
git commit -m "docs(governance): reconcile Master Plan ownership after Control Center close"
```

If `git add --literal-path` is unavailable, use `git add -A --` plus each exact path, never a bare `git add -A`. Expected cached names: exactly those six files. After commit, leave the task at `REVIEW` for Chief.

---

## Self-review

Spec coverage:

- Isolated worktree -> Task 1
- Official SAFRS claim and six exact scopes -> Task 2
- Import only authorized files -> Task 3
- Kanban, Assignments, Ground Truth addendum, Master Plan status, HANDOFF, DECISIONS -> Task 4
- Four required verification commands, REVIEW gate, no Renovate, no checker change -> Task 5

No placeholders remain. Later tasks use the same task ID, worktree path, and six file names defined in Task 2.

