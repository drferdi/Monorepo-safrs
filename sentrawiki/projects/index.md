# Project capsules

**Canonical:** `docs/governance/SAFRS_PROJECT_CAPSULES.md`, `docs/governance/CAPSULE_SOVEREIGNTY.md`, ADR 0005, ADR 0006.

Every product lives at `projects/<domain>/<capsule>/`. Domain folders carry only `AGENTS.md` and `README.md`.

A capsule is standalone only when **structural** checks and **empirical extraction** both pass. Prose is not proof.

## Inventory

| ID | Domain | What it is | Contract | Root workspace |
| --- | --- | --- | --- | --- |
| [product/sentrabot](sentrabot.md) | product | Public multi-surface agent product | capsule-owned workspace | excluded |
| [product/kediri-history](kediri-history.md) | product | Cinematic heritage site + Payload CMS | `project.contract.json` | excluded |
| [academic/academic-smartboard](academic-smartboard.md) | academic | El-Kayyisa bimbel + Kayyisa agent | `project.contract.json` | excluded |
| [corporate/portfolio-drnovia](portfolio-drnovia.md) | corporate | Static portfolio (Framer markup + Lenis) | `project.contract.json` | not included |
| [healthcare/avery](avery.md) | healthcare | Hermes agent configuration | SPDS + AGENTS | not a Node workspace |
| [internal/golden-path](golden-path.md) | internal | Typed DB→API→Web demo | none at capsule root | **included (legacy)** |
| [internal/control-center](control-center.md) | internal | Local repo-health dashboard | none at capsule root | **included (legacy)** |
| [template](template.md) | n/a | Scaffold | placeholder contract | template |

## Required lifecycle

Every active capsule must expose executable argv commands (not shell strings) for:

- `install`
- `build`
- `test`
- `run`
- `deployDryRun`

Those five cannot be N/A. Only `lint` and `typecheck` may be N/A with a non-empty reason.

Machine contract schema: `.safrs/schemas/project-contract.schema.json`.

## Forbidden coupling

A capsule must not consume the root workspace, catalog, lockfile, configuration, paths, scripts, tools, packages, or monorepo-owned runtime infrastructure. It must not import another capsule.

Shared first-party code, if needed, is either a versioned external dependency or a capsule-local copy with provenance.

## How root talks to capsules

```bash
pnpm project:status
pnpm project:verify <domain/capsule>
```

Implementation: `tools/project-standalone`. Structural checker: `tools/safrs/check_project_independence.py`.

## Related

- [Capsule sovereignty](../governance/capsule-sovereignty.md)
- [Standalone verification](../verification/standalone.md)
- [Purpose](../overview/purpose.md)
