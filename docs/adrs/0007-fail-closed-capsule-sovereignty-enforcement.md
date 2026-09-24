# ADR 0007 — Fail-Closed Enforcement of Capsule Sovereignty and Capsule-Owned Agent Context

- Status: Accepted (designated R2 review by Chief, 2026-09-24)
- Risk: R2 (verification controls, CI, shared package schema, canonical agent knowledge,
  agent session protocol)
- Date: 2026-09-24
- Deciders: Chief
- Records: the supersession of ADR 0001 by ADR 0006, which was never marked
- Related: ADR 0006, `docs/architecture/MONOREPO_PURPOSE.md` (I-01, I-03, I-05, I-06, I-08)

## Context

ADR 0006 made capsule sovereignty the core repository invariant and named empirical extraction
as its decisive proof. A read-only architecture review on 2026-09-24 found that the invariant
is stated clearly but is not enforced by machine, and that the enforcement tooling fails open.

Observed evidence (commands run from the repository root on 2026-09-24, against the working
tree of local branch `feat/coding-brief-v2` at `0d5b748e`; local `main` at `21f47742` does not yet
contain the `internal/prompt` and `internal/unicom` capsules):

1. **Coverage is opt-in.** `tools/safrs/check_project_independence.py` discovers capsules only
   through `projects/*/*/project.contract.json`. Four of nine capsules have no contract
   (`healthcare/avery`, `internal/control-center`, `internal/golden-path`, `product/sentrabot`),
   including the two most root-coupled ones, so the checker reports success without inspecting
   them. The checker describes itself as advisory and is not called by `scripts/safrs-verify.sh`,
   `scripts/safrs-verify.ps1`, or any workflow. `tests/architecture/test_project_independence.py`
   is not run by CI either.
2. **The proof tooling cannot produce a result.** `node tools/project-standalone/src/cli.mjs
   status` aborts on the first invalid contract. `internal/prompt` and `internal/unicom` fail
   validation. Part of that failure is a validator defect: any argument matching the URI-scheme
   pattern `^[A-Za-z][A-Za-z0-9+.-]*:` is treated as an absolute path, so the common script name
   `deploy:dry-run` is rejected (confirmed: `safeRelativePath("deploy:dry-run") === false`). The
   Python checker applies the same pattern. The other part is real contract drift:
   `externalDependencies` are plain strings, and `smoke` uses unsupported shapes. The remaining
   three capsules time out, because the checker enumerates every file under the capsule,
   `node_modules` included, before it filters, and does so three times per capsule against a
   30-second budget.
3. **Agent doctrine contradicts the invariant.** `.agents/knowledge/03_ARCHITECTURE.md` is the
   fourth mandatory read in every session. It calls `projects/internal/golden-path/apps/web` "the
   canonical baseline", tells agents to "reuse shared capabilities", and describes root
   `packages/*` as the reusable path for projects. `MONOREPO_PURPOSE.md`, which is read seventh,
   and ADR 0006 say the opposite. ADR 0001 remains `ACCEPTED` and is not marked as superseded.
4. **The coupling pattern recurs.** Commit `3371d9e5` ("group project capsules by domain")
   added six `SentraBot*` models to the root `packages/database/prisma/schema.prisma`. No
   migration creates their tables (only `0001_init` and `0002_align_demo_schema` exist, applied
   through `migrate deploy`), no root code references them, and `projects/product/sentrabot`
   owns its own `packages/db`.
5. **A CI gate is silently skipped.** In `.github/workflows/ci.yml`, full type checking runs
   only when `packages/database/src/sentrabot/bots.ts` exists. That file does not exist, so
   `@safrs/database` and `@safrs/api` are never type checked in CI.
6. **Capsule agent state lives at the root.** Only `healthcare/avery` has a capsule `.agents/`
   folder. `product/sentrabot` keeps a handoff in a gitignored `.agent/` folder (singular) next to
   a development database dump. The other seven capsules have no agent folder at all. The root
   `.agents/HANDOFF.md` currently describes `internal/control-center` work, and the root
   `.agents/DECISIONS.md` holds entries that concern single capsules (Smartboard, Portfolio,
   Sentra Bot, Avery, Control Center, golden-path). The cause is mechanical:
   `tools/safrs/check_handoff.py` requires the root handoff to change whenever any file changes,
   including in capsule-only change sets. The checker therefore pushes capsule state into the
   root file. This is the governance-friction defect that `AGENTS.md` "End of working session"
   already names. `tools/safrs/check_sensitive_changes.py` carries a second copy of the same
   memory-file list to compensate. There is also an exposure risk. Per `.agents/BOUNDARIES.md`,
   the root control plane is published to the public `origin` through a filtered flow that strips
   `projects/**`, while capsules publish only through their own remotes. Capsule facts written
   into the root `.agents/` therefore bypass that separation and can reach the public repository.

