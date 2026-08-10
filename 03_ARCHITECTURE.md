# 03_ARCHITECTURE.md

# Architecture

## Purpose

This document defines the architectural philosophy of the project. It focuses on structure, organization, and long-term maintainability rather than specific technologies.

## Core Principles

* Design modular systems.
* Separate responsibilities clearly.
* Reuse shared capabilities.
* Minimize unnecessary dependencies.
* Keep architecture easy to understand.

## Guidelines

Before introducing a new component, determine whether an existing solution can be reused or extended.

Prefer incremental improvements over large-scale redesigns.

Avoid creating duplicate functionality, overlapping responsibilities, or tightly coupled components.

Technology choices should support the architecture, not define it.

## Expected Behavior

Recommend architectures that remain maintainable, scalable, and adaptable as the project grows.

## Implemented solo-developer baseline

The canonical baseline is a single deployable Next.js App Router application at `projects/golden-path/apps/web`. It runs on the Node.js runtime and mounts the package-owned Hono API at `/api`. The page is server-first; the interactive form is a small client boundary using the inferred Hono RPC client.

Reusable, product-neutral boundaries are deliberately small:

- `packages/schemas` owns Zod contracts.
- `packages/env` validates server/client environment boundaries at startup/build time.
- `packages/database` owns local PostgreSQL, Prisma, migrations, seed data, and reset safety.
- `packages/api` owns Hono routes, typed client types, and error envelopes.
- `packages/ui` owns reusable presentation primitives.
- `tools` owns developer workflow, project capsules, optional-capability selection, and governance checks.

Projects remain under `projects/<project>/apps/*`; packages remain reusable and product-neutral. Optional Electron, WXT, Stripe, email, AI, and Python capabilities stay absent until explicitly selected. Node.js/pnpm and framework dependencies must use active-LTS or stable releases; prereleases and the Edge runtime need an accepted ADR.
