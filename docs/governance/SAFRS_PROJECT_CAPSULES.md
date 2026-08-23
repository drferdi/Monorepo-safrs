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
- An independent lifecycle contract with executable `install`, `build`, `test`, `run`, and `deployDryRun` commands, plus `lint` and `typecheck` commands when applicable. The five required stages cannot be N/A; only `lint` and `typecheck` may be explicitly not applicable, each with a non-empty reason. Commands are argv (`program` plus `args`), never shell strings.
- Runtime and data dependencies, including shared mutable resources.
- Sensitive or R3 surfaces and prohibited actions.
- Interfaces consumed from or exposed to declared external services or the optional root control plane; no cross-capsule runtime links.
- Links to canonical policy when nested rather than duplicated SAFRS rules; documentation links do not make a standalone lifecycle depend on parent files.

## Standalone contract

The capsule is the portable ownership boundary. Its lifecycle commands run from the capsule
root and must install, build, test, run, and perform a deploy dry-run without the monorepo root. The five
required stages are executable; only lint and typecheck may be N/A with recorded reasons. Project-local
workspaces, lockfiles, packages, scripts, generated assets, and build/deploy configuration are
allowed. External APIs, databases, services, and pinned images are allowed only as dependencies
declared by the capsule; credentials are never embedded in those declarations.

The root workspace, catalog, lockfile, configuration, paths, scripts, tools, packages, and
monorepo-owned runtime infrastructure are not capsule dependencies. A capsule may not escape its
directory, import or link to another capsule, or require another capsule at runtime, build, test,
or deploy time. A capsule-local workspace may link only capsule-local packages.

Root-shared packages and the Sentra token source may remain temporarily for legacy root-integrated
applications while each consumer migrates. The current `projects/internal/golden-path` coupling is
explicitly legacy pending its planned capsule migration; it is not a standalone counterexample or
a template for new capsules. During the transition, a standalone capsule must distribute required
shared code as a capsule-local package or consume an independently distributable, pinned version
with provenance and local checks; root packages are never runtime, build, test, or deploy dependencies.
Extraction must never resolve a root workspace package or checker.

Standalone verification has both a structural and an empirical half. Structural verification
checks path and dependency boundaries. Empirical verification copies only the capsule into a
fresh directory and runs its required lifecycle and smoke commands, plus any applicable optional
checks, from inside that extracted capsule. Extraction is the decisive proof of portability;
documentation or prose checks alone are insufficient.

## Boundary rules

1. Root `AGENTS.md`, `SAFRS_SPEC.md`, and `SECURITY.md` remain authoritative.
2. A domain folder is routing only: it carries `AGENTS.md` + `README.md`, never code, `src/`, `tests/`, or `docs/`. A capsule inherits its domain's compliance posture and may narrow it, never loosen it.
3. Nested instructions may narrow scope and permissions; they may not weaken root controls.
4. Cross-project reusable logic moves to root `packages/` only for legacy/control-plane consumers and only after an actual second consumer or explicit architecture decision exists; capsule lifecycles must not require those root workspace packages after extraction. New capsules use capsule-local or independently distributable packages.
5. A capsule may use declared project-local packages and workspaces, but may not reach into another capsule or a root path/package. External services are allowed only when declared by that capsule.
6. Shared databases, queues, caches, ports, buckets, and test identities must be isolated per concurrent mutation task or the tasks must be serialized.
7. Safety-critical and production-execution paths are R3 unless a stricter domain policy applies.

## Activation checklist

- The capsule sits under a domain folder, and that domain has its own `AGENTS.md` + `README.md`.
- No placeholders remain in the capsule's `AGENTS.md` or README.
- Required lifecycle commands have been executed successfully in the current environment; `lint` and `typecheck` may be N/A only with recorded reasons.
- Lifecycle and standalone verification commands have been run from inside the capsule root.
- Structural checks and empirical extraction verification both pass for the capsule.
- Sensitive paths are registered in `.safrs/sensitive-paths.json`.
- Canonical documents or ADRs record material architecture decisions.
- When nested in this monorepo, repository governance checks pass separately; they are contribution gates, not capsule lifecycle or standalone-proof prerequisites.
