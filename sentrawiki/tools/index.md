# Repository tools

**Canonical:** `tools/AGENTS.md`. Tool, governance, or verification-control changes are R2.

| Tool | Command | Role |
| --- | --- | --- |
| [SAFRS checkers](safrs.md) | `pnpm governance` | Deterministic Python governance |
| [Automation control plane](automation.md) | `pnpm saf` | Contracts, leases, gates, evidence, publisher |
| [Gaffer runtime](gaffer.md) | `pnpm saf gaffer run` | Cost-aware intent orchestration over SAFRS |
| [Task CLI](task.md) | `pnpm task` | Claim / transition / close mutation tasks |
| [Status CLI](status.md) | `pnpm status` | Registry, leases, git, live governance |
| [Doctor](doctor.md) | `pnpm doctor` | Read-only environment diagnosis |
| [Project wizard](project-wizard.md) | `pnpm project:new` | Scaffold a capsule from `_template` |
| [Project standalone](project-standalone.md) | `pnpm project:status` / `project:verify` | Structural + empirical sovereignty |
| [Capabilities](capabilities.md) | `pnpm capability:add` | Optional capability packs |
| [Codegen](codegen.md) | `pnpm codegen` | Zod → OpenAPI / mocks / client |
| [Deps-graph](deps-graph.md) | `pnpm deps:graph` | Inter-package graph (not a gate) |

New tools that access repository data, credentials, or network must be declared in `.safrs/tool-inventory.json`.

## Related

- [Verification](../verification/index.md)
- [Automation feature](../features/automation-control-plane.md)
