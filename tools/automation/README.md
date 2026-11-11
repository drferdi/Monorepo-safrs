# SAFRS automation

Control-plane engine for canonical task contracts, scopes, risk, leases, approvals, budgets, gates, and evidence.

## Commands

Run from this tool directory (Node.js 24.18.0 or compatible supported root toolchain):

```text
node src/cli.mjs
node --run test
```

Root aliases are documented in [tools/README.md](../README.md).
Commands with placeholders require real local paths; they are usage examples, not status claims.

## Dependency boundary

This is a framework component. The CLI derives the enclosing repository root and reads its .safrs policy, Git control-plane state, and verification artifacts. Gaffer execution also uses the bundled src/gaffer adapter. Pure modules use Node built-ins; application tools must not import this package. The local test wrapper runs all tests from the framework root because integration fixtures use root policies and schemas.

## Side effects

Contract compile can write only when --write is requested. Lease authority and execution subcommands can mutate state or invoke processes; inspect usage and task authority first.

## Verification

Focused tests are the command above. JavaScript-only tools have no separate TypeScript build/typecheck unless their own manifest declares one; use the repository lint configuration on maintained source. Test results must come from execution, never from this document.

