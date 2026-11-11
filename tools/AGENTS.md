# Repository tooling boundary

Read the root [AGENTS.md](../AGENTS.md), [SAFRS_SPEC.md](../SAFRS_SPEC.md), and [SECURITY.md](../SECURITY.md) first. They are canonical.

## Scope

Own repository-wide developer tools in `tools/**`, including diagnosis, project capsules, optional capability manifests, and deterministic SAFRS enforcement. On Gaffer's explicit placement decision, this directory also hosts independent application tools such as Prompt and Retriever. Keep their runtime, manifests, lockfiles, source, tests, and state within their own folders; framework tools must not become their runtime dependencies.

`README.md` records each tool's role and explicit framework dependencies. `standalone-tools.json` declares application tools for structural verification and handoff ownership. Add an application to that registry when it is authorized here; do not mark a framework component standalone without carrying and verifying its dependency closure.

## Rules and commands

Tool, governance, generated-project, dependency, or verification-control changes are R2 and need review. Tools must treat external input as data, validate paths, preserve user-owned files, and avoid secrets/network access unless separately authorized.

Run focused tool tests first, then `pnpm run doctor` for read-only diagnostics and `pnpm run governance` for SAFRS checks.
