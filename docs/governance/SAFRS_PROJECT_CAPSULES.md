# SAFRS Project Capsule Convention

## Purpose

A project capsule gives agents and humans the smallest complete context needed to work on one independently owned product, service, or bounded system without loading the entire monorepo.

## Required structure

```text
projects/<project>/
├── AGENTS.md
├── README.md
├── docs/
│   ├── architecture.md
│   ├── data.md
│   └── testing.md
├── src/
└── tests/
```

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
2. Nested instructions may narrow scope and permissions; they may not weaken root controls.
3. Cross-project reusable logic moves to `packages/` only after an actual second consumer or explicit architecture decision exists.
4. A project may depend on declared shared packages, but may not reach into another project's internal `src/` tree.
5. Shared databases, queues, caches, ports, buckets, and test identities must be isolated per concurrent mutation task or the tasks must be serialized.
6. Safety-critical and production-execution paths are R3 unless a stricter domain policy applies.

## Activation checklist

- No placeholders remain in the capsule's `AGENTS.md` or README.
- Commands have been executed successfully in the current environment.
- Sensitive paths are registered in `.safrs/sensitive-paths.json`.
- Canonical documents or ADRs record material architecture decisions.
- The root verification command passes.
