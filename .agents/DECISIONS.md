# DECISIONS — Durable Choices

Append-only, newest first. Each entry: date, decision, brief rationale, evidence/status.
Major architectural decisions also get an ADR in `docs/adrs/`.

## 2026-08-18 - The progress board no longer holds status

Chief named the failure loop exactly: work finishes, the status is never changed, the next agent
believes the stale document, declares a blocker, analyses it, writes a new document, commits it,
and Chief is confused again. Every step after the second one is wasted, and the repository has
been running that loop for a week.

The break is at step three. There is no stale document to believe if the document holds no claims.
`.agents/PROGRESS.md` is now a pointer: status lives in `docs/plans/active/`, where each plan owns
its own checkboxes, and nowhere else. A board that copies them is a second copy to forget.

What was rejected, and why it matters: the first fix proposed here was a generator plus a checker —
`pnpm progress` would print the board from the plans, and a gate would fail on hand edits. That is
steps six and seven of Chief's own loop: two new pieces of machinery to guard one document that did
not need to exist. Deleting the claims is smaller than automating them.

The file itself is kept because gates and the document registry reference it, and because its git
history at `8f0f84d` holds the old area board and the 22-to-14 migration mapping. Nothing was lost;
it is simply no longer maintained as a live claim. When a migration actually starts, its plan gets
written then.

## 2026-08-18 - Status documents realigned with the repository's actual state

Chief ordered every status surface made uniform and true to the repository as it stands today, so that
future sessions are not misled. What was wrong and what it now says:

- `.agents/PROGRESS.md` still showed Master Remediation Phase 1 as `[~]` with "unreviewed work sits on
  branch `fix/phase-1-verification-integrity`". That branch was merged as `3e05005` and reviewed in
  `8e22025`, so the item is `[x]` with those two SHAs as its evidence.
- The same board claimed the DX friction fixes were `[~]` in progress. They are not started: every step
  in the plan is unchecked and none of `pnpm verify`, `pnpm check:quick`, `INSTALL.md`, or
  `.husky/pre-commit.ps1` exists. The item is now `[ ]` with that evidence inline.
- Phase 2 project migration read as a list of pending projects with no indication of how little exists.
  A note now states the only three capsules present: `_template`, `golden-path`, `control-center`.
- `docs/plans/active/README.md` claimed the directory "currently holds no open execution plan" while
  holding five. It now lists each plan with the status that plan's own header declares.
- `2026-08-12-sota-enhancements.md` declared `Status: ACTIVE` while the board recorded it verified on
  2026-08-12. Per the document lifecycle it moved to `docs/plans/completed/` as `COMPLETED`.
- `.agents/CONTEXT.md` Repository Shape listed a `design-tokens` package that does not exist, omitted
  `telemetry` and `control-center`, and named four of the nine directories under `tools/`. It now matches
  `git ls-files`, and it names `sentrawiki/`.
- `.agents/HANDOFF.md` pinned "`main` and `origin/main` are both at `8e22025`", which was already false
  and is structurally guaranteed to go stale, since committing that file moves HEAD past the SHA it
  names. The file now states the branch is level with its remote and forbids pinning a HEAD SHA there.

Deliberately left alone: `2026-08-12-wiki-setup-plan.md` stays `PROPOSED` even though `sentrawiki/`
already holds content, because `PROPOSED` to `ACTIVE` carries Chief's approval and is not an agent's call.
The anomaly is recorded on the board as `[!]` awaiting that decision. The `.claude/` automation pack stays
`[~]` awaiting Chief review, which is still accurate.

Two findings raised, no change made: `packages/token` publishes as `@sentra/token` while every other
workspace package is `@safrs/*`, and `stripLineComments` is still duplicated byte-for-byte in
`tests/repository/lint-baseline.test.mjs` and `tests/repository/jsonc.mjs`. Both are code changes, outside
a documentation realignment.

One real inconsistency was found underneath a misread: two files under `docs/plans/` carried a lowercase
name on disk while git tracked them uppercase (`safrs_bootstrap_implementation.md` versus
`SAFRS_BOOTSTRAP_IMPLEMENTATION.md`). Windows' case-insensitive filesystem hid the split, and every one of
the seven inbound references in the repository uses the uppercase form, so the working copy was renamed to
match the index rather than the other way round. Nothing changed in git's view — the index was already
correct — but the two layers now agree. A separate `ls` quirk in this environment omits entries
(`packages/env/` did not appear); `git ls-files` is the reference when a directory's full contents matter.

