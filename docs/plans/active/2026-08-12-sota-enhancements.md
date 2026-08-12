# SOTA Enhancements v1 — Implementation Plan

**Status:** ACTIVE
**Date:** 2026-08-12
**Type:** plan
**Risk:** R1 (visual, deps-graph) / R2 (telemetry, codegen, LFS)

## Overview

Four state-of-the-art enhancements for the SAFRS Monorepo: OpenTelemetry
distributed tracing (OTLP → Dockerized Jaeger), Playwright visual regression
testing with Git LFS baselines, a Zod-schema→client codegen pipeline (mock
data + OpenAPI spec + typed fetch wrapper), and a standalone monorepo
dependency-graph visualizer. All four are additive and preserve existing
behavior; R2 items require designated review before merge.

## Feature 1 — OpenTelemetry Tracing

- New package `packages/telemetry` (`@safrs/telemetry`).
- `initTelemetry(config)` builds a NodeSDK with OTLP trace exporter,
  `HttpInstrumentation`, `PrismaInstrumentation`, and a custom Hono middleware.
- Hono middleware creates a request span and sets the correlation id attribute.
- Prisma client wrapped with `$extends` query tracing.
- Jaeger all-in-one added as an optional service (`compose.telemetry.yaml`).
- Wired into `@safrs/api`, `@safrs/database`, and `@safrs/web`.

## Feature 2 — Visual Regression Testing

- Playwright `toHaveScreenshot()` baselines committed via Git LFS.
- `.gitattributes` tracks `*.png` via LFS.
- New `e2e/visual.spec.ts` + snapshot config in `playwright.config.ts`.
- CI runs Git LFS checkout; snapshots compared on failure.

## Feature 3 — Codegen Pipeline

- New tool `tools/codegen` (`@safrs/codegen`).
- Generates: OpenAPI 3.1 spec, mock data factories, typed fetch wrappers.
- Uses Zod 4 native `z.toJSONSchema(...)` + `@faker-js/faker`.
- CLI: `node tools/codegen/src/cli.mjs --schema <entry> --out <dir> [--openapi|--mock|--client]`.

## Feature 4 — Dependency Graph Visualizer

- New tool `tools/deps-graph` (`@safrs/deps-graph`).
- Parses `pnpm-workspace.yaml`, `turbo.json`, all `package.json`.
- Renders DOT / Mermaid / ASCII / SVG.
- CLI: `pnpm deps:graph [--format …] [--output …]`.
- Standalone/manual — not a governance gate.

## Feature 5 — OpenAPI Live Endpoint (A)

- `packages/api/src/openapi.ts` builds an OpenAPI 3.1 document from the Zod
  schemas in `@safrs/schemas` via `z.toJSONSchema(...)`.
- Hono routes: `GET /api/openapi.json` (JSON) and `GET /api/docs` (Swagger UI).
- Verified end-to-end: dev server serves both with 200.

## Feature 6 — Property-Based Testing (B)

- `fast-check` added to `@safrs/schemas`; deterministic seed + numRuns.
- `src/demo.property.test.ts` asserts schema invariants over thousands of random
  inputs (safeParse never throws, trim round-trip, well-formed records parse).

## Feature 7 — Supply-Chain Security Scan (C)

- `scripts/check-supply-chain.mjs` runs `pnpm audit` (and `osv-scanner` when
  present); fails on high/critical advisories.
- Root command: `pnpm check:security`.
- Removed unused `@opentelemetry/sdk-trace-node` dep that pulled the
  `@opentelemetry/propagator-jaeger` high advisory into the tree.

## Implementation Order

1. Dependency graph tool (R1, standalone) + tests.
2. Visual regression config + baselines (R1/R2).
3. Telemetry package + wiring (R2).
4. Codegen tool + wiring (R2).
5. OpenAPI live endpoint (A), property-based testing (B), supply-chain scan (C).
6. Governance registration (registry, tool-inventory, sensitive-paths).
7. Final `pnpm governance` + `pnpm check` verification; update HANDOFF/PROGRESS/DECISIONS.

## Risk

- `packages/telemetry`, `tools/codegen`, Git LFS, compose changes, `check:security`: **R2** — review required.
- `tools/deps-graph`, visual config, OpenAPI endpoint, property tests: **R1**.