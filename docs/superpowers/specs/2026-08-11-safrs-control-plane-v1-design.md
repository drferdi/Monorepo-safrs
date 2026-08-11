# SAFRS Control Plane v1 Design — Increment A (Local)

**Status:** ACTIVE (implemented on `feat/safrs-control-plane-v1`; awaiting Chief R2 review)
**Date:** 2026-08-11
**Risk:** R2 (`.safrs/**`, verification controls, root `package.json`, `tools/safrs/**`)
**Scope:** Increment A only — local task ownership + observational status
**Out of scope:** Increment B (GitHub platform drift), Increment C (release provenance), dashboards, databases, SaaS, new dependencies

**Canonical relationships (no duplicate sources of truth):**

| Concern | Owner |
| --- | --- |
| Machine mutation ownership | `<git-common-dir>/safrs-control-plane/active-tasks.json` (local live leases) |
| Multi-agent protocol narrative | `docs/governance/SAFRS_MULTI_AGENT_PROTOCOL.md` (updated surgically after implementation) |
| Session narrative | `.agents/HANDOFF.md` |
| Area milestones | `.agents/PROGRESS.md` |
| Durable decisions | `.agents/DECISIONS.md` / ADRs |
| Governance gate | `pnpm governance` → `scripts/safrs-verify.*` |
| Operator observation | `pnpm status` (read-only) |
| Task mutation helpers | `pnpm task …` (writes registry only; never stages/commits) |

This document is the implemented design contract for Increment A. It does not replace the multi-agent protocol document; narrative ownership rules stay there.

**Related plan:** `docs/plans/active/SAFRS_GOVERNANCE_REMEDIATION_PLAN.md` Phase 2 (single-mutation-owner). This design is the detailed contract for that phase.

---

## 1. Problem and success criteria

Solo Chief needs one obvious observational command and a thin task CLI so that, without editing JSON by hand, the repository can answer:

1. What work is active?
2. Who owns each mutation scope?
3. What is the SAFRS risk tier?
4. Which verification gate is failing right now?
5. What is the single safest next action?
6. What evidence was observed in this run (not cached history)?

Platform control questions (GitHub rulesets, Dependabot drift, CodeQL) are Increment B and remain `not_in_scope` in status output for v1.

**Success (measurable):**

1. Two mutation-active tasks with overlapping path-prefix scopes fail governance and are rejected by `pnpm task claim` / `state`.
2. Non-overlapping mutation-active tasks pass.
3. Terminal tasks (`MERGED`, `CLOSED`, `ABORTED`, `SUPERSEDED`, `FAILED`) do not block new ownership.
4. Malformed registry fails closed with an actionable message.
5. No secret values appear in human or JSON output.
6. `pnpm status` never writes files and never presents a prior run as a current PASS.
7. `pnpm governance` remains the canonical governance gate; status is observational.
8. No new npm/PyPI dependency is introduced.
9. Windows PowerShell (`safrs-verify.ps1`) and Linux (`safrs-verify.sh`) both invoke the ownership checker.
10. HANDOFF, PROGRESS, plans, and Git remain owners of their current concerns.
11. All sibling worktrees read one shared local registry.
12. Registry writes are serialized and atomically replaced.
13. Every changed path is covered by exactly one active task for the current worktree.

---

## 2. Architecture (Option A, Chief-corrected)

1. **Registry:** `<git-common-dir>/safrs-control-plane/active-tasks.json` — local live mutation leases shared by every sibling worktree. It is runtime state and is not committed.
2. **Storage:** `tools/task/src/storage.mjs` resolves the Git common directory, serializes writes with an exclusive lock, rereads under lock, and atomically replaces the registry.
3. **Governance checker:** `tools/safrs/check_task_ownership.py` — validates schema, path safety, expiry, overlap, and changed-path coverage. Registered in local scripts and governance CI.
4. **Status CLI:** `tools/status/` — read-only Node ESM CLI; Bahasa Indonesia human text; English JSON fields; runs relevant read-only checks live.
5. **Task CLI:** `tools/task/` — thin Node ESM CLI for claim / state / close / list; preview-before-write; validates transitions and overlap at mutation time.

