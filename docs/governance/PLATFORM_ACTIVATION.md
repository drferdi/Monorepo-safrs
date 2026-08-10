# SAFRS Platform Activation — Human-Only Checklist

**Status:** Canonical operational checklist
**Applies to:** this repository's GitHub hosting platform
**Owner:** repository administrator (human)

## Why this document exists

`.github/CODEOWNERS`, `.safrs/sensitive-paths.json`, and
`docs/governance/SAFRS_CONTROL_MATRIX.md` declare that R2 changes require
code-owner review and that governance checks gate merges. None of those files can
enforce anything by themselves. Enforcement lives in GitHub repository settings,
which are not stored in the repository and cannot be created, verified, or
repaired by an agent working from the codebase.

Until every step below is completed and its negative test has been observed to
fail as expected, the R2 column of the control matrix is a stated preference, not
a control.

## Prerequisites

- Admin permission on the repository.
- A GitHub team or user that will replace the `@sentra/safrs-maintainers`
  placeholder in `.github/CODEOWNERS`. The team must have at least **write**
  access to the repository, otherwise GitHub ignores it as an owner and the
  code-owner rule silently passes.
- A scratch branch you are willing to delete, for running the negative tests.

## How to use the negative tests

Every step has a **negative test**: an action that must be *rejected*. A step is
not complete because the setting looks right in the UI. It is complete when you
have attempted the forbidden action and seen it blocked.

If a negative test succeeds when it should have failed, the control is not
active. Do not record the step as done. Do not work around it.

---

## Step 0 — Replace the CODEOWNERS placeholder

Every rule in `.github/CODEOWNERS` currently names `@sentra/safrs-maintainers`,
which does not exist. GitHub treats an unresolvable owner as *no owner*, so the
code-owner requirement in Step 1 will approve trivially.

1. Create (or identify) the real reviewing team in the organization.
2. Grant it write access to this repository.
3. Open a pull request replacing every occurrence of `@sentra/safrs-maintainers`
   in `.github/CODEOWNERS`. This is itself an R2 change.
4. Open `.github/CODEOWNERS` in the GitHub web UI.

**Proof of success:** the CODEOWNERS file view shows **no** yellow "Unknown owner"
or "not a valid owner" annotations on any line. GitHub renders a warning banner
listing each invalid line; an empty warning list is the pass condition.

**Negative test:** temporarily open a draft PR that changes `AGENTS.md`. The PR's
"Reviewers" panel must automatically request review from the real team. If no
reviewer is auto-requested, the pattern is not resolving — fix it before
proceeding. Close the draft PR afterwards.

---

## Step 1 — Branch ruleset for `main`

Settings → Rules → Rulesets → New branch ruleset.

- **Name:** `SAFRS main protection`
- **Enforcement status:** `Active` (not `Evaluate` — evaluate mode logs but never
  blocks)
- **Target branches:** include by pattern `main` (or "Default branch")
- **Bypass list:** empty. Every entry here is a hole in SAFRS-02. If an admin
  bypass entry is unavoidable, record it as an accepted decision (ADR) with its
  blast radius.

Enable these rules:

| Rule | Setting |
|---|---|
| Restrict deletions | on |
| Block force pushes | on |
| Require a pull request before merging | on |
| — Required approvals | at least 1 |
| — Require review from Code Owners | on |
| — Dismiss stale approvals when new commits are pushed | on |
| — Require approval of the most recent reviewable push | on |
| Require status checks to pass | on |
| — Required check | the SAFRS Governance check run — see note below |
| — Require branches to be up to date before merging | on |

Note on the check name — **unverified assumption, confirm in the UI.** A ruleset
matches the name of the *check run*, which comes from the job, not from the
workflow. In `.github/workflows/safrs-governance.yml` the workflow is named
`SAFRS Governance` and the job id is `governance` with no `name:` field, so
GitHub most likely reports the check as **`governance`** and displays it on the
PR as "SAFRS Governance / governance". Select whatever the check-search box
actually offers; do not type a name by hand. If nothing appears, the workflow has
not yet run on a PR against `main` — open any PR once so GitHub learns the check
name, then add it. Picking the wrong name silently yields a rule that gates on a
check that never reports.

