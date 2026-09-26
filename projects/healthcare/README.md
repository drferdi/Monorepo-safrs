# Healthcare

Domain folder. It groups related capsules; it runs no product of its own and holds no code.

Healthcare systems that share compliance context and patient-data handling.

## Child capsules

| Capsule | Contents |
| --- | --- |
| [`avery`](./avery/README.md) | Configuration and deployment of Avery, Sentra's Hermes agent |
| [`sentraverse`](./sentraverse/README.md) | Public Sentra marketing website and platform hub (Next.js) |
| [`assistverse`](./assistverse/README.md) | Public Sentra Assist website (Next.js) |
| [`referralink`](./referralink/README.md) | MEDLINK sandbox for differential diagnosis, ICD-10 mapping, and referral (Vite) |
| [`healthsphere`](./healthsphere/README.md) | Public website of UPTD Puskesmas PONED Balowerti Kediri (app in `website/`) |
| [`med-assist`](./med-assist/README.md) | Chrome side-panel extension for FKTP clinicians in ePuskesmas (WXT) |
| [`medboard`](./medboard/README.md) | Clinical intelligence dashboard: CDSS, trajectory, NEWS2, safety gates (Next.js) |
| [`sidelab-src`](./sidelab-src/README.md) | SideLab research-prototype clinical decision support (Python engine, API, dashboard) |

Not yet migrated from abyss-monorepo: `mantra` (Frappe Bench) and `melinda` (deferred).

Every healthcare capsule is standalone: its own lockfile, `pnpm-workspace.yaml`, and `project.contract.json`. The root workspace excludes `projects/healthcare/**`.

## Layout

All of `projects/` follows one pattern: `projects/<domain>/<capsule>/`. No capsule sits directly under `projects/`.

A domain folder holds only `AGENTS.md` and `README.md`. The full capsule files (`docs/`, `src/`, `tests/`) belong to the child capsules, and that is what `tools/safrs/check_topology.py` checks.

## Domain rules

Patient data, real people's identities, and credentials never enter the repository.