Shared pure helpers for path normalization and overlap may live under `tools/safrs/` or a tiny shared module imported by both CLIs and mirrored in Python for the checker. Prefer the smallest duplication that keeps Python and Node deterministic without new packages.

The lease registry is intentionally local to one Git clone. It coordinates sibling worktrees on the same machine, but it is not remote or durable CI evidence. In a clean CI checkout the registry is absent and the changed-path ownership check applies only to that checkout's local working-tree changes; designated R2 review remains the merge control.

---

## 3. Registry schema

Runtime file: `<git-common-dir>/safrs-control-plane/active-tasks.json`

```json
{
  "version": 1,
  "tasks": [
    {
      "id": "TASK-20260811-001",
      "title": "Short human title",
      "state": "EXECUTING",
      "risk": "R2",
      "scope_prefixes": [".cursor/", "tools/safrs/check_topology.py"],
      "allowed_tools": ["local-filesystem", "git", "python3"],
      "owner_id": "agent:cursor-session-20260811-a1",
      "owner_label": "Cursor session (alignment pack)",
      "worktree_id": "worktrees/feat-example",
      "claimed_at": "2026-08-11T12:00:00Z",
      "updated_at": "2026-08-11T14:00:00Z",
      "expires_at": null,
      "notes": "optional; never secrets"
    }
  ]
}
```

### Field rules

| Field | Rule |
| --- | --- |
| `version` | Integer `1` required |
| `tasks` | Array; may be empty |
| `id` | Unique string; recommend `TASK-YYYYMMDD-NNN`; non-empty; no whitespace-only |
| `title` | Non-empty string ≤ 200 chars |
| `state` | One of the lifecycle states below |
| `risk` | `R0` \| `R1` \| `R2` \| `R3` |
| `scope_prefixes` | Non-empty array of normalized repository-relative path prefixes (see §4) |
| `allowed_tools` | Array of strings; may be empty; values should match tool inventory ids when known, but unknown ids are WARN in status only, not governance FAIL in v1 |
| `owner_id` | Stable non-empty string (vendor-agnostic; not an enum) |
| `owner_label` | Non-empty display string |
| `worktree_id` | Automatically derived Git-common-relative id (`main` or `worktrees/<name>`) |
| `claimed_at` | ISO-8601 UTC |
| `updated_at` | ISO-8601 UTC; must be ≥ `claimed_at` |
| `expires_at` | `null` or ISO-8601 UTC |
| `notes` | Optional string ≤ 500 chars; redacted on output if secret-like |

Duplicate `id` values are malformed.

---

## 4. Path prefix model (v1)

v1 uses **normalized repository-relative path prefixes**, not glob intersection.

### Normalization

1. Reject absolute paths (`/…`, `C:\…`, `\\…`).
2. Reject any segment `..`.
3. Reject empty string.
4. Reject wildcards (`*`, `?`, `[`, `]`) and negative patterns (`!`).
5. Convert backslashes to `/`.
6. Strip leading `./`.
7. Collapse duplicate `/`.
8. Directory scopes MUST end with `/` (e.g. `.cursor/`, `packages/api/`).
9. File scopes MUST NOT end with `/` (e.g. `package.json`, `tools/safrs/check_topology.py`).
10. Paths must be repository-relative only (no escape outside repo root).

### Overlap definition

Two prefixes **overlap** if and only if, after normalization, `prefixes_overlap(a, b)` is true:

```text
prefixes_overlap(a, b):
  if a == b: return true
  if a ends with "/" and b starts with a: return true   # a directory ancestor of b
  if b ends with "/" and a starts with b: return true   # b directory ancestor of a
  return false
```

A file prefix (no trailing `/`) is never an ancestor of another path; it only overlaps when identical or when contained under another task’s directory prefix.

Examples:

