# Apps — deployable units

The repository is **not** a single-app monorepo. ADR 0005/0006 put products in capsules. This section originally documented only the golden-path Next.js unit because that was the solo-developer baseline (ADR 0001).

## Deployable and runnable surfaces

| Unit | Path | Notes |
| --- | --- | --- |
| Golden-path web | `projects/internal/golden-path/apps/web` | Legacy root-coupled demonstrator. [Detail](golden-path-web.md) |
| Control Center | `projects/internal/control-center/apps/web` | Local-only operator UI |
| SentraBot API / web / desktop / mobile / worker | `projects/product/sentrabot/apps/*` | Sovereign capsule |
| Kediri web | `projects/product/kediri-history/apps/web` | Sovereign capsule |
| Smartboard web + site | `projects/academic/academic-smartboard/apps/*` | Partial product |
| Portfolio | `projects/corporate/portfolio-drnovia` | Static Node server |
| Avery | Hermes runtime **outside** the capsule | Capsule is configuration |

Capability packs still describe optional Electron/WXT shells for **root-scaffolded** projects. SentraBot already has a real Electron app inside its own capsule — that is not the root capability pack.

## Related

- [Projects](../projects/index.md)
- [Golden-path web](golden-path-web.md)
- [API overview](../api/index.md)
