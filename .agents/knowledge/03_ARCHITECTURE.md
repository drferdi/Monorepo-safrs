# 03_ARCHITECTURE.md

# Architecture

## Purpose

This document defines the architectural philosophy of the project. It focuses on structure, organization, and long-term maintainability rather than specific technologies.

## Core Principles

* Design modular systems.
* Separate responsibilities clearly.
* Reuse within a capsule; share across capsules only through versioned, independently distributable artifacts.
* Minimize unnecessary dependencies.
* Keep architecture easy to understand.

## Guidelines

Before introducing a new component, determine whether an existing solution can be reused or extended.

Prefer incremental improvements over large-scale redesigns.

Avoid creating duplicate functionality, overlapping responsibilities, or tightly coupled components.

Technology choices should support the architecture, not define it.

## Expected Behavior

Recommend architectures that remain maintainable, scalable, and adaptable as the project grows.

## Repository shape

- The root is an optional control plane: SAFRS governance, verification tooling, and product-neutral shared packages. No capsule depends on it to build, test, or run.
- Each capsule under `projects/<domain>/<capsule>/` is a sovereign unit with its own manifests, lockfile, configuration, contract, and agent context.
- `projects/internal/golden-path` is recorded legacy non-conformance, pending capsule migration. It is not a pattern for new work.

See `docs/architecture/MONOREPO_PURPOSE.md`, ADR 0006 (`docs/adrs/0006-standalone-project-capsules.md`), and ADR 0007 (`docs/adrs/0007-fail-closed-capsule-sovereignty-enforcement.md`). ADR 0007 decision 4 keeps Next.js App Router on Node.js, Hono, Zod, PostgreSQL, and Prisma as a recommended default stack, applied inside each capsule. Optional Electron, WXT, Stripe, email, AI, and Python capabilities stay absent until explicitly selected. Node.js/pnpm and framework dependencies must use active-LTS or stable releases; prereleases and the Edge runtime need an accepted ADR.
