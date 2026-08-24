---
title: SAFRS Capsule Sovereignty Standard
status: CANONICAL
subject: capsule-sovereignty
authority: architecture-constraint
---

# SAFRS Capsule Sovereignty Standard

## Purpose

Define the minimum technical conditions for calling a project capsule independent from the SAFRS Monorepo root.

## Sovereignty Rule

A capsule is sovereign only if its normal software lifecycle succeeds without access to the Monorepo root.

> No project may resolve required code, configuration, tooling, dependency state, infrastructure, runtime state, or secrets from outside its own capsule directory, except explicitly declared external dependencies.

## Required Local Ownership

A capsule must own, as applicable:

- dependency manifest;
- dependency lockfile;
- runtime/toolchain version metadata;
- local workspace declaration when multi-package;
- compiler/transpiler configuration;
- lint/format configuration;
- test configuration;
- build configuration;
- environment contract;
- first-party project packages;
- database schema and migrations;
- container definitions;
- deployment definition;
- smoke tests;
- project lifecycle commands.

## Forbidden Root Coupling

Governance should fail when normal project lifecycle execution requires:

- parent paths escaping the capsule to root code/config;
- `workspace:*` resolving to root-owned packages;
- root-only dependency catalogs;
- root lockfile as the project's only lock state;
- root build wrappers as the only build path;
- root `.env` or secret state;
- root database package;
- root Docker build context;
- root-only generated source required at runtime;
- direct source imports from another capsule.

A root convenience wrapper is acceptable only when the project exposes an equivalent local lifecycle command.

## Explicit External Dependencies

External dependencies are allowed when declared and reproducible, including package registries, Docker images, database services, APIs, model providers, object storage, queues, versioned artifacts, and published internal packages.

## Shared First-Party Code Classification

Before moving or duplicating a root package, classify it:

### A. Project-specific
Ownership belongs in the capsule whose product semantics it implements.

### B. Generic versioned dependency
If genuinely reusable across products, prefer a normal versioned dependency mechanism over direct source coupling.

### C. SAFRS control-plane infrastructure
If the capability governs/orchestrates repositories, it remains at root and must not be required by project runtime.

### D. Generated project-owned snapshot
Root may synchronize a snapshot into the capsule, but the project must keep functioning when synchronization is unavailable.

## Extraction Test — Authoritative Proof

For each capsule:

1. copy the capsule to a clean temporary directory outside the Monorepo;
2. deny/remove access to the Monorepo root;
3. install using only capsule-owned dependency state;
4. run declared static checks;
5. run declared tests;
6. build;
7. start an appropriate disposable runtime;
8. run smoke tests;
9. produce the deployable artifact or deployment dry-run;
10. verify no required path resolved outside the extracted capsule.

`STANDALONE = TRUE` only if all required lifecycle stages pass.

## Minimum Project Contract

Each project should expose a machine-readable contract containing at least:

- project ID;
- project root;
- runtime/toolchain;
- risk classification;
- lifecycle commands;
- required environment names;
- test commands;
- build outputs;
- deployment/dry-run command;
- external services;
- sensitive surfaces;
- generated paths;
- optional root orchestration hooks.

The contract tells root how to operate the project. It must not make the project depend on root.

## Required Lifecycle Experience

A capsule should expose deterministic local commands equivalent to:

- setup;
- doctor/status;
- dev/run;
- lint;
- typecheck when relevant;
- test;
- build;
- verify;
- deploy-dry-run.

## CI Enforcement

Machine checks should detect at least:

- parent path escapes;
- project-to-root source imports;
- root workspace package resolution;
- missing local lock state;
- root build contexts;
- root config inheritance required after extraction;
- undeclared cross-project runtime dependencies.

## Migration Rule

For each capsule:

1. identify current required behavior;
2. identify current dependency closure;
3. localize or externalize dependencies;
4. preserve behavior;
5. run extraction verification;
6. only then remove obsolete root consumption.

Do not perform unrelated cleanup.
