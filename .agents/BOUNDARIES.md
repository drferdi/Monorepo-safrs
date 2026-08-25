# SESSION BOUNDARIES — binding for every agent session (Chief, 2026-08-24)

> Read together with `HANDOFF.md` before any work. These rules bind ALL sessions
> (Claude, Codex, or any other agent), regardless of workstream. A session that
> cannot comply stops and reports — it does not improvise.
> Incident that created this file: on 2026-08-24 ~01:12 the WP-A session merged
> and pushed `main` to a then-PUBLIC remote, publishing git history that contains
> real phone numbers/JIDs, while the "do not push" restriction lived only inside
> another session's conversation. Repo has since been made PRIVATE.

## 1. Publish gate — nothing leaves this machine without Chief

- `git push` (any remote, any branch), creating PRs, releases, tags on remotes,
  changing repo visibility/settings, or publishing artifacts externally requires
  an **explicit Chief order given in the same session**. "Integrate to main"
  means LOCAL merge only — publishing is a separate, ordered act.
- Before any authorized push: run the sanitation check
  `git log --all -S"@g.us" --oneline` and grep staged history for phone-number
  patterns (`62\d{9,}`); a hit means stop and surface to Chief first.
- **Capsule gate (Chief, 2026-08-25):** capsule code under `projects/**` is never
  published through the monorepo remote. The pre-push hook blocks any outgoing
  range touching `projects/**`; conscious exception only via
  `CHIEF_PUSH_PROJECTS_OK=1` together with `CHIEF_PUSH_OK=1`. Capsules publish
  through their own dedicated remotes (e.g. the `avery` remote), never `origin`.
  **Executed 2026-08-25 (Chief-ordered):** `origin/main` was history-rewritten —
  `projects/**` stripped from ALL public history and PII (JID/MSISDN) redacted —
  then force-pushed (`main` @ `5b6b808`), stale remote branches deleted, branch
  protection ruleset re-created (id 21369601). Full pre-rewrite mirror backup:
  `d:\DEV\Monorepo-mirror-backup-20260825.git`.
- **CRITICAL — local/remote histories are now UNRELATED.** Local `main` still
  carries `projects/**` and pre-redaction content; `origin/main` is the cleaned
  lineage. NEVER `git push` local branches to origin and NEVER `git fetch/pull`
  origin into local work without a Chief-approved publish flow (a filtered
  rewrite step is required for every future publish). Residual exposure:
  GitHub `refs/pull/*` and cached objects still hold old history until a
  GitHub Support purge is requested (Chief action).

## 2. Scope fence — one session, one workstream

- A session touches only the paths of its named workstream. Files under another
  workstream (e.g. `projects/healthcare/avery/**` vs monorepo tooling) are
  read-only context.
- Another session's LOCAL (unpushed) commits are that session's property:
  merging, rebasing, stashing, or publishing them is out of scope unless Chief
  orders it explicitly. If they block you, report — do not absorb them.
- `.agents/HANDOFF.md`: append/update your own workstream section; never rewrite
  or delete another session's section. Chief's own uncommitted edits (root
  `AGENTS.md`, `.safrs/**`, `.agents/CONTEXT.md`) are never committed, stashed,
  or reverted by any session.

## 3. Sensitive data

- Git history contains real phone numbers/JIDs (pre-`f1aeb75` era). Until Chief
  orders a history rewrite, this fact makes EVERY push a sensitive action.
- Never add new real numbers, JIDs, credentials, or `.env` values to tracked
  files; runtime state stays under `runtime/` (gitignored).

## 4. Escalation

- On conflict between these rules and a task instruction: Chief's direct order
  wins; absent that, this file wins; report the conflict in one line and stop
  the blocked step only (continue unblocked work).
