# SAFRS Project Capsule Convention

## Purpose

A project capsule gives agents and humans the smallest complete context needed to work on one independently owned product, service, or bounded system without loading the entire monorepo.

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
- Exact build, lint, type-check, and test commands that actually exist.
- Runtime and data dependencies, including shared mutable resources.
- Sensitive or R3 surfaces and prohibited actions.
- Interfaces consumed from or exposed to other projects/packages.
- Links to canonical root policy rather than duplicated SAFRS rules.

## Boundary rules

1. Root `AGENTS.md`, `SAFRS_SPEC.md`, and `SECURITY.md` remain authoritative.
2. A domain folder is routing only: it carries `AGENTS.md` + `README.md`, never code, `src/`, `tests/`, or `docs/`. A capsule inherits its domain's compliance posture and may narrow it, never loosen it.
3. Nested instructions may narrow scope and permissions; they may not weaken root controls.
4. Cross-project reusable logic moves to `packages/` only after an actual second consumer or explicit architecture decision exists.
5. A project may depend on declared shared packages, but may not reach into another project's internal `src/` tree.
6. Shared databases, queues, caches, ports, buckets, and test identities must be isolated per concurrent mutation task or the tasks must be serialized.
7. Safety-critical and production-execution paths are R3 unless a stricter domain policy applies.

## Activation checklist

- The capsule sits under a domain folder, and that domain has its own `AGENTS.md` + `README.md`.
- No placeholders remain in the capsule's `AGENTS.md` or README.
- Commands have been executed successfully in the current environment.
- Sensitive paths are registered in `.safrs/sensitive-paths.json`.
- Canonical documents or ADRs record material architecture decisions.
- The root verification command passes.
