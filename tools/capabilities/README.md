# Capability catalog

Previews and records optional AI, Electron, email, Python, Stripe, and WXT capability contracts. It does not install runtime integrations.

## Commands

Run from this tool directory (Node.js 24.18.0 or compatible supported root toolchain):

```text
node src/cli.mjs --capability electron --project tools/prompt --repo-root <repository> --preview
node --test test/*.test.mjs
```

Root aliases are documented in [tools/README.md](../README.md).
Commands with placeholders require real local paths; they are usage examples, not status claims.

## Dependency boundary

Catalog manifests are local. A target repository is supplied as --repo-root (default cwd); selectors support legacy project names, domain/capsule, and tools/name. No root package source is imported.

## Side effects

Preview is read-only. --apply requires exact ENABLE <capability> FOR <selector> confirmation and writes only the selected capabilities.json.

## Verification

Focused tests are the command above. JavaScript-only tools have no separate TypeScript build/typecheck unless their own manifest declares one; use the repository lint configuration on maintained source. Test results must come from execution, never from this document.

