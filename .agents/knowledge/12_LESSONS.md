# 12_LESSONS.md

Reusable corrections — born from real mistakes, not rules invented up front.

Entry rules:

- One-liners only; one lesson per line, each with date and brief context.
- Add only when: the same mistake happened **twice**, review found missing context,
  or Chief corrected the same thing across sessions.
- Delete lessons that no longer apply — don't pile them up. No duplicates; tighten existing entries.
- Project-specific lessons live in `projects/<name>/AGENTS.md`, not here.

---

## Repo & Tooling

- On Windows a file's case on disk can differ from the case git tracks, and the case-insensitive filesystem hides it; `git ls-files` is the reference, and `ls` can also silently omit entries (2026-08-18, `docs/plans/` held two files whose disk name was lowercase while the index held uppercase, and `ls` did not list `packages/env/`).
- Read root `AGENTS.md` before the first reply of a session, not after several turns — its language and address rules bind from turn one (2026-08-18, Chief corrected forbidden-term use twice).
- Rehydrate = Always (MUST) only, one parallel batch; Always (SHOULD) is not a second mandatory pass (2026-08-18, Chief: rehydrate too slow).
- Always `pnpm` — never `npm` or `yarn` (2026-08-11, abyss-monorepo legacy).
- Never claim test/lint/build passes without running it — evidence before assertions (2026-08-11).
- After adding/removing workspace packages, refresh the lockfile before `--frozen-lockfile`
  validation (2026-08-11).

## Source of Truth

- Never quote archived files or old conversations as current truth — verify paths on disk first
  (2026-08-11).
- ChatGPT Memory and conversation context are not repo SSOT — truth lives in repo files (2026-08-11).

## Migration & Safety

- From `abyss-monorepo`: never read `.env` (live credentials); never copy `node_modules`, `.env`,
  `.next`, or lockfiles (2026-08-11).
- Never `git add -A` while someone else's work is staged — stage only your own task's slice
  (2026-08-11).
