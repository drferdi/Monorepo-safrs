# Repository tooling boundary

Read the root [AGENTS.md](../AGENTS.md), [SAFRS_SPEC.md](../SAFRS_SPEC.md), and [SECURITY.md](../SECURITY.md) first. They are canonical.

## Scope

Own repository-wide developer tools in `tools/**`, including diagnosis, project capsules, optional capability manifests, and deterministic SAFRS enforcement. Do not add product runtime behavior here.

## Rules and commands

Tool, governance, generated-project, dependency, or verification-control changes are R2 and need review. Tools must treat external input as data, validate paths, preserve user-owned files, and avoid secrets/network access unless separately authorized.

Run focused tool tests first, then `pnpm run doctor` for read-only diagnostics and `pnpm run governance` for SAFRS checks.
