# Repository Tools

Repository-wide developer tooling belongs here. `tools/safrs/` contains deterministic governance checks. New tools must be declared in `.safrs/tool-inventory.json` when they access repository data, credentials, or network endpoints.

The Monorepo is the governance/work framework. A folder placed here is not automatically a root workspace package or a standalone application.

## Inventory and explicit dependency boundaries

| Folder | Role | Entry point | Dependency boundary |
| --- | --- | --- | --- |
| [automation](automation/README.md) | Contracts, leases, approvals, gates, agent execution | Root `pnpm saf` | Framework policies, Git state, and local adapters |
| [capabilities](capabilities/README.md) | Optional capability records | Root `pnpm capability:add` | Local manifests plus an explicitly selected repository |
| [codegen](codegen/README.md) | Schema to OpenAPI/client/mock generation | Root `pnpm codegen` | Workspace catalog dependencies; configurable trusted schema input |
| [deps-graph](deps-graph/README.md) | Workspace dependency visualization | Root `pnpm deps:graph` | Node built-ins; inspected workspace is input |
| [doctor](doctor/README.md) | Root development readiness | Root `pnpm doctor` | Root database guard and process helpers; framework-specific |
| [project-standalone](project-standalone/README.md) | Capsule lifecycle/extraction verification | Root `pnpm project:status` / `pnpm project:verify` | Root structural checker; application commands remain local |
| [project-wizard](project-wizard/README.md) | New project scaffold | Root `pnpm project:new` | Root-owned `projects/_template`; generated files are capsule-owned |
| [prompt](prompt/README.md) | MyPrompt desktop application | Local `pnpm start` | Own manifest, workspace, lockfile, Prisma schema, source, tests; host/provider prerequisites in contract |
| [retriever](retriever/README.md) | Website archive and Markdown corpus application | Local `node --run start` or `Run-Retriever.bat` | Own toolchain; HTTrack is a host prerequisite |
| [safrs](safrs/README.md) | Deterministic governance enforcement | Root `pnpm governance` | Repository policy, registry, topology, and evidence |
| [status](status/README.md) | Control-plane report | Root `pnpm status` | `task`, `automation`, root inventory, and Git state |
| [task](task/README.md) | Shared work ownership | Root `pnpm task` | `automation` and Git common-directory registry |
| [typesafe-jev](typesafe-jev/README.md) | Agent decision router | MCP `jev_route` | Local Python playbook/environment and configured TypeSafe service |

The framework dependencies above are explicit architectural dependencies of those framework tools. They must never become build, test, or runtime dependencies of Prompt, Retriever, or another independent project. Extracting a framework tool into its own repository requires carrying or packaging its documented dependency closure; copying the named folder alone is not sufficient.

## Standalone applications

`prompt` and `retriever` are excluded from the enclosing pnpm workspace and use their own lockfiles. Their lifecycle contracts use IDs `tools/prompt` and `tools/retriever`. `standalone-tools.json` declares these applications for fail-closed structural coverage. Root verification discovers contract-bearing tools in addition to project capsules; it must not treat uncontracted framework components as standalone application claims.

Run local commands from the application's own directory. Root governance integration is optional. Structural checks and successful local startup do not establish fresh-extraction lifecycle readiness; that requires executing the extraction verifier.

## Maintenance

Preserve data, environment values, local dependencies, third-party Jev playbook sources, and unrelated tasks. Do not use placeholder success commands as lint or deployment validation. Root doctor reports environment readiness, not application readiness. Record changed scope and observed gate results in the relevant `.agents/HANDOFF.md`.
