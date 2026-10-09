# Domain Router — Healthcare

## Inheritance

Read the repository root `AGENTS.md` first. This file narrows domain-local context and never weakens root SAFRS or security controls.

## What this is

`projects/healthcare/` is a **domain folder**, not a capsule. It groups related capsules and has no code, architecture documents, or tests of its own; those belong to the child capsules.

It therefore holds only two files: `AGENTS.md` (this file) and `README.md`.

- Domain: `healthcare`
- Scope: healthcare systems that share compliance context and patient-data handling.
- Human owner: Gaffer (dr. Ferdi Iskandar)
- Default risk: `R2`; raise to `R3` for logic that decides clinical outcomes (registered in `.safrs/sensitive-paths.json`).

## Child capsules

| Capsule | Contents |
| --- | --- |
| [`avery`](./avery/AGENTS.md) | Configuration and deployment of Avery, Sentra's Hermes agent |
| [`sentraverse`](./sentraverse/AGENTS.md) | Public Sentra marketing website and platform hub (Next.js) |
| [`sentraverse-neural`](./sentraverse-neural/AGENTS.md) | Sentraverse neural journey: the cinematic GSAP story of Sentra as its own site (Next.js) |
| [`assistverse`](./assistverse/AGENTS.md) | Public Sentra Assist website (Next.js) |
| [`referralink`](./referralink/AGENTS.md) | MEDLINK sandbox for differential diagnosis, ICD-10 mapping, and referral (Vite) |
| [`healthsphere`](./healthsphere/AGENTS.md) | Public website of UPTD Puskesmas PONED Balowerti Kediri (app in `website/`) |
| [`med-assist`](./med-assist/AGENTS.md) | Chrome side-panel extension for FKTP clinicians in ePuskesmas (WXT) |
| [`medboard`](./medboard/AGENTS.md) | Clinical intelligence dashboard: CDSS, trajectory, NEWS2, safety gates (Next.js) |
| [`sidelab-src`](./sidelab-src/AGENTS.md) | SideLab research-prototype clinical decision support (Python engine, API, dashboard) |
| [`mantra`](./mantra/AGENTS.md) | Sentra MANTRA hospital management custom apps on Frappe Bench v15 (static SAFRS contract) |

Not yet migrated from abyss-monorepo: `melinda` (deferred by Gaffer). `mantra` has a static contract: its bench runtime runs only in its dev container.

Open the `AGENTS.md` of the capsule you are working on; it holds the real build, lint, type-check, and test commands.

## Domain rules

- Patient data, real people's identities, and credentials never enter the repository.
- Do not put code, `src/`, `tests/`, or `docs/` in this domain folder.
- Child capsules may narrow these rules, never loosen them.
- Changes across capsules in one domain still require recording scope expansion.
