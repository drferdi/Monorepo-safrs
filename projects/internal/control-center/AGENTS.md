# AGENTS.md — `projects/internal/control-center`

Root `AGENTS.md` governs. This capsule narrows scope; it does not weaken any root control.

## What this capsule is

The Sentra Control Center: a local, Node-runtime Next.js application that reads this repository
directly and presents every capability it owns — with an honest status for each — to a solo,
non-coding operator.

It is an **operator surface**, not a product. It does not deploy, does not talk to production, and
holds no credentials.

## Non-negotiable rules for this capsule

1. **No invented status.** A feature's status is computed from evidence on disk
   (`apps/web/src/lib/repo/registry.ts`). Never hand-author a status field, and never render a
   feature as working when its evidence is absent. If something cannot be observed, say so.
2. **Every filesystem read goes through `repoPath()`** in `apps/web/src/lib/repo/root.ts`. It
   rejects absolute paths and traversal. Do not call `node:fs` with a caller-supplied path anywhere
   else.
3. **Never build a shell command from a string.** Use `execFile` with an argument array, as
   `apps/web/src/lib/repo/git.ts` does. Repository content is untrusted data.
4. **Read-only by default.** Any action that mutates the machine must be explicitly allowlisted,
   must state its effect before running, and must require confirmation. R3 operations are never
   executable from here.
5. **No secrets in the UI, logs, or responses.** Do not read `.env`; report only whether required
   variables are present.
6. **Design tokens only.** Use `@sentra/token`. Raw colour and radius values are forbidden and are
   caught by `pnpm check:tokens`.
7. **Do not import `@safrs/env/server`.** This dashboard must start and render when the rest of the
   machine is not ready — diagnosing that state is its purpose.
8. **User-facing strings are Indonesian.** Code, identifiers, paths, commands, and comments stay in
   English.

## Commands

```bash
pnpm --filter @sentra/control-center dev        # http://localhost:3100
pnpm --filter @sentra/control-center build
pnpm --filter @sentra/control-center typecheck
pnpm --filter @sentra/control-center lint
```

## Risk

Changes inside `apps/web/src/lib/repo/` affect how the whole repository is reported and are at
least **R2** once command execution lands. Presentation-only changes are **R1**.

## Related

- `docs/feature-inventory.md` — the human-readable twin of the registry
- `docs/dashboard-integration.md` — how the wiring works