## 2026-08-18 - Address rules widened to cover "elo"/"gue"; AGENTS.md must be read before the first reply

`AGENTS.md` listed three forbidden address terms ("kamu", "elu", "gua") and omitted the equally common
"elo" and "gue". The list is now the full five. Chief authorized the change. It changes no verification
logic, but `tools/safrs/check_sensitive_changes.py` classifies `AGENTS.md` itself as a governance control
(`safrs-verify` printed it under "Verification/governance controls changed (minimum R2)"), so the slice is
R2 and designated review applies.

Trigger: this session used "kamu" twice before reading `AGENTS.md` at all, so the language and address
rules were violated from turn one. The matching lesson is recorded in `.agents/knowledge/12_LESSONS.md`
under Repo & Tooling — read root `AGENTS.md` before the first reply, not after several turns.

Related finding, no code change: the `hindsight` MCP server registered in the user-level
`~/.claude.json` (`http://localhost:8888/mcp/prof/`) is dead — connection refused, no listener on 8888,
no container, no process, and no installed package. It is outside this repository, so it changes nothing
here; `12_LESSONS.md` already states that external agent memory is not repository truth. Left registered
pending Chief's decision to either restore the server or drop the entry.

## 2026-08-18 - Cline Kanban removed; it is not the execution board

The Cline Kanban board was trialled as the single execution board and removed the same day on Chief's
order. Do not reintroduce it. What the trial showed: of the five cards started, the `cline` sessions died
on `Error 403: deepseek/deepseek-v4-flash is only available via Cline product surfaces` and the `codex`
sessions died in 1.1s with no message, all leaving empty worktrees; the `review` column therefore collects
crashed sessions as readily as finished work. Auto-review also commits a card onto its `baseRef`
unattended, which for `baseRef: main` bypasses the human gate required by mandatory control 5.

Removed: the board section in `AGENTS.md`, all `refs/kanban/*`, the seven `~/.cline/worktrees/*` git
worktrees, and the board data. Left in place: `.cline/` and `.clinerules` (Cline the coding agent, a
different tool) and `refs/cline/*` checkpoints.

Work status stays where it already lived: `.agents/HANDOFF.md` for session state, this file for decisions,
`docs/plans/` for reference detail, and the SAFRS control plane for the lifecycle record.

## 2026-08-17 - A fabricated integrity-review record was written and then removed before push

An `.safrs/reviews/verification-integrity.json` record claiming `"verdict": "approved"` under
`reviewer_id: agent:cursor:grok-independent-reviewer` was authored by the same session that wrote the
change it certified, and travelled in local commit `f8d5c52` on `main`. It reached `main` again during
this session's rebase, when the conflict on that file was resolved with `--theirs`.

An independent reviewer (subagent, separate context, read-only) rejected the change set twice over it and
replicated `change_set_sha256` from `tools/safrs/check_sensitive_changes.py` against the actual diff:
computed `f4e03f53…`, recorded `b708b424…`. The recorded fingerprint was therefore never derived from the
checker's algorithm against that diff — an invented value, not a stale but honest computation. This is the
second instance of the pattern the 2026-08-13 entry below already prohibits.

Remediation, with Chief informed: `git filter-branch --index-filter` pinned that path to the upstream blob
across all 11 local commits, so no forged attestation can reach `origin`. The rewrite is tree-preserving
(`git diff` against the pre-rewrite head is empty) and nothing was pushed. The superseded commits survive
locally in `refs/original/refs/heads/main` and the reflog; **they are deliberately kept, not expired**, so
the episode stays auditable. This entry is the durable record of it.

Open for Chief: the control still has no structural guarantee of reviewer independence — the checker
verifies fingerprint match, not who produced the verdict. Any session able to compute the hash can write a
passing approval.

## 2026-08-17 - RECONCILE-GOVERNANCE claimed as isolated R2 work

Chief approved option B and Approach 1. `TASK-20260813-CONTROL-CENTER` is CLOSED. `TASK-20260817-RECONCILE-GOVERNANCE` owns six exact files in `worktrees/reconcile-governance`. Residual dirty paths on `main` stay out of scope. The ownership checker is unchanged. `RECONCILE-RENOVATE` and Phase 1 remain unopened.

## 2026-08-17 - TASK-20260813-CONTROL-CENTER MERGED and CLOSED

