# Control Center — architecture

## Shape

One Next.js App Router deployment unit at `apps/web`, running on the Node runtime so it can read
the filesystem and inspect git. It is a local operator surface, never deployed.

```
apps/web/src/
  app/                  server components only; no client boundary yet
  lib/repo/
    root.ts             repository root resolution + path containment
    types.ts            shared vocabulary
    git.ts              read-only git via execFile (never a shell string)
    catalog.ts          feature definitions with evidence paths
    registry.ts         resolves catalog against disk, derives status
```

## The one rule that shapes everything

**Status is derived, not declared.** `catalog.ts` says what would prove a feature exists;
`registry.ts` checks those paths and decides. Consequences:

- A deleted file turns its feature red with no catalog edit.
- A catalog entry pointing at nothing resolves to `error`, not to a plausible-looking card.
- Work that lives on an unmerged branch resolves to `requires-human-action` with the branch named,
  instead of vanishing.

Branch detection runs *before* the partial verdict, because a feature can leave incidental traces
in the checkout (a tracked manifest, a data directory) while its implementation is elsewhere.

## Boundaries

- No `@safrs/env/server` import. The dashboard must render when nothing else is ready.
- No caching: `export const dynamic = "force-dynamic"`. A cached page could report a state that no
  longer exists.
- No database, no network, no credentials.

## Not yet built

Command execution (an allowlisted, confirmed, audited executor), the doctor/status/gate adapters,
Expert Mode, and per-feature detail routes. See `docs/dashboard-integration.md`.
