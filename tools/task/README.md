# Task ownership registry

Claims file scopes, tracks owner and risk, changes lifecycle state, closes work, and lists tasks.

## Commands

Run from this tool directory (Node.js 24.18.0 or compatible supported root toolchain):

```text
node src/cli.mjs list --active --json
node --test ../../tests/repository/task-command.test.mjs
```

Root aliases are documented in [tools/README.md](../README.md).
Commands with placeholders require real local paths; they are usage examples, not status claims.

## Dependency boundary

This is a framework component with explicit imports from tools/automation. Registry and lease events live in <git-common-dir>/safrs-control-plane so related worktrees share ownership. This folder alone is not an extractable registry service.

## Side effects

list is read-only. claim/state/close preview mutations unless --yes is supplied. Preserve other owners; do not rewrite the registry to bypass overlap checks.

## Verification

Focused tests are the command above. JavaScript-only tools have no separate TypeScript build/typecheck unless their own manifest declares one; use the repository lint configuration on maintained source. Test results must come from execution, never from this document.

