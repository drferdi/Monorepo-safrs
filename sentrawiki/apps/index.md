# Apps

Deployable application units in the SAFRS Monorepo.

## Purpose

This section documents the deployable application units in the monorepo. The SAFRS Monorepo currently ships exactly one baseline deployment unit — the golden-path web application at `projects/golden-path/apps/web` — which proves the typed Database to API to Web flow. Optional capability packs can add additional application shells (a desktop shell, a browser extension) on request, but none is part of the runtime baseline.

## Deployable units

| Unit | Path | Runtime | Status |
| --- | --- | --- | --- |
| Golden-path web | `projects/golden-path/apps/web` | Next.js 16 (Node) | Baseline, active |
| Desktop shell (optional) | `projects/<project>/apps/desktop/**` | Electron | Capability pack, opt-in |
| Browser extension (optional) | `projects/<project>/apps/extension/**` | WXT | Capability pack, opt-in |

The golden-path web app is the default demonstrator and the only deployment unit the repository verifies end to end. Desktop and extension shells are declared in the capability catalog but only become real application code inside a project when the matching capability is activated.

## How it works

Each application lives under `projects/<project>/apps/<app>` and is owned by its project capsule (`projects/<project>/AGENTS.md`). The golden-path app mounts the package-owned Hono API below `/api` and renders its readiness desk server-first with a single small client component. Application code consumes shared packages (`@safrs/api`, `@safrs/database`, `@safrs/ui`, `@sentra/token`) and never imports the database/server environment into the browser.

## Integration points

- The golden-path app is one Next.js deployment unit; see [golden-path-web.md](golden-path-web.md).
- All rendered surfaces must consume Sentra design tokens from `@sentra/token` — see [design tokens](../features/design-tokens.md).
- Application shells produced by capability packs follow the strictures in [capability packs](../features/capability-packs.md).
- Package boundaries the app depends on are documented under [packages](../packages/index.md).
- Repository topology and the six-layer model: [architecture](../overview/architecture.md).

## Related pages

- [Golden-path web application](golden-path-web.md)
- [Capability packs](../features/capability-packs.md)
- [Architecture](../overview/architecture.md)
