# Project capsules

**Canonical:** `docs/governance/SAFRS_PROJECT_CAPSULES.md`, `docs/governance/CAPSULE_SOVEREIGNTY.md`, ADR 0005, ADR 0006.

Every product lives at `projects/<domain>/<capsule>/`. Domain folders carry only `AGENTS.md` and `README.md`.

A capsule is standalone only when **structural** checks and **empirical extraction** both pass. Prose is not proof.

## Inventory

18 capsules across five domains (2026-10-18), all with `project.contract.json`;
`.safrs/known-nonconformance.json` is empty. "Excluded" means `pnpm-workspace.yaml` names the
capsule (or its domain) with `!`; "not included" means the `projects/*/*/apps/*` glob matches nothing there.

| ID | What it is | Contract | Root workspace |
| --- | --- | --- | --- |
| **academic** | | | |
| [academic/academic-smartboard](academic-smartboard.md) | El-Kayyisa bimbel + Kayyisa agent | `project.contract.json` | excluded |
| **corporate** | | | |
| [corporate/portfolio-drnovia](portfolio-drnovia.md) | Static portfolio (Framer markup + Lenis) | `project.contract.json` | not included |
| **healthcare** | | | |
| healthcare/assistverse | Public Sentra Assist website (prototype) | `project.contract.json` | excluded (`!projects/healthcare/**`) |
| [healthcare/avery](avery.md) | Avery, Sentra's Hermes agent, as versioned configuration | `project.contract.json` | excluded |
| healthcare/balowerti | Public static website of UPTD Puskesmas PONED Balowerti | none | excluded |
| healthcare/mantra | Hospital management platform (Frappe) for RSIA Melinda | `project.contract.json` | excluded |
| healthcare/med-assist | Chrome side-panel extension for FKTP clinicians in ePuskesmas | `project.contract.json` | excluded |
| healthcare/medboard | Clinical intelligence dashboard for primary healthcare | `project.contract.json` | excluded |
| healthcare/referralink | MEDLINK public sandbox: differential diagnosis, ICD-10, referral | `project.contract.json` | excluded |
| healthcare/sentrapedia | Clinical workspace (Next.js) plus public site in `apps/site/` | `project.contract.json` | excluded |
| healthcare/sentraverse | Public Sentra marketing website and platform hub | `project.contract.json` | excluded |
| healthcare/sentraverse-neural | Scroll-driven neural journey site | `project.contract.json` | excluded |
| healthcare/sidelab-src | Research-prototype clinical decision support (not production-ready) | `project.contract.json` | excluded |
| **internal** | | | |
| [internal/control-center](control-center.md) | Local repo-health dashboard | `project.contract.json` | excluded |
| [internal/golden-path](golden-path.md) | Typed DB→API→Web demo; standalone capsule (local snapshot packages) | `project.contract.json` | excluded |
| internal/unicom | UNICOM legacy multi-agent communication room (Next.js) | `project.contract.json` | not included |
| **product** | | | |
| [product/kediri-history](kediri-history.md) | Cinematic heritage site + Payload CMS | `project.contract.json` | excluded |
| [product/sentrabot](sentrabot.md) | Public multi-surface agent product | `project.contract.json` | excluded |

The scaffold lives at `projects/_template/` ([template](template.md)); it is not a capsule.

Capsules without a wiki page are documented in their own `README.md` and `.agents/CONTEXT.md`.

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
