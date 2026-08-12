# Developer tools

The SAFRS Monorepo ships a set of standalone developer tools under `tools/`. These are repository-wide developer tooling, not product runtime code — they diagnose the environment, scaffold projects, add optional capabilities, generate code from schemas, visualize dependencies, and enforce governance. The tool boundary is owned by `tools/AGENTS.md`; changes to tools, governance, or verification controls are R2 and require review.

## Tool inventory

| Tool | Directory | Command | Purpose |
| --- | --- | --- | --- |
| **safrs** | `tools/safrs/` | `pnpm governance` | Deterministic SAFRS governance checkers and routing generator |
| **doctor** | `tools/doctor/` | `pnpm doctor` | Environment readiness diagnosis |
| **project-wizard** | `tools/project-wizard/` | `pnpm project:new` | Scaffold a new SAFRS project capsule |
| **capabilities** | `tools/capabilities/` | `pnpm capability:add` | Optional capability pack catalog (Stripe, email, Electron, WXT, AI, Python) |
| **codegen** | `tools/codegen/` | `pnpm codegen` | Schema-first codegen from Zod to OpenAPI, mocks, typed client |
| **deps-graph** | `tools/deps-graph/` | `pnpm deps:graph` | Monorepo dependency graph visualizer with cycle detection |

Each tool is a small, standalone Node.js CLI (`.mjs`) in a `src/` directory with co-located tests in `test/`. The Python checkers in `tools/safrs/` are invoked by the governance gate rather than the package manager.

## Governance and risk

- Tool, dependency, and verification-control changes are R2 and need review (see `tools/AGENTS.md`).
- Tools must treat external input as data, validate paths, preserve user-owned files, and avoid secrets or network access unless separately authorized.
- `tools/deps-graph/` is explicitly read-only and **not** a governance gate; it only becomes R2 if wired into CI.
- Every tool that accesses repository data, credentials, or network endpoints must be declared in `.safrs/tool-inventory.json`.

## Related pages

- [Getting started](../overview/getting-started.md) — prerequisites, setup, daily workflow, and command overview
- [Architecture](../overview/architecture.md) — six-layer control architecture and repository topology
- [SAFRS governance](../features/safrs-governance.md) — risk model, roles, and verification
- [Tooling](../how-to-contribute/tooling.md) — build system, linters, code generators, CI tooling
- [Patterns and conventions](../how-to-contribute/patterns-and-conventions.md) — coding and testing patterns
