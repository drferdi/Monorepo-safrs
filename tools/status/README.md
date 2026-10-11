# Control-plane status

Reports Git state, active task ownership, overlap conflicts, lease ledger, tool inventory, and governance results.

## Commands

Run from this tool directory (Node.js 24.18.0 or compatible supported root toolchain):

```text
node src/cli.mjs
node --test ../../tests/repository/status-command.test.mjs
```

Root aliases are documented in [tools/README.md](../README.md).
Commands with placeholders require real local paths; they are usage examples, not status claims.

## Dependency boundary

This is a framework component with explicit imports from tools/task and tools/automation. It derives the enclosing repository root and reads .safrs/tool-inventory.json plus shared task state in Git's common directory. It is not a standalone application status service.

## Side effects

Intended as a read-only report; it may invoke deterministic governance checks. No capsule should need this command to run.

## Verification

Focused tests are the command above. JavaScript-only tools have no separate TypeScript build/typecheck unless their own manifest declares one; use the repository lint configuration on maintained source. Test results must come from execution, never from this document.

