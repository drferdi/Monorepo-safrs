# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-18 (status documents realigned with the repository's actual state)

## Current state

- **There is no Kanban board, in any form.** Do not reintroduce the Cline app or a markdown board.
- Status tracking lives in `.agents/`: `PROGRESS.md` (area/phase), this file (session), `DECISIONS.md` (durable). `docs/plans/` is reference only.
- Rehydrate is MUST-only: one parallel batch of the Always (MUST) list. Always (SHOULD) waits until a task is assigned.

## Work in flight

Nothing. `main` is level with `origin/main` and the working tree holds no content changes
(`git diff --name-only` is empty; the entries `git status` shows are stat-cache noise from the
LF renormalisation). Never pin a HEAD SHA in this file — it goes stale the moment this file is
committed. Read the SHA from `git log`.

Shipped this session, in order:

- `78c62f9` — two R2 policy slices: forbidden address terms widened to five, rehydrate narrowed to the Always (MUST) list.
- `3e05005` — merge of `fix/phase-1-verification-integrity` (`3ecc116`) on Chief's authorization. It pins `* text=auto eol=lf` and Biome `lineEnding: "lf"`, so line endings are now deterministic on every platform.
- `74497c0` — the two tests that merge broke, realigned. `precommit.test.mjs` now asserts a literal LF instead of branching on platform; `workspace-config.test.mjs` reads `biome.jsonc` through the new JSONC parser in `tests/repository/jsonc.mjs`. Both expectations are stricter than what they replaced.
- `8e22025` — integrity review evidence rebound to `base_sha 374e425dde71…`, `change_set_sha256 9da8491c7cea…`, recomputed from scratch by an independent read-only reviewer and approved by Chief.

- The status documents themselves, realigned with what the repository actually contains: Master
  Remediation Phase 1 marked done, the DX friction fixes corrected from "in progress" to not started,
  the three real project capsules named, `docs/plans/active/README.md` rewritten to list the five plans
  it actually holds, the completed SOTA plan moved to `docs/plans/completed/`, and
  `.agents/CONTEXT.md` Repository Shape rebuilt from `git ls-files`. Rationale and the two findings
  left untouched are in `DECISIONS.md`.
- A follow-up correction: two files under `docs/plans/` were named lowercase on disk while git tracked
  them uppercase, and the first draft of `docs/plans/active/README.md` copied the lowercase form. The
  working copy was renamed to match the index, the README now cites the tracked name, and the lesson in
  `12_LESSONS.md` was rewritten — the cause is a Windows case split, not an `ls` bug.
- A second follow-up: `SAFRS_GOVERNANCE_REMEDIATION_PLAN.md` and
  `SAFRS_FULL_AUTOMATION_IMPLEMENTATION_PLAN.md` declared no status in their headers, so the
  README's status column for them was sourced from `PROGRESS.md` rather than from the plan itself.
  Both now carry a `**Status:**` line, and every plan under `docs/plans/active/` declares its own.

Verified: `scripts/safrs-verify.sh` PASS, 67/67 repository tests, typecheck 8/8, `pnpm lint`
clean after the worktree was renormalized to LF.

## Waiting on Chief

Nothing. Every open decision was settled on 2026-08-18, the last two by Chief delegating the
choice. What was decided:

| Decision | Outcome |
| --- | --- |
| D-001 repository visibility | Stays **public**. It already was; the documents that said private are corrected. `.env` is gitignored and has never been committed |
| D-002 platform authority model | Adopted as recommended: R0 free, R1 on machine verification, R2 on Chief's explicit yes, R3 on explicit human authorization. GitHub enforces the machine gates and never demands a second human who does not exist |
| D-003 Renovate policy | Patch, minor, pin, digest, and lock file maintenance merge on their own once tests pass. Majors group into one pull request and wait for Chief |
| D-004 R2 authorization | Chief's explicit "yes" is the approval. No second reviewer exists or is required. Agents never approve |
| Activation gate 1 — provider and budgets | No runner named. Autonomy is capped at R1 for whenever one is; R2 always stops for Chief |
| Activation gate 2 — control identities | Not created. Chief's own account is the publisher until Phase 6 actually starts |
| Activation gate 3 — R3 authority and retention | Chief is the approver. Evidence kept two years. R3 stays inert until its adapter, dry-run, rollback, and postcondition exist |
| Activation gate 4 — Droid | Nothing changed. `.droid/` is present and untouched; the gate was only about running Droid unattended in GitHub Actions, which never existed here |
| Sentra wiki plan | Approved, now `ACTIVE` |
| `.claude/` and `.codex/` packs | Accepted. Chief built them; they were never an open question |
| `hindsight` MCP server | Removed from `~/.claude.json`, and the dead recall rule dropped from the global `CLAUDE.md` |

Removed as non-decisions: Smartboard Phase B/C has no code in this repository, and `semayot`
appeared nowhere except the board itself.

Standing rule: do not turn work Chief already directed into a decision Chief has to make again,
and do not list something as pending when the thing itself does not exist here.

## Governance remediation — closed 2026-08-18

`SAFRS_GOVERNANCE_REMEDIATION_PLAN.md` is `COMPLETED` and moved to `docs/plans/completed/`. Every
box is ticked or explicitly dropped with its reason written in the plan. Three of them are refusals
to add something, and those matter more than the additions:

- **Branch protection on `main` is deliberately not enabled.** With one human, requiring code-owner
  review means Chief approving Chief's own pull requests while work stops. The machine gates in CI
  are the enforcement. Conformance therefore stays at **Core** and Controlled is not claimed.
- **Email/Stripe stays an optional pack.** No caller exists, so installing it would buy dependencies
  and a review for nothing.
- **Nothing was added to `AGENTS.md`,** and the KB split was declined. Fourteen files nobody revises
  do not improve by becoming twenty-eight.

Held by the environment, not by the repository: `pnpm dev`, `db:seed`, and `db:studio` cannot be
verified while Docker is down.

## Notes, not decisions

- `stripLineComments` is duplicated in `lint-baseline.test.mjs` and `jsonc.mjs`; dedupe in its own change.
- `packages/token` publishes as `@sentra/token` while every other workspace package is `@safrs/*`.
- Docker is down, so `tests/integration/database.test.ts` cannot run (`ECONNREFUSED 127.0.0.1:54329`).
- Do not reintroduce a Kanban board, app or markdown.

## Session guardrails

- PowerShell; `;` not `&&`; explicit staging only; never `git add -A`.
- Evidence before assertions.
- **Close the loop in the same commit.** A change set that finishes a piece of work ticks its box
  in its plan under `docs/plans/active/` in that same commit, with the commit or path as the
  citation. Do not leave it for later — later never came, which is why the board drifted for a week.
  `tools/safrs/check_status_claims.py` catches the provable half: a done box citing a commit or a
  path that does not exist. It cannot catch a box you simply forgot, so that part is on you.
