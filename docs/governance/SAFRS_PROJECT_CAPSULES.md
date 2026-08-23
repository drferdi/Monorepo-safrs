# SAFRS Project Capsule Convention

## Purpose

A project capsule gives agents and humans the smallest complete context needed to work on one independently owned product, service, or bounded system without loading the entire monorepo.

The repository root is the SAFRS AI automation/control plane. Root discovery, orchestration,
verification, updates, and reporting are optional conveniences; a capsule must never require
the root as runtime, configuration, path, tooling, or infrastructure.
The decision is recorded in [ADR 0006](../adrs/0006-standalone-project-capsules.md).

## Required structure

```text
projects/<domain>/
├── AGENTS.md
├── README.md
└── <capsule>/
    ├── AGENTS.md
    ├── README.md
    ├── docs/
    │   ├── architecture.md
    │   ├── data.md
    │   └── testing.md
    ├── src/
    └── tests/
```

Capsules are always two levels deep. The domain folder groups capsules that share a compliance and data-handling context — `healthcare`, `academic`, `corporate`, `internal`, `product` — and owns no code of its own, so it carries only `AGENTS.md` and `README.md`. Creating a domain folder without a capsule inside it is an error.

Start from `projects/_template/`. Replace every explicit placeholder before the capsule is considered active.

## Required capsule content

- Objective, owner, boundaries, and non-goals.
- An independent lifecycle contract with exact install, build, lint, type-check, test, run, and deploy commands that actually exist (or an explicit reason when a stage is not applicable).
- Runtime and data dependencies, including shared mutable resources.
- Sensitive or R3 surfaces and prohibited actions.
- Interfaces consumed from or exposed to declared external services or the optional root control plane; no cross-capsule runtime links.
- Links to canonical root policy rather than duplicated SAFRS rules.

## Standalone contract

The capsule is the portable ownership boundary. Its lifecycle commands run from the capsule
root and must install, build, test, run, and deploy without the monorepo root. Project-local
workspaces, lockfiles, packages, scripts, generated assets, and build/deploy configuration are
allowed. External APIs, databases, services, and pinned images are allowed only as dependencies
declared by the capsule; credentials are never embedded in those declarations.

The root workspace, catalog, lockfile, configuration, paths, scripts, tools, packages, and
monorepo-owned runtime infrastructure are not capsule dependencies. A capsule may not escape its
directory, import or link to another capsule, or require another capsule at runtime, build, test,
or deploy time. A capsule-local workspace may link only capsule-local packages.

Standalone verification has both a structural and an empirical half. Structural verification
checks path and dependency boundaries. Empirical verification copies only the capsule into a
fresh directory and runs its applicable lifecycle and smoke commands from inside that extracted
capsule. Extraction is the decisive proof of portability; documentation or prose checks alone
are insufficient.

## Boundary rules

1. Root `AGENTS.md`, `SAFRS_SPEC.md`, and `SECURITY.md` remain authoritative.
2. A domain folder is routing only: it carries `AGENTS.md` + `README.md`, never code, `src/`, `tests/`, or `docs/`. A capsule inherits its domain's compliance posture and may narrow it, never loosen it.
3. Nested instructions may narrow scope and permissions; they may not weaken root controls.
4. Cross-project reusable logic moves to root `packages/` only for control-plane consumers and only after an actual second consumer or explicit architecture decision exists; capsule lifecycles must not require those root workspace packages after extraction.
5. A capsule may use declared project-local packages and workspaces, but may not reach into another capsule or a root path/package. External services are allowed only when declared by that capsule.
6. Shared databases, queues, caches, ports, buckets, and test identities must be isolated per concurrent mutation task or the tasks must be serialized.
7. Safety-critical and production-execution paths are R3 unless a stricter domain policy applies.

## Activation checklist

- The capsule sits under a domain folder, and that domain has its own `AGENTS.md` + `README.md`.
- No placeholders remain in the capsule's `AGENTS.md` or README.
- Commands have been executed successfully in the current environment.
- Lifecycle and standalone verification commands have been run from inside the capsule root.
- Structural checks and empirical extraction verification both pass for the capsule.
- Sensitive paths are registered in `.safrs/sensitive-paths.json`.
- Canonical documents or ADRs record material architecture decisions.
- The root verification command passes.
