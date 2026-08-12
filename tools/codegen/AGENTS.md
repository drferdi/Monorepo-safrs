# AGENTS.md — tools/codegen (@safrs/codegen)

Read the root [AGENTS.md](../AGENTS.md), [SAFRS_SPEC.md](../SAFRS_SPEC.md), and
[SECURITY.md](../SECURITY.md) first. They are canonical.

## Scope

Own `tools/codegen/**`: a schema-driven generation tool that reads Zod schemas
from `@safrs/schemas` and produces:
- an OpenAPI 3.1 document (`--openapi`);
- mock data factories (`--mock`);
- a typed fetch wrapper over the Hono client (`--client`).

## Rules

- Zod schemas in `@safrs/schemas` are the single source of truth. The tool
  imports them at runtime; it does not hand-maintain a second copy.
- Generated output is deterministic: same schema in, same bytes out.
- Treat schemas as data; never emit secrets, credentials, or runtime values.
- Generated files are declared in the consuming project's `AGENTS.md`/`.gitignore`
  as needed; do not force them into the golden path build.
- Tool, dependency, and generated-output changes are R2 and need review.

## Commands

From repository root: `node tools/codegen/src/cli.mjs --schema <entry> --api <entry> --out <dir> [--openapi|--mock|--client]`.
Run `node --test tools/codegen/test/*.test.mjs` for focused tests.