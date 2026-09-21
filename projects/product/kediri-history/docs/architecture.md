# Architecture — Kediri History

Standalone product capsule for the Kediri digital heritage web experience.

## CURRENT shape

| Boundary | Location |
| --- | --- |
| Capsule root | `projects/product/kediri-history` |
| Web app | `apps/web` (Next.js) |
| Scripts / lifecycle | `scripts/`, `project.contract.json` |
| Infra | `infra/` |
| Production notes | `docs/production/` |

## Runtime

- Node.js 24, pnpm workspace local to this capsule
- No required dependency on Monorepo root packages at runtime
- Deployment dry-run must have no production side effects

## Source layout note

Application implementation lives under `apps/`. The capsule-root `src/` path exists only to satisfy SAFRS topology routing; do not put product code there.
