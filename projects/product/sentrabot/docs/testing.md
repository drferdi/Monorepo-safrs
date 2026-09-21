# Testing — SentraBot

## Capsule commands

From this capsule root (`projects/product/sentrabot`):

- `pnpm test` — Vitest suite (see `vitest.config.ts`)
- `pnpm lint` / `pnpm typecheck` / `pnpm build` — as declared in capsule `package.json`
- Prefer offline, deterministic tests; do not require hosted vendors for core conformance

## Topology

Root SAFRS topology: `python tools/safrs/check_topology.py`

## Layout note

Executable tests primarily live under `apps/` and `packages/`. The capsule-root `tests/` path holds routing notes for SAFRS topology; do not treat an empty placeholder as the only test surface.