Together these facts mean the most important invariant has the weakest enforcement, green
verification output does not show that capsules are sovereign, and a capsule's working memory
does not travel with it when it is extracted.

## Options considered

1. **Keep the status quo: opt-in discovery and an advisory checker.** Rejected. It fails open:
   a capsule escapes all checks simply by lacking a contract, which contradicts I-05 and I-06.
2. **Require every capsule to be standalone before any merge.** Rejected. It would block all
   work on inherited debt (golden-path, control-center), turn deterministic enforcement into
   human interruption, and conflict with the inherited-failure rule in `AGENTS.md`.
3. **Fail-closed coverage with an explicit known-nonconformance record.** Accepted. Every capsule
   is either verified or explicitly recorded as non-conformant. Unknown or stale states fail.
   Recorded debt does not block unrelated work.
4. **Keep capsule agent state out of Git.** Rejected by Chief on 2026-09-24. A gitignored
   handoff cannot be checked by a git-based gate, is invisible in new worktrees, and is lost on a
   fresh clone. Tracking it is accepted, with the content rule in decision 7.
5. **Run full empirical extraction for every capsule on every pull request.** Deferred. It is the
   right end state for changed capsules, but its cost and run time need a separate work package
   once decisions 1 and 2 below are in place.

## Decision

1. **Coverage is fail-closed.** Every directory at `projects/<domain>/<capsule>/` except
   `projects/_template` must have a valid `project.contract.json` or an entry in
   `.safrs/known-nonconformance.json`. Each entry states the capsule, reason, remediation
   reference, owner, and review date. The following conditions fail verification:
   - a capsule with neither a contract nor an entry;
   - an entry for a directory that does not exist;
   - an entry for a capsule that also has a contract.

   An entry past its review date is reported as overdue but does not block merges. The record is
   current-state evidence, not a normative exception, as `AGENTS.md` "Known non-conformance"
   requires.
2. **The structural checker is a blocking control.** `check_project_independence.py` is no
   longer advisory. It runs in `scripts/safrs-verify.sh`, `scripts/safrs-verify.ps1`, and the
   SAFRS Governance workflow, and it must finish within the budget that
   `tools/project-standalone` gives it. Directory traversal prunes skipped directories
   (`node_modules`, `.next`, `dist`, and similar) instead of enumerating and then filtering.
   `tools/project-standalone/**` is classified as a verification control in
   `.safrs/sensitive-paths.json`.
3. **Path classification has one definition.** In contracts, a value is path-like only if it:
   - is `.` or `..`;
   - contains `/` or `\`;
   - is a drive reference: any value that begins with a single letter followed by `:`
     (`^[A-Za-z]:`). Drive references are always rejected, including `C:`, the drive-relative
     forms `C:x` and `C:outside.exe`, and `C:\x`;
   - carries a package-protocol prefix (`file:`, `link:`, `portal:`, `workspace:`), in which case
     the remainder is evaluated as a path.

   A path-like value is accepted only if it stays inside the capsule: it is not absolute on any
   platform, has no `..` segment at all, and is not a non-http(s) scheme value that contains a
   separator (for example `ftp://example.com/x`), which is rejected. Any `..` segment is rejected
   even when the value would resolve inside the capsule (`x/..`, `a/../b`, `..\x`), because
   contract commands run from the capsule root and never need one. Any contract field or command
   argument that contains a NUL character is rejected. These two rules apply to contract fields and
   command arguments; `file:` and `link:` dependencies in `package.json` keep their containment
   check, where capsule-local workspace links with `..` are legitimate. `http:` and `https:` URLs
   are handled as URLs. A URL that embeds credentials is rejected by both the Node validator and
   the Python checker. Every other value, including multi-letter script names such as
   `deploy:dry-run`, is an opaque argument. The Node validator and the Python checker implement
   this definition and share one set of test vectors
   (`tools/safrs/fixtures/path-classification.json`).
4. **Agent doctrine has one source of truth.** Agent-facing knowledge must not contradict
   `MONOREPO_PURPOSE.md` or ADR 0006. `.agents/knowledge/03_ARCHITECTURE.md` is rewritten to
   describe the control-plane and capsule model. It lists golden-path only as legacy
   non-conformance. ADR 0001 becomes `SUPERSEDED` by ADR 0006. Its technology choice (Next.js App
   Router on Node.js, Hono, Zod, PostgreSQL, Prisma) remains a recommended default stack for new
   capsules, applied inside each capsule with capsule-owned manifests, lockfile, and
   configuration.
