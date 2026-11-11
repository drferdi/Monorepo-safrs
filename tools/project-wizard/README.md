# Project capsule wizard

Previews and creates project folders with ownership, agent context, and architecture/data/testing documents.

## Commands

Run from this tool directory (Node.js 24.18.0 or compatible supported root toolchain):

```text
node src/cli.mjs --repo-root <repository> --input <answers.json> --preview
node --test test/*.test.mjs
```

Root aliases are documented in [tools/README.md](../README.md).
Commands with placeholders require real local paths; they are usage examples, not status claims.

## Dependency boundary

This is a framework scaffold generator. Default templates come from projects/_template in the enclosing repository; generated capsules own their copied documents. The generator is not a runtime or build dependency of generated projects.

## Side effects

Preview is read-only. --apply writes a new capsule after confirmation; existing user files are protected. It does not implement application features or install project dependencies.

## Verification

Focused tests are the command above. JavaScript-only tools have no separate TypeScript build/typecheck unless their own manifest declares one; use the repository lint configuration on maintained source. Test results must come from execution, never from this document.

