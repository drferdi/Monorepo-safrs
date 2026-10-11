# Development environment doctor

Reports Node, pnpm, Git, Docker, local PostgreSQL, environment readiness, and generated Prisma client readiness.

## Commands

Run from this tool directory (Node.js 24.18.0 or compatible supported root toolchain):

```text
node src/cli.mjs --json
node --test test/*.test.mjs
```

Root aliases are documented in [tools/README.md](../README.md).
Commands with placeholders require real local paths; they are usage examples, not status claims.

## Dependency boundary

This is a framework-specific environment checker. It imports packages/database/src/reset-guard.ts and scripts/lib/process.mjs from the enclosing repository, and inspects the root development setup. It is not a health check for Prompt or Retriever and cannot be extracted as this folder alone.

## Side effects

Diagnostics are read-only. Docker or PostgreSQL being unavailable produces a nonzero exit; the doctor does not start services or migrate databases.

## Verification

Focused tests are the command above. JavaScript-only tools have no separate TypeScript build/typecheck unless their own manifest declares one; use the repository lint configuration on maintained source. Test results must come from execution, never from this document.

