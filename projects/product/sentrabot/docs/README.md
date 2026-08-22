# Documentation map

Sentra Bot docs follow [Diátaxis](https://diataxis.fr/): tutorials, how-to
guides, reference, and explanation. One topic lives in one file. Architecture
prose is not copied into every page.

This capsule is inner-source. GitHub issue/PR templates stay at the Monorepo
root (out of scope R2).

```mermaid
flowchart TB
  subgraph Tutorials["Tutorials — learning"]
    QS["quickstart.md"]
  end
  subgraph HowTo["How-to — doing"]
    SH["self-host.md"]
    OP["operations.md"]
    REL["release.md"]
    CON["../CONTRIBUTING.md"]
    SITE["../apps/site/README.md"]
  end
  subgraph Reference["Reference — looking up"]
    API["api.md"]
    DATA["data.md"]
    TEST["testing.md"]
    PAR["release-parity.md"]
    INV["source-inventory.md"]
    LED["migration-ledger.md"]
    DEC["decisions.md"]
  end
  subgraph Explanation["Explanation — understanding"]
    OV["overview.md"]
    ARC["architecture.md"]
    PRD["product.md"]
    SEC["security.md"]
    TM["threat-model.md"]
    SC["supply-chain.md"]
    PRO["provenance.md"]
  end
  Map["docs/README.md"] --> Tutorials
  Map --> HowTo
  Map --> Reference
  Map --> Explanation
```

## Tutorials

| File | Concern |
| --- | --- |
| [quickstart.md](quickstart.md) | What can run today vs what is blocked |

There is no fake end-to-end happy path that requires pin `d17a138`.

## How-to

| File | Concern |
| --- | --- |
| [self-host.md](self-host.md) | Intended Compose topology and operator defaults |
| [operations.md](operations.md) | Health/ready, incidents, backup/restore **gates** |
| [release.md](release.md) | Evidence required before a beta claim |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | How humans and agents contribute |
| [../apps/site/README.md](../apps/site/README.md) | Cora Vite shell — not the product origin |

## Reference

| File | Concern |
| --- | --- |
| [api.md](api.md) | `/api/sentrabot`, `/api/auth`, worker control, supervisor ops |
| [data.md](data.md) | Tenant scope, Prisma models, envelopes |
| [testing.md](testing.md) | Commands, fakes vs canaries |
| [release-parity.md](release-parity.md) | Implemented vs not accepted |
| [source-inventory.md](source-inventory.md) | Inventory command contract |
| [migration-ledger.md](migration-ledger.md) | Dispositions (none while pin missing) |
| [decisions.md](decisions.md) | Index to ADR 0004 and DECISIONS.md |

## Explanation

| File | Concern |
| --- | --- |
| [overview.md](overview.md) | What Sentra Bot is, who it is for, non-goals |
| [architecture.md](architecture.md) | C4 containers and boundaries |
| [product.md](product.md) | Personas, threads, memory, routines, BYOK |
| [security.md](security.md) | Control intent for this product |
| [threat-model.md](threat-model.md) | STRIDE on current and planned surfaces |
| [supply-chain.md](supply-chain.md) | SBOM/SLSA TARGET vs CURRENT |
| [provenance.md](provenance.md) | Pin `d17a138` vs baseline `7f08da5` |

## Capsule root (community)

[README.md](../README.md), [AGENTS.md](../AGENTS.md),
[SECURITY.md](../SECURITY.md), [SUPPORT.md](../SUPPORT.md),
[CHANGELOG.md](../CHANGELOG.md), [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md),
[ROADMAP.md](../ROADMAP.md), [LICENSE](../LICENSE), [NOTICE](../NOTICE).
