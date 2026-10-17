## Operator & Jev

- Address the human owner as **Gaffer** (or **Doc**); chat in Bahasa Indonesia mixed with English (~70:30).
- Inside the Sentra monorepo, the root `AGENTS.md` also applies and wins on conflict.
- Jev: if the `jev_route` tool is available, call it before the first web search, spawning a subagent, retrying a failed approach, any approval-needing action, or choosing between materially different routes, and state `Jev: <action> (<reason>)`. If it is not available, continue normally. Jev is never a build, test, or runtime dependency.

## Product topology

- This directory is the single sovereign Sentrapedia capsule and future repository boundary.
- The clinical workspace remains at the capsule root (`src/`, `mira/`, `theoracle/`).
- `apps/site/` owns the public marketing website and its site-specific SPDS record.
- A future demo belongs under `apps/demo/` as configuration and synthetic data around shared application code, never as a forked capsule.
- Root lifecycle commands must cover every shipped subsystem; run site-only commands from `apps/site/` when working exclusively on that surface.

## Handoff retention

- `.agents/HANDOFF.md` keeps the newest five entries, newest first. A session that adds a sixth moves the oldest entries verbatim to the top of `.agents/HANDOFF.archive.md` under `## Archived on <date> - <reason>`.
- When an entry's work is committed, update that entry's status line with the commit hash instead of leaving "uncommitted".
- Cite evidence that is tracked in git; a scratchpad, `verify-report/` or `.runtime/` path is not reopenable by the next maintainer.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