5. **Root shared packages stay product-neutral.** Root `packages/*` carry no product-specific
   code, schema, or data models. Product data models live only in the owning capsule. The
   `SentraBot*` models are removed from the root Prisma schema.
6. **CI gates are visible and stable.** A conditional CI step must key on a condition that
   reflects the repository shape it serves, never on an incidental file. The type-check sentinel
   is replaced so that full type checking runs whenever its consumers exist.
7. **Agent context is capsule-owned.**
   - **Required files.** Every capsule has a tracked `.agents/` folder containing:
     - `HANDOFF.md`: current state, work in flight, blockers, and next action; overwritten
       each session, never appended;
     - `DECISIONS.md`: an append-only log of durable decisions that concern only this capsule;
     - `CONTEXT.md`: capsule identity, covering purpose, owner, stack, where the contract and
       commands live, and what must not change casually.

     `knowledge/` and `skills/` are optional. A capsule has no `PROGRESS.md`, because status
     lives in plans, per the lesson recorded in the root `.agents/PROGRESS.md`.
   - **Root scope.** The root `.agents/` covers only the monorepo control plane: root tooling,
     governance, CI, `packages/`, and cross-capsule orchestration. It holds no capsule state.
   - **Scope-aware handoff check.** A changed file under `projects/<domain>/<capsule>/` requires
     that capsule's `.agents/HANDOFF.md` in the same change set. Any other changed file requires
     the root handoff. A capsule-only change set never requires the root handoff. The
     memory-file set is defined once and shared by `check_handoff.py` and
     `check_sensitive_changes.py`.
   - **Coverage.** A capsule without the three required files fails verification, like a
     capsule without a contract (decision 1). There is no known-nonconformance exemption,
     because the files are cheap to create.
   - **Content rule.** The folder is tracked and publishes with the capsule through the
     capsule's own remote. Treat it as public regardless of that remote's current visibility. It
     must never contain secrets, credentials, tokens, phone numbers, WhatsApp identifiers,
     personal data, or database dumps. Name environment variables, never their values.
   - **Enforcement limit.** Which file a fact belongs in is a content judgment, not a
     machine-checkable property. Routing and review enforce it. The scope-aware check removes
     the mechanical pressure that caused the leakage.

## Consequences

- A green SAFRS verification now means that every capsule is either structurally verified or
  explicitly recorded as known debt. It can no longer mean "not inspected".
- `internal/prompt` and `internal/unicom` must correct their contracts before the checker becomes
  blocking. The work package sequences this so that no gate turns red on inherited state.
- Re-enabling full type checking may surface existing type errors in `@safrs/database` and
  `@safrs/api`. They are inherited baseline, to be fixed or tracked, never suppressed.
- Decision 3 was corrected after the test-driven WP-A run: the originally stated drive pattern
  `^[A-Za-z]:([\\/]|$)` would have accepted drive-relative paths such as `C:outside.exe`, which
  the existing test vectors reject.
- Agents stop receiving contradictory doctrine at session start, which removes the most likely
  driver of recurring root coupling.
- The known-nonconformance record makes remediation debt visible. Initial entries are
  `internal/golden-path`, `internal/control-center`, `healthcare/avery`, and `product/sentrabot`.
- A capsule's working memory travels with it on extraction, consistent with I-01. An agent
  working in one capsule reads and writes that capsule's state instead of a shared root file.
- Capsule entries in the root `.agents/DECISIONS.md` are copied to their capsule with provenance.
  The root entry is replaced by a one-line pointer, and git history keeps the original.
- The session protocol changes in the root `AGENTS.md`, the `safrs-session` skill, the capsule
  template, and every capsule `AGENTS.md`.
- The verification tools and the rules they verify change together. Under `AGENTS.md` rule 7
  this requires elevated R2 review.

Out of scope, and each needing its own decision or work package:

- the placement of `internal/control-center`, which reads the repository by design and may belong
  to the root control plane rather than `projects/`;
- contracts for `product/sentrabot` and `healthcare/avery`;
- a CI matrix that runs empirical extraction for changed capsules;
- the golden-path capsule migration;
- extending the contract schema with a desktop-application smoke probe;
- machine secret scanning. `MONOREPO_PURPOSE.md` I-05 lists it, but no workflow runs it. Only
  the pre-push sanitation grep in `.agents/BOUNDARIES.md` and the `.husky/pre-push` gates exist
  today. That matters more once capsule agent state is tracked and published through capsule
  remotes.

## Implementation

Tracked in the work package `docs/plans/active/2026-09-24-adr-0007-sovereignty-enforcement.md`.
Active plans are intentionally untracked; see `docs/plans/active/README.md`.