| A | B | Overlap? |
| --- | --- | --- |
| `.cursor/` | `.cursor/` | yes (identical) |
| `.cursor/` | `.cursor/rules/` | yes (ancestor) |
| `.cursor/` | `.cursor/rules/01-safrs.mdc` | yes (ancestor) |
| `packages/api/` | `packages/ui/` | no |
| `package.json` | `packages/` | no |
| `scripts/` | `scripts/safrs-verify.ps1` | yes |

General globs are explicitly deferred to a later version.

---

## 5. Lifecycle

States (aligned with `SAFRS_MULTI_AGENT_PROTOCOL.md`):

`PROPOSED → CLAIMED → PLANNED → EXECUTING → VERIFYING → REVIEW → MERGED → CLOSED`

Exceptional: `BLOCKED`, `CONFLICT`, `FAILED`, `ABORTED`, `SUPERSEDED`.

`PROPOSED` is allowed in the schema for hand-authored foreshadowing but is **not** mutation-active and is **not** created by `pnpm task claim` in v1.

### Mutation-active (count for ownership / overlap)

`CLAIMED`, `PLANNED`, `EXECUTING`, `VERIFYING`, `REVIEW`, `BLOCKED`, `CONFLICT`

These states hold exclusive rights to their `scope_prefixes` against other mutation-active tasks.
Only the task's recorded `worktree_id` may run `state` or `close`; sibling worktrees may observe it but cannot mutate it.

### Terminal (do not block new ownership)

`MERGED`, `CLOSED`, `ABORTED`, `SUPERSEDED`, `FAILED`

### Allowed transitions (enforced by Task CLI on write)

| From | To |
| --- | --- |
| (new claim) | `CLAIMED` (default), or `PLANNED` / `EXECUTING` via `--state` |
| `CLAIMED` | `PLANNED`, `EXECUTING`, `BLOCKED`, `ABORTED`, `SUPERSEDED` |
| `PLANNED` | `EXECUTING`, `BLOCKED`, `ABORTED`, `SUPERSEDED` |
| `EXECUTING` | `VERIFYING`, `BLOCKED`, `CONFLICT`, `FAILED`, `ABORTED`, `SUPERSEDED` |
| `VERIFYING` | `REVIEW`, `EXECUTING`, `FAILED`, `BLOCKED`, `ABORTED`, `SUPERSEDED` |
| `REVIEW` | `MERGED`, `EXECUTING`, `BLOCKED`, `ABORTED`, `SUPERSEDED` |
| `BLOCKED` | `CLAIMED`, `PLANNED`, `EXECUTING`, `ABORTED`, `SUPERSEDED` |
| `CONFLICT` | `EXECUTING`, `ABORTED`, `SUPERSEDED` |
| `FAILED` | `EXECUTING`, `ABORTED`, `SUPERSEDED` |
| `MERGED` | `CLOSED` |
| `PROPOSED` | `CLAIMED`, `ABORTED`, `SUPERSEDED` |
| `CLOSED`, `ABORTED`, `SUPERSEDED` | (none — immutable) |

`pnpm task close --id …` (preview; `--yes` to write):

- From `MERGED` → `CLOSED`
- From any mutation-active state or `FAILED` → `ABORTED`
- From `CLOSED` / `ABORTED` / `SUPERSEDED` → error (already terminal)
- From `PROPOSED` → `ABORTED`

No `--force` flag in v1. To reach `CLOSED`, the task must first enter `MERGED` via `pnpm task state`.

The governance checker **does not** replay transition history. It only validates the snapshot. Transition integrity is the Task CLI’s responsibility at write time.

No append-only event log in v1.

---

## 6. Expiry

- If `expires_at` is set and `expires_at` < now (UTC) and state is mutation-active → **governance FAIL** and **status FAIL** (zombie ownership).
- Task CLI rejects `claim` / `state` that would leave an already-expired mutation-active task unchanged without extending `expires_at` or moving to a terminal state.
- `state` and `close` load structurally so the owning worktree can move an expired task to a legal terminal state; the resulting registry must pass full operational validation before write.
- Missing `expires_at` (`null`) means no automatic expiry.

