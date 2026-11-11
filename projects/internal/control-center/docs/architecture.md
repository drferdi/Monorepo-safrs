# Control Center — architecture

## Shape

One Next.js App Router deployment unit at `apps/web`, running on the Node runtime so it can read
the filesystem, inspect git, and run allowlisted repository tools. It is a local operator surface,
never deployed.

```
apps/web/src/
  app/                  page (SSR snapshot) + client ControlCenter board
  lib/situation.ts      pure Situasi SAFRS verdict from LiveSnapshot
  lib/exec/             allowlisted command executor + audit log
  lib/repo/
    root.ts             repository root resolution + path containment
    types.ts            shared vocabulary
    git.ts              read-only git via execFile (never a shell string)
    catalog.ts          feature definitions with evidence paths
    registry.ts         resolves catalog against disk, derives status
    gates.ts            saf gate --all
    control-plane.ts    tools/status --json
    health.ts           tools/doctor --json
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

Home **Situasi** aggregates gates, plane, health, and feature attention via `deriveSituation` —
still derived, never invented.

## Built

- Feature registry + evidence-derived status
- Live readers: git, workspace map, doctor, status/control plane, publication gates, knowledge registry, library figures
- Allowlisted executor (`runCommand`): fixed argv, confirmation phrases for mutations, audit trail under `database/logs/control-center.log`, R3 absent by construction
- Situasi SAFRS home (verdict-first) using Sentra tokens (`@sentra/token`)
- Soft refresh every 30s on Situasi via `router.refresh()` (re-runs SSR readers; no polling API)

## Boundaries

- No `@safrs/env/server` import. The dashboard must render when nothing else is ready.
- No caching: `export const dynamic = "force-dynamic"`. A cached page could report a state that no
  longer exists.
- No production credentials; no R3 execution from this board.

## Not yet built

Corpus browse/query UI, Expert Mode, per-feature detail routes, and a supervisor for long-running
processes (`pnpm dev`, corpus pipeline). See root `docs/dashboard-integration.md`.
