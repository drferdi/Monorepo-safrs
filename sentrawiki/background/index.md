# Background & key decisions

This page collects the reasoning behind the repository's most consequential choices. The canonical record lives in `docs/adrs/0001-solo-developer-golden-path.md` and `.agents/DECISIONS.md`.

## ADR 0001 — why the solo-developer golden path

[ADR 0001](docs/adrs/0001-solo-developer-golden-path.md) (ACCEPTED, Aug 10) chose a single Next.js deployment unit mounting a package-owned typed Hono API under `/api`, with Zod schemas as the shared contract. The decision owner (Chief) needed a monorepo that makes safe application delivery approachable without hand-writing API documentation, opening several terminals, or remembering fragile setup steps — while preserving all SAFRS v1.1 controls and avoiding inventing a product domain.

Three options were weighed:

1. Separate web and API deployments with manually maintained HTTP documentation (rejected — fragile docs).
2. **A single Next.js deployment unit with Zod-derived contracts (chosen)** — drift is caught by type checking, not a separate Swagger/Postman collection.
3. A generic empty repository with no executable reference path (rejected — no executable baseline).

Electron, WXT, Stripe, email, AI, and Python remain optional capability packs rather than baseline runtime dependencies.

## Key decisions from `.agents/DECISIONS.md`

- **Memory routing (Aug 11)**: five memory files in `.agents/` registered in `.safrs/document-registry.json` with `normativity`/`scope`/`read_order`; the `AGENTS.md` Read order is generated from the registry, and committed changes must update `HANDOFF.md`.
- **Agent adapters (Aug 11)**: Claude Code, Cursor, Codex, and Cline each get vendor-neutral adapters under their own `.claude/`, `.cursor/`, `.codex/`, `.cline/` directories that point at root `AGENTS.md` without duplicating policy. Hooks, subagents, and skills are governed under R2 verification controls.
- **Token enforcement (Aug 11)**: the `@sentra/design-tokens` package was renamed to `@sentra/token`, and raw colour/radius values are forbidden outside `packages/token/src/tokens.css`, enforced by `scripts/check-tokens.mjs` as part of `pnpm check`. The design-token boundary is a shared governance control.

## Why the migration from abyss-monorepo

The decision _Migration from abyss-monorepo: selective copy, never lift-and-shift_ (Aug 11) records that source code came from `D:\Devops\abyss-monorepo\apps` and was re-targeted to `projects/<name>/` using the project template and SAFRS project-capsule conventions. The migration was **selective, not lift-and-shift**: every entry landed as newly reviewed code under the new topology. A separate topology decision (Aug 10) replaced the legacy `apps/{healthcare,internal,academic,...}` layout with `projects/`, `packages/`, `tools/`, `tests/`, and `docs/`. Project mapping reduced 22 source projects to 14 active ones; the pilot (`ferdiiskandar`) was still pending as of Aug 12.

## Pitfalls learned

These recurring corrections are recorded in `.agents/knowledge/12_LESSONS.md` and re-applied on every migration or change:

- **`.env` is never read** — the old `.env` holds live credentials; it is hard-banned from reading and copying during migration. Agent hooks block reads of `.env`-style secret files.
- **Worktrees outside the repo root** — parallel mutation work goes into a sibling directory `../Monorepo.worktrees/<branch>` (per root `AGENTS.md`), never inside the repository root.
- **Lockfile refresh after package changes** — after adding or removing workspace packages, refresh `pnpm-lock.yaml` before `--frozen-lockfile` validation, or the build fails.
- **Evidence before assertions** — never claim test/lint/build passes without running it.
- **No `git add -A` over others' staged work** — stage only your own task's slice.

## Related pages

- [Lore](lore.md)
- [Overview](overview/index.md)
- [Reference overview](reference/index.md)
- [Security](security.md)
