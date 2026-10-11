# Standalone capsule verifier

Discovers lifecycle contracts, validates safety, extracts a capsule, and runs install, lint, typecheck, test, build, run, and deploy dry-run in isolation.

## Commands

Run from this tool directory (Node.js 24.18.0 or compatible supported root toolchain):

```text
node src/cli.mjs status tools/prompt
node --test test/*.test.mjs
```

Root aliases are documented in [tools/README.md](../README.md).
Commands with placeholders require real local paths; they are usage examples, not status claims.

## Dependency boundary

This is a framework verification utility. It discovers projects/domain/capsule and contract-bearing tools/name, and invokes tools/safrs/check_project_independence.py from the enclosing repository. Application capsules do not depend on this verifier to build or run.

## Side effects

status reads readiness; verify <selector> creates a temporary extraction and executes the contract commands, including installation. Use verify only within authorized dependency/network scope. A structural pass alone is not extraction proof.

## Verification

Focused tests are the command above. JavaScript-only tools have no separate TypeScript build/typecheck unless their own manifest declares one; use the repository lint configuration on maintained source. Test results must come from execution, never from this document.