---

## 7. Validation split

| Layer | Responsibility |
| --- | --- |
| Task CLI (`pnpm task`) | Preview; validate schema of the prospective registry; validate transition; reject overlap against other mutation-active tasks; write registry; never stage/commit; never read `.env` |
| Governance checker | Validate current file: JSON/schema, unique ids, path safety, expiry, global overlap, and ownership coverage for staged/unstaged/untracked paths in the current worktree |
| Status CLI | Read-only observation; run live checks; no writes |

Do not claim the static checker proves full transition history.

---

## 8. Commands

### 8.1 `pnpm status` / `pnpm status --json`

- Fully read-only: no file writes, no git mutations.
- Human output: Bahasa Indonesia.
- JSON: stable English field names.
- Exit: PASS → 0; WARN → 0; FAIL → 1.
- Overall status severity:
  - **FAIL:** malformed registry; ownership overlap; expired mutation-active task; or live governance probe returned non-zero.
  - **WARN:** no FAIL conditions, but non-fatal issues exist (v1: one or more `allowed_tools` ids absent from `.safrs/tool-inventory.json`).
  - **PASS:** no FAIL and no WARN conditions.
  - Field-level `unknown` (probe unavailable) does not by itself force FAIL; if governance could not be run, `verification.governance` is `unknown` and overall status is at least WARN.
- Platform section: always `not_in_scope` for Increment A.
- Observes current conditions by running relevant read-only probes in-process / subprocess:
  - git: branch, HEAD, dirty summary;
  - registry load + ownership evaluation;
  - live governance: run the same checker list as `scripts/safrs-verify` for the current platform (or spawn that script). Do not read stamp files.
- Record `observed_at` (ISO-8601 UTC) for this invocation only.
- If a probe is skipped or unavailable → that field is `unknown` (never a cached PASS).
- Malformed registry → FAIL.
- Ownership overlap or expired mutation-active task → FAIL.
- Exactly one `next_action` string: Bahasa Indonesia in human mode; English string value in JSON field `next_action`.

Suggested human shape:

```text
SAFRS STATUS: PASS | WARN | FAIL

Kerja aktif:
- <id> | <owner_label> | <state> | <risk> | <scopes>

Repositori:
- branch … | HEAD … | dirty: N paths | konflik ownership: …

Verifikasi:
- observed_at …
- governance: PASS|FAIL|unknown (live)
- failed_checks: …

Platform:
- not_in_scope

Langkah berikutnya:
- <satu instruksi>
```

Suggested JSON top-level keys (stable):

`status`, `observed_at`, `git` `{ branch, head, dirty, dirty_count, sample_paths }`, `tasks` `[…]`, `ownership` `{ ok, conflicts[] }`, `verification` `{ governance, failed_checks[] }`, `platform` `{ state: "not_in_scope" }`, `next_action`, `warnings[]`

### 8.2 Task CLI

Root scripts:

- `pnpm task claim`
- `pnpm task state`
- `pnpm task close`
- `pnpm task list --json`

Implementation: `node tools/task/src/cli.mjs` with subcommands.

#### `pnpm task claim`

Required flags only in v1 (no TTY wizard):
`--id`, `--title`, `--owner-id`, `--owner-label`, `--risk`, `--scope` (repeatable).
Optional: `--state` (`CLAIMED` \| `PLANNED` \| `EXECUTING`, default `CLAIMED`), `--expires-at`, `--notes`, `--tools` (repeatable), `--yes`. `worktree_id` is derived automatically.

Behavior:

1. Resolve the shared Git-common registry. If it is missing, start from `{ "version": 1, "tasks": [] }` in memory.
2. Normalize/validate scopes.
3. Build prospective task; validate no id collision; validate no overlap with mutation-active tasks.
4. Print a preview of the prospective registry write to stdout.
5. Without `--yes`, exit 0 after preview and write nothing.
6. With `--yes`, acquire the shared lock, reread and revalidate, write a same-directory temporary file, atomically replace the registry, and release the lock. Never stage or commit runtime state.

