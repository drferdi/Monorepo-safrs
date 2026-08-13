# Apps — deployable units

## Purpose

This section documents the deployable application units in the SAFRS Monorepo. A
*deployable unit* is a runnable artifact that can be built and served; everything
that is not a deployable app (shared packages, governance tooling, capability
manifests) lives elsewhere and is consumed by these units.

The monorepo intentionally keeps **one** deployable application. SAFRS is
product-neutral and does not mandate a fixed set of apps; new units are added by
creating a project capsule under `projects/<project>/` following
`docs/governance/SAFRS_PROJECT_CAPSULES.md`.

## The one deployable app

| App | Path | Framework | Runtime | Status |
| --- | --- | --- | --- | --- |
| Golden-path web | `projects/golden-path/apps/web/` | Next.js (App Router) | Node.js | Baseline demonstrator |

Golden-path web is the default and only deployable unit. It mounts the
package-owned typed Hono API under `/api` and renders a server-first "readiness
desk" that proves the typed Database → API → Web flow with one safe demo record.
See [Golden-path web](golden-path-web.md).

## "App-like" surfaces that are not deployable units

The optional capability packs define *shell* manifests for desktop and browser
extension applications, but none is a runtime deployable in this repo today:

- **Electron** (`tools/capabilities/manifests/electron.json`) and **WXT**
  (`tools/capabilities/manifests/wxt.json`) describe a `projects/<project>/apps/desktop/`
  and `projects/<project>/apps/extension/` boundary that a project must opt into
  and implement. No project currently activates them.

These are activated through the capability workflow, not bundled into the baseline
runtime. See [Capability packs](../features/capability-packs.md).

## Key source files

- `projects/golden-path/apps/web/src/app/page.tsx` — the server-first page
- `projects/golden-path/apps/web/src/app/api/[[...route]]/route.ts` — mounts the Hono API
- `projects/golden-path/apps/web/src/app/api/webhooks/stripe/route.ts` — Stripe webhook bound to static scope
- `projects/golden-path/apps/web/src/components/demo-form.tsx` — the smallest client leaf
- `projects/golden-path/apps/web/AGENTS.md` — the web boundary contract

## Integration points

- **Shared packages** consumed: `@safrs/api`, `@safrs/database`, `@safrs/env`,
  `@safrs/ui`, `@safrs/telemetry`, `@safrs/config`, `@sentra/token`, and
  `@safrs/schemas` (transitively).
- **API**: mounts `@safrs/api` under `/api` — see [API overview](../api/index.md).
- **Design tokens**: every rendered surface consumes `@sentra/token` — see
  [Design tokens](../features/design-tokens.md).
- **Governance**: the app's packages and config are sensitive/shared paths — see
  [SAFRS governance](../features/safrs-governance.md).

## Related

- [Golden-path web](golden-path-web.md)
- [API overview](../api/index.md)
- [Packages overview](../packages/index.md)
