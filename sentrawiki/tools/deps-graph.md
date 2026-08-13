# Deps-graph

## Purpose

`pnpm deps:graph` (implemented in `tools/deps-graph/src/cli.mjs`) is a standalone, read-only dependency-graph visualizer for the monorepo. It parses `pnpm-workspace.yaml`, `turbo.json`-style members, and every `package.json` to build the inter-package dependency graph and render it as **DOT**, **Mermaid**, **ASCII**, or **SVG**. It is a manual/CI-optional aid — **not** a governance gate — and never mutates packages, manifests, or lockfiles. It has zero runtime dependencies (manual YAML parsing, no external CLI libraries).

## Key source files

| File | Purpose |
| --- | --- |
| `tools/deps-graph/src/cli.mjs` | CLI: format/output/cycle detection |
| `tools/deps-graph/src/workspace.mjs` | Manual `pnpm-workspace.yaml` parsing + glob resolution |
| `tools/deps-graph/src/packages.mjs` | Reads package metadata, builds nodes/edges |
| `tools/deps-graph/src/graph.mjs` | Cycle detection (DFS) and reverse-edge (`dependentsOf`) |
| `tools/deps-graph/src/render.mjs` | DOT, Mermaid, ASCII, and (via Graphviz `dot`) SVG renderers |
| `tools/deps-graph/package.json` | Package metadata (`@safrs/deps-graph`) |

## How it works

- `tools/deps-graph/src/workspace.mjs` parses the `packages:` glob list from `pnpm-workspace.yaml` (a minimal YAML reader that only extracts that key), then resolves the leading-`*` segments to concrete package directories.
- `tools/deps-graph/src/packages.mjs` reads each member's `package.json` and collects workspace-only edges across `dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies` that point at known workspace package names.
- `tools/deps-graph/src/graph.mjs` `detectCycle` runs a DFS with white/grey/black colouring and returns the first cycle path; `dependentsOf` lists reverse dependents.
- `tools/deps-graph/src/render.mjs` renders DOT, Mermaid (`flowchart LR`), a deterministic ASCII edge list, or SVG by shelling out to the Graphviz `dot` binary when available (falling back to Mermaid if `dot` is missing).

## CLI usage

```bash
pnpm deps:graph                              # ASCII to stdout
pnpm deps:graph --format mermaid             # Mermaid flowchart
pnpm deps:graph --format dot --output deps.dot
pnpm deps:graph --format svg --output deps.svg
pnpm deps:graph --cycles                     # print cycles; exit non-zero if found
pnpm deps:graph --repo-root /abs/path
pnpm deps:graph --help
```

With `--cycles`, the tool prints circular dependencies and exits non-zero when a cycle exists; otherwise it reports `No circular dependencies detected`.

## Integration points

- **`tools/AGENTS.md`** classifies it: read-only, zero runtime dependencies, and *not* a governance gate. Changes are R1; wiring it into CI or governance would make that R2 and require review.
- **`.safrs/tool-inventory.json`** registers the `deps-graph` tool (read-only, approved), which lets `check_actions_pinning.py` treat its endpoints correctly.

## Verification

```bash
node --test tools/deps-graph/test/*.test.mjs
```

## Related pages

- [Tools overview](index.md)
- [Shared packages](../packages/index.md) — the packages and dependency graph it renders
- [SAFRS governance checkers](safrs.md) — the governance gate (of which this tool is deliberately *not* part)
