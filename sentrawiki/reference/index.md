# Reference

The reference section holds factual, tool-independent documentation about the repository's static configuration and dependency landscape. Use these pages when you need exact values rather than narrative.

## Pages

- [Configuration](configuration.md) — environment variables, `tsconfig` hierarchy, Biome, Turbo, Vitest workspace, `pnpm-workspace.yaml`, and Docker Compose files.
- [Dependencies](dependencies.md) — the `pnpm-workspace.yaml` catalog, pinned versions of key dependencies, and dependency relationships between packages.

## Where the data comes from

The reference pages reflect the repository's normalized configuration files:

- `pnpm-workspace.yaml` — workspace globs and the version catalog.
- `turbo.json` — the task pipeline.
- `biome.jsonc` — lint/format settings.
- `vitest.workspace.ts` — the shared Vitest workspace.
- `packages/config/tsconfig/base.json` and `packages/config/tsconfig/nextjs.json` — the TypeScript presets.
- `compose.yaml` and `compose.telemetry.yaml` — local infrastructure.

## Related pages

- [Overview](../overview/index.md)
- [Background](../background/index.md)
- [by-the-numbers](../by-the-numbers.md)