#### `pnpm task state --id … --to <STATE>`

Validate transition table; re-check overlap if the resulting state is mutation-active; preview; `--yes` to write; set `updated_at`.

#### `pnpm task close --id …`

Apply the close rules in §5. Preview; `--yes` to write.

#### `pnpm task list --json`

Read-only list of tasks (English JSON). Optional `--active` filters mutation-active.

Secret safety: apply the same redaction patterns used by `tools/doctor` (TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL|AUTH); never open `.env`.

---

## 9. Governance integration

Add `tools/safrs/check_task_ownership.py` to the check list in:

- `scripts/safrs-verify.ps1`
- `scripts/safrs-verify.sh`

Checker behavior:

- Missing shared registry → treat as an empty task list; changed paths still fail until claimed.
- Invalid JSON / schema / unsafe paths / duplicate ids / expired mutation-active / overlap → FAIL with actionable stderr.
- Empty tasks → PASS only when the current worktree has no changed paths; otherwise coverage fails.
- Print `SAFRS task ownership: OK` on success.

`pnpm governance` remains the canonical gate. Status may invoke the same checkers for live observation but must not be required for CI in place of governance.

---

## 10. Evidence rules

- **No** `.safrs/evidence/last-governance.json` (or any status/governance stamp file) in v1.
- Status never treats historical chat, HANDOFF claims, or prior terminal output as a current PASS.
- Only live probe results for the current invocation are reported, plus `observed_at`.

---

## 11. Dirty tree and partial staging

- Status reports dirty count and a capped path sample (redacted).
- Status and task CLIs do not stage, unstage, or commit.
- Partial staging is reported as part of dirty/git summary when detectable via `git status`; it does not auto-claim scopes.
- Implementation must not use `git add -A`.

---

## 12. Secret-redaction rules

Redact in all human and JSON outputs:

- Values matching secret-like environment names or literal high-entropy credential shapes already handled by doctor redaction helpers when reused.
- Never print contents of `.env`, private keys, tokens.
- `notes` and paths that look like credential filenames (e.g. `*.pem`, `credentials.json`) appear as `[redacted]` / `[redacted-path]`.

---

## 13. Documentation lifecycle

| Document | Role after approval |
| --- | --- |
| This file | Design spec; status moves DRAFT → ACTIVE while implementing; later HISTORICAL when protocol + code supersede detail |
| `SAFRS_MULTI_AGENT_PROTOCOL.md` | Remains CANONICAL; post-implement surgical add: registry path, path-prefix overlap rule, `pnpm status` / `pnpm task` pointers |
| Remediation plan Phase 2 | Mark tasks done when implementation merges |
| Document registry | Register this design id when Chief authorizes a registry edit (separate from this Phase 2 write); peer `docs/superpowers/specs/*` designs are historically unindexed |

**Location rationale:** Chosen path `docs/superpowers/specs/2026-08-11-safrs-control-plane-v1-design.md` matches existing design-spec practice. It is not a second protocol SSOT. `docs/governance/SAFRS_MULTI_AGENT_PROTOCOL.md` stays the CANONICAL protocol. No registry conflict requiring a stop: the registry does not forbid this path; it simply does not yet list superpowers design drafts (same as sibling specs).

---

## 14. File map (implementation target; not created in Phase 2 beyond this spec)

