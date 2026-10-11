# Workspace dependency graph

Reads workspace package manifests, renders ASCII, DOT, Mermaid, or SVG graphs, and checks dependency cycles.

## Commands

Run from this tool directory (Node.js 24.18.0 or compatible supported root toolchain):

```text
node src/cli.mjs --repo-root <repository> --format ascii
node --test test/*.test.mjs
```

Root aliases are documented in [tools/README.md](../README.md).
Commands with placeholders require real local paths; they are usage examples, not status claims.

## Dependency boundary

Node built-ins only. The inspected repository is input (--repo-root, default cwd), not a compiled dependency. The parser handles the supported packages-list subset of pnpm-workspace.yaml; this graph is not a standalone-capsule verifier.

## Side effects

Read-only unless --output explicitly requests writing a graph file. Standalone tools excluded from the root workspace are not workspace graph members.

## Verification

Focused tests are the command above. JavaScript-only tools have no separate TypeScript build/typecheck unless their own manifest declares one; use the repository lint configuration on maintained source. Test results must come from execution, never from this document.