**Negative test 1 — direct push to `main` must be rejected.**

```bash
git checkout main && git commit --allow-empty -m "negative test: direct push" && git push origin main
```

Expected: the push is refused. Git prints a `remote: error: GH013` /
`Protected branch update failed` style rejection naming the ruleset, and the
command exits non-zero. If the push succeeds, the ruleset is inactive, is
targeting the wrong branch, or you are on the bypass list.

Clean up: `git reset --hard origin/main`

**Negative test 2 — force push to `main` must be rejected.**

```bash
git push --force origin main
```

Expected: rejected with a message naming the force-push rule, non-zero exit.

**Negative test 3 — merge without code-owner approval must be blocked.**

Open a PR that touches `AGENTS.md` (an R2 path). With zero approvals, the merge
button must be disabled and the PR must display "Review required — at least 1
approving review is required by reviewers with write access" together with the
code-owner requirement. Approving as the PR author must not satisfy it.

**Negative test 4 — merge with a failing governance check must be blocked.**

On the same PR, the merge button must stay disabled while `SAFRS Governance` is
pending or failing, showing "Required statuses must pass before merging". Do not
create a real failure by weakening a checker; use a PR that is genuinely still
running, or observe the pending state before the check completes.

---

## Step 2 — Secret scanning and push protection

Settings → Code security → enable:

- **Secret scanning** — on
- **Push protection** — on
- **Push protection for contributors bypass** — require a reason and, where the
  plan supports it, restrict who may bypass

This is the enforcement for SAFRS-01 and SAFRS_SPEC §16. Without push protection,
"agents do not hold production credentials" is unverifiable after the fact.

**Proof of success:** the Code security page shows both features as Enabled, and
Security → Secret scanning alerts is reachable (an empty alert list is fine).

**Negative test — a pushed test credential must be blocked at the remote.**

On a scratch branch, commit a file containing a syntactically valid but
**revoked or fabricated-format** token of a provider GitHub scans for, then push.

Expected: the push is rejected before the objects land, with
`remote: error: GH009: Secrets detected!` and a listing of the detected secret
type and file/line. The command exits non-zero.

Do not use a live credential for this test. If push protection lets the commit
through, the control is off.

Clean up: delete the scratch branch and the local commit.

---

## Step 3 — Dependency graph

Settings → Code security → **Dependency graph** — on.

This is the prerequisite for dependency review and Dependabot alerts, which back
the "new dependency is R2" rule in the control matrix and the lockfile patterns
in `.safrs/sensitive-paths.json`.

**Proof of success:** Insights → Dependency graph lists the resolved manifests,
including root `package.json` and `pnpm-lock.yaml`. An empty graph means parsing
failed or the feature is off.

Recommended alongside it (enable if the plan allows):

- **Dependabot alerts** — on
- **Dependabot security updates** — on

**Negative test — an added dependency must surface as a reviewable change.**

Open a PR on a scratch branch that adds one dependency to `package.json` and
updates `pnpm-lock.yaml`.

Expected: the PR requests review from the CODEOWNERS team (both paths are
sensitive patterns), and the Dependency graph / dependency review surface reports
the added package. If the PR shows no dependency delta at all, the graph is not
parsing the manifests.

Clean up: close the PR, delete the scratch branch.

---

## Completion record

A step counts as done only when its negative test has been executed and observed
to fail as expected. Record the outcome; a checklist ticked from the settings
page alone is not evidence.

| Step | Setting applied | Negative test run | Observed rejection | Date | Verified by |
|---|---|---|---|---|---|
| 0 — CODEOWNERS owner resolves | | | | | |
| 1 — Branch ruleset for `main` | | | | | |
| 2 — Secret scanning + push protection | | | | | |
| 3 — Dependency graph | | | | | |

## Known limitation

Nothing in this repository can detect drift in these settings. If an
administrator later disables a ruleset, no checker in `tools/safrs/` will notice.
Re-running this checklist on a fixed cadence, or adding an API-based drift
checker, is the only way to keep the evidence current. That checker does not
exist today.