| Path | Action |
| --- | --- |
| `tools/safrs/check_task_ownership.py` | Add checker |
| `tools/task/src/storage.mjs` | Resolve shared state; lock and atomic write |
| `tools/status/src/cli.mjs` (+ messages) | Add status CLI |
| `tools/task/src/cli.mjs` | Add task CLI |
| `scripts/safrs-verify.ps1` / `.sh` | Register checker |
| `package.json` | Add `status` and `task` scripts |
| `tests/governance/test_task_ownership.py` | Checker tests |
| `tests/repository/status-command.test.mjs` | Status contract |
| `tests/repository/task-command.test.mjs` | Task CLI contract |
| `.github/workflows/safrs-governance.yml` | Run checker and ownership tests |
| `.safrs/sensitive-paths.json` | Classify Control Plane logic/tests as verification controls |
| `scripts/test.mjs` | Run repository Node tests from the root gate |
| `docs/governance/SAFRS_MULTI_AGENT_PROTOCOL.md` | Surgical pointer update |
| `.gitignore` | Only if a temp path is needed; prefer no new ignore entries |

Do not touch unrelated Cursor/DX in-flight paths during implementation.

---

## 15. Test matrix

| Case | Expect |
| --- | --- |
| Overlapping mutation-active prefixes | governance FAIL; claim rejected |
| Non-overlapping mutation-active | PASS |
| Terminal task same prefix as new claim | claim allowed |
| Wildcard / `..` / absolute scope | reject |
| Malformed JSON / bad state / duplicate id | FAIL actionable |
| Expired mutation-active | FAIL |
| Illegal transition via `task state` | reject; no write |
| `task` without `--yes` | preview only; no write |
| Status with malformed registry | FAIL exit 1 |
| Status WARN condition | exit 0, status WARN |
| Status does not create files | complete Git status unchanged before/after |
| Secret-like notes | redacted |
| Platform field | `not_in_scope` |
| verify.ps1 and verify.sh list checker | both |

---

## 16. SAFRS risk and review gates

- Classification: **R2**.
- Designated review required before merge.
- Verification-integrity review required because checker + verify scripts change together.
- Review completion is recorded in `.safrs/reviews/verification-integrity.json`. The classifier accepts it only when its approved verdict, reviewer identity, UTC timestamp, immutable PR `base_sha`, strict schema, and SHA-256 fingerprint match the exact current change set. The trusted local base comes from `.safrs/sensitive-paths.json` (`review_base_ref`), independently of whether evidence exists. The fingerprint is built from repository-relative paths and Git blob identities, so Windows CRLF worktrees, local follow-up commits, and Linux CI verify the same canonical content. Missing, malformed, or stale evidence fails closed.
- This local review artifact is not release provenance or an Increment C attestation.
- Security review only if later increments add network/platform probes (not v1).
- Implementation blocked while working-tree ownership conflicts exist on `package.json`, `scripts/safrs-verify.*`, `.safrs/**`, or `tools/safrs/**`.

---

## 17. Explicit non-goals (v1)

- GitHub ruleset/protection/Dependabot/CodeQL drift watchdog (Increment B)
- SBOM / attestations / release provenance (Increment C)
- Glob scopes, negative globs, external lock servers, event logs, web UI
- New dependencies
- Auto-commit, auto-stage, auto-claim from dirty files
- Repairing other agents’ Cursor/DX change sets

---

## 18. Acceptance criteria checklist

1. Overlap via ancestor/identical prefixes fails closed.
2. Non-overlap passes.
3. Terminal states do not block.
4. Malformed data fails safely.
5. No secrets in output.
6. Status is live-only; no evidence stamp files.
7. Platform `not_in_scope` (not false pass/fail).
8. `pnpm governance` stays canonical gate.
9. `pnpm status` is observational (no writes).
10. Task CLI provides claim/state/close/list with preview and `--yes`.
11. Owner identity is vendor-agnostic (`owner_id` / `owner_label` / `worktree_id` / `updated_at`).
12. WARN exit 0; FAIL exit 1.
13. Win/Linux verify scripts both covered.
14. No new dependency.
15. No duplicate narrative SoT versus HANDOFF/PROGRESS/protocol.
16. Two sibling worktrees see the same claim and cannot acquire overlapping scopes.
17. A changed path without exactly one active owner fails governance.
18. Registry mutation is locked and atomically replaced.
19. A sibling worktree cannot run `state` or `close` on another worktree's task.
20. Integrity-review evidence becomes invalid when any reviewed file changes.