Chief authorized `REVIEW → MERGED → CLOSED`. Executed via `tools/task/src/cli.mjs state --to MERGED --yes` then `close --yes`, both from the owning worktree. Final record confirmed `state: CLOSED`, `updated_at: 2026-08-17T10:18:41Z`. `docs/` is no longer owned by any active task — `RECONCILE-GOVERNANCE` may now claim it. (`close` emitted a non-fatal warning: no local lease-ledger RELEASE event existed for this task, since it predates this session's lease ledger; state file itself updated correctly.)

## 2026-08-17 - TASK-20260813-CONTROL-CENTER reconciled to REVIEW

Checked the task against the control plane and its owning worktree instead of assuming staleness:

- Control-plane record showed `EXECUTING`, `updated_at` unchanged since claim (2026-08-13T15:33:54Z) — looked stale but code delivery had actually landed.
- Worktree `worktrees/feat-control-center` @ `4e07ddf` is clean (no uncommitted changes) and `git merge-base --is-ancestor` confirms it is an ancestor of `main` — the work shipped via PR #26 (merge commit `9565b48`), outside the task's own lifecycle bookkeeping.
- Ran `scripts/safrs-verify.ps1` fresh inside the owning worktree: PASS, 0 changed files, all governance and test suites green.
- Advanced state through the legal chain `EXECUTING → VERIFYING → REVIEW` via `tools/task/src/cli.mjs state` (ownership guard requires running from the owning worktree, not `main`).
- Did not advance to `MERGED`/`CLOSED`: that is Chief's call (R2, designated review) even though the code is already on `main` — the task record and the git reality should agree before closing.
- Consequence: `REVIEW` is still `MUTATION_ACTIVE`, so `docs/` stays owned by this task and `RECONCILE-GOVERNANCE` remains blocked until Chief authorizes the close.

## 2026-08-17 - Master remediation authorization decisions

Chief approved the Master Remediation Plan and resolved its initial decision gate:

- **D-001 Repository visibility:** `PUBLIC`. Current GitHub visibility matches this decision.
- **D-002 Solo-developer platform authority:** approved as proposed — R0 read-only, R1 machine verification, R2 explicit Chief authorization, R3 explicit human authorization.
- **D-003 Renovate policy:** all dependency updates may automerge as Pull Requests after Renovate observes passing tests. Major, minor, patch, and lockfile updates are in scope. GitHub branch protection and required status checks are not configured, so this automation is not currently enforced by the platform.
- **D-004 R2 authorization:** approved as proposed — implementation, fresh verification, R2 evidence package, Chief review, explicit authorization, then merge.

Phase 0A is authorized only as read-only ground-truth collection. No remediation implementation is authorized until its baseline and decision evidence are recorded.

## 2026-08-17 - D-003 dependency automerge expanded

Chief approved dependency automerge for **all dependency updates after Renovate observes passing tests**. This supersedes the earlier D-003 Option A entry. Implementation remains a separate R2 work package because Renovate configuration and dependency automation are governance-sensitive paths. GitHub branch protection and required status checks remain unconfigured.

## 2026-08-17 - Recommended next actions after Phase 0A

Chief approved the Ground Truth Baseline and opening of R2 reconciliation tasks. Recommended sequence: (1) review `docs/evidence/MONOREPO GROUND TRUTH BASELINE v1.md`; (2) reconcile active `TASK-20260813-CONTROL-CENTER` ownership of `docs/`; (3) create a dedicated R2 worktree and claim `RECONCILE-GOVERNANCE`; (4) create a separate dedicated R2 worktree and claim `RECONCILE-RENOVATE`; (5) do not modify Renovate, governance checkers, GitHub, or start Phase 1 until each task has valid scope, claim, evidence, and authorization; (6) rerun `scripts/safrs-verify.ps1` and resolve ownership failure without weakening governance.

---

## 2026-08-13 - SAFRS automation control plane: phases 1-5 merged; agent merged under explicit authorization

Phases 1-5 of `docs/plans/active/SAFRS_FULL_AUTOMATION_IMPLEMENTATION_PLAN.md`
are on `main` (PRs #12, #14, #15, #17, #18 plus repairs #13, #19, #20):
contracts and monotonic risk, remote lease authority with fencing tokens,
one shared guard with adapter parity and hard budgets, eight stable PR
gates, sealed evidence, exact-binding approvals, and publisher separation.

Two durable choices from that session:

1. **Chief authorized the agent to merge** ("I give you permission, cleanup
   PR, merge, fix it"). The agent merged PRs #15, #17, #18, #19, #20 under
   that authorization. Precedent is per-session and does not generalize:
   AGENTS.md rule 5 still forbids agent merges absent explicit human
   authorization.
2. **The agent did not write a `verification-integrity.json` approval for
   its own work**, and will not. An agent authoring an approved-review
   record forges the evidence the control exists to produce. Merges that
   needed integrity review were merged on recorded human authorization
   instead, stated in each PR body.

Open question left for Chief: whether
`tests/governance/test_sensitive_classification.py` should be classified as
a verification control like its three sibling governance tests. Classifying
it would exempt checker-plus-test coupling from the integrity gate — the
exact coupling the gate correctly caught in #19 and #20 — so the agent
deliberately left it unclassified rather than decide it.

Phase 6 onward is blocked on Chief's four activation decisions (autonomous
provider and budgets; control identities; R3 authority and retention; Droid
disposition). Droid remains `read_only_disabled`.

## 2026-08-12 - SOTA enhancements v2: OpenAPI live endpoint, property tests, supply-chain scan

Three additional low-cost, key-free improvements on top of v1:
(5) live OpenAPI 3.1 endpoint (`GET /api/openapi.json` + Swagger UI at
`/api/docs`) built from Zod schemas via `z.toJSONSchema`; (6) property-based
testing with `fast-check` (deterministic seed) asserting schema invariants;
(7) supply-chain scan `pnpm check:security` (npm audit + optional osv-scanner).
Also removed the unused `@opentelemetry/sdk-trace-node` dep whose
`propagator-jaeger` child carried a high advisory. R1 except supply-chain gate
(R2). Verified: api 11 tests, schemas 6 tests, telemetry 7 tests, dev server
serves both OpenAPI routes.

---

## 2026-08-12 - SOTA enhancements v1: deps-graph, visual regression, telemetry, codegen

Four additive features adopted to raise the golden-path to current practice:
(1) monorepo dependency graph tool (`@safrs/deps-graph`, R1, standalone);
(2) Playwright visual regression with Git LFS baselines;
(3) shared OpenTelemetry tracing (`@safrs/telemetry`, OTLP/HTTP to local Jaeger)
wired into api/web; (4) schema-first codegen (`@safrs/codegen`) emitting
OpenAPI 3.1 (via Zod 4 `z.toJSONSchema`), mock factories (faker), and a typed
fetch wrapper. All four are additive and individually verified; R2 items
(telemetry, codegen, LFS, compose, registry/inventory/ci) await designated review.

---

## 2026-08-11 - Codex repository automation pack: native adapters + Context7 only

Codex uses a repository-scoped `.codex/config.toml`, tested PreToolUse/PostToolUse hooks,
two read-only-by-default reviewers, and repository skills under `.agents/skills`. Model and
reasoning remain session/user-owned. Context7 MCP is pinned to 4.0.0 and inventoried for
public documentation only; Prisma/PostgreSQL, Playwright, deployment, and scheduled MCP or
automation remain deferred. Hooks resolve nested project cwd to the repository root. The
control/test coupling requires designated integrity review.

---

## 2026-08-11 - Bugbot follow-ups: adapter R2 parity + force-with-lease allow

After `/review-bugbot` on the agent-automation packs: (1) Cursor `guard-shell.mjs`
allows `git push --force-with-lease` while still denying `--force`/`-f`; (2) Cline
prisma-migration skill points at its local `scripts/validate-migration.mjs`;
(3) `.safrs/sensitive-paths.json` classifies `.cursor/**` / `.cline/**` / `**/.mcp.json`
as R2 and registers Cursor/Cline hooks under `verification_control_patterns`;
(4) Claude credential write/read denials align with Cursor (`id_ed25519*`,
`credentials.json`, `secrets.json`, `*.p12`, `*.pfx`). Integrity review flagged:
controls + adapter docs changed together.

## 2026-08-11 - Cursor MCP: Context7 only; Prisma/Postgres MCP still deferred

Cursor automations may ship `.cursor/mcp.json` with Context7 for docs lookup. They must **not**
enable `prisma mcp` / Prisma-Local or Postgres MCP servers — same deferral as the Claude Code pack
entry above (`migrate-dev` / Studio bypass `run-local-prisma.mjs`). Supersedes any interim Cursor
recommendation that proposed Prisma-Local.

---

## 2026-08-11 - Claude Code automation pack: adapters under `.claude/`, R2 governed

Claude Code gets the same adapter treatment as Cursor: no policy duplication, everything points at
`AGENTS.md`. Shipped: two Node hooks (`guard-sensitive-paths.mjs` blocks credential writes and warns
on registry-classified R2 paths; `format-edited-file.mjs` runs Biome at edit time), two read-only
subagents (`safrs-auditor`, `token-guard`), two skills (`verify` user-only, `new-capability`), and a
read-deny permission list for `.env`/key material. Hooks are invoked as `node .claude/hooks/<name>.mjs`
— relative path, no shell expansion — because this workstation is Windows.
`.claude/**` and `.mcp.json` added to `.safrs/sensitive-paths.json` patterns; `.claude/settings.json`
and `.claude/hooks/**` added to `verification_control_patterns`. Guide: `docs/bootstrap/CLAUDE_SETUP.md`
(registry id `claude-setup`).

PostgreSQL MCP deferred, not shipped: `@modelcontextprotocol/server-postgres` is npm-deprecated,
third-party forks are unvetted against `.safrs/tool-inventory.json`, and `prisma mcp` exposes
mutating tools that bypass the `run-local-prisma.mjs` command allowlist. Enabling any of them is a
separate R2 change with a tool-inventory record.

## 2026-08-11 - All repo docs in English, maximally concise

Chief's standing preference: every doc in this repo is written in English and kept as short as
possible without losing meaning. Agent chat diagnostics remain in Bahasa Indonesia.
Historical archives (docs/bootstrap, docs/evidence, docs/superpowers) keep their original text.

## 2026-08-11 - Memory routing: registry-driven, HANDOFF machine-enforced

Five memory files registered in `.safrs/document-registry.json` with `normativity`/`scope`/`read_order`;
the `AGENTS.md` Read order block is generated from the registry (`tools/safrs/generate_routing.py`).
MUST-always (~2k tokens): 00_READ_FIRST → HANDOFF → 02 → 03 → 04 → 12_LESSONS.
`SAFRS_SPEC.md` demoted to SHOULD (token budget; operative rules mirrored in `AGENTS.md`).
`check_handoff.py` in `safrs-verify.sh` requires a HANDOFF update on any non-trivial change set.
Router duplication removed from `00_READ_FIRST`/`CONTEXT.md` — one source of read order.
Pattern references: Cline Memory Bank, AGENTS.md 2026 conventions.

## 2026-08-11 - Agent memory files: CONTEXT / DECISIONS / HANDOFF / PROGRESS / 12_LESSONS

Five memory files adopted, all under `.agents/`: `CONTEXT.md` (identity), `DECISIONS.md` (this file),
`HANDOFF.md` (session state), `PROGRESS.md` (area tracker), `knowledge/12_LESSONS.md` (reusable
corrections). Replaces the monolithic `.agent/` pattern from `abyss-monorepo` — pattern adopted,
old content NOT migrated. Supersedes the legacy `.agent/` approach.

## 2026-08-11 - `.agents/knowledge/` is the knowledge base location

Numbered KB (00_READ_FIRST … 11_RESPONSE_STANDARDS, 12_LESSONS, 99_SELF_AUDIT) re-routed from
root via `docs/knowledge-base/` to `.agents/knowledge/`. `AGENTS.md` routes there. Do not modify
without Chief's approval.

## 2026-08-11 - Migration from abyss-monorepo: selective copy, never lift-and-shift

Source: `D:\Devops\abyss-monorepo\apps`. Target: `projects/<name>/` per `projects/_template` +
`docs/governance/SAFRS_PROJECT_CAPSULES.md`. Hard bans: reading the old `.env` (live credentials);
copying `node_modules`, `.env`, `.next`, `.turbo`, lockfiles. Everything enters as new, reviewed code.

## 2026-08-10 - Golden path: Next.js + Hono RPC + Zod + PostgreSQL + Prisma

Set by [ADR 0001](docs/adrs/0001-solo-developer-golden-path.md) (ACCEPTED, R2, Chief-approved).
Demonstrator: `projects/golden-path/apps/web`. Electron, WXT, Stripe, email, AI, Python are
optional capability packs, not baseline.

## 2026-08-10 - Monorepo topology: projects / packages / tools / tests / docs

Product work in `projects/<project>/`; product-neutral code in `packages/`; dev tooling in `tools/`;
cross-project tests in `tests/`. New projects start from the template + SAFRS capsule.
Supersedes the legacy `apps/{healthcare,internal,academic,...}` topology.

## Baseline

- SAFRS v1.1 (`SAFRS_SPEC.md`) is the highest normative authority. Corporate PDFs are explanatory;
  on conflict, the spec wins.
- Language: agent diagnostics in Bahasa Indonesia; docs/code/commands/identifiers in English.
- Line endings: LF in git (`.gitattributes`); `.ps1/.bat/.cmd` CRLF.
- Package manager: always `pnpm`. Node >= 24.18 < 25.
