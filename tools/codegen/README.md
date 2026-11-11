# Schema code generator

Generates OpenAPI, mock modules, and a typed fetch client from exported Zod schemas.

## Commands

Run from this tool directory (Node.js 24.18.0 or compatible supported root toolchain):

```text
node src/cli.mjs --schema <schema-module> --out <output-directory>
node --test test/*.test.mjs
```

Root aliases are documented in [tools/README.md](../README.md).
Commands with placeholders require real local paths; they are usage examples, not status claims.

## Dependency boundary

Current installation uses the enclosing pnpm workspace catalog for zod and @faker-js/faker. The CLI default schema is packages/schemas/src/index.ts relative to cwd; --schema supplies a different input. These are explicit framework integrations, not a dependency for generated application runtime code.

## Side effects

Writes generated files to --out. Schema modules are executed through dynamic import, so only use trusted local modules. --api is not a supported option.

## Verification

Focused tests are the command above. JavaScript-only tools have no separate TypeScript build/typecheck unless their own manifest declares one; use the repository lint configuration on maintained source. Test results must come from execution, never from this document.

