# Testing — Kediri History

## Capsule lifecycle

Commands are declared in `project.contract.json` and run from this capsule root:

- `test` — capsule test script via `scripts/pnpm.mjs`
- `lint` / `typecheck` / `build` — as declared in the contract
- Standalone proof: `node tools/project-standalone/src/cli.mjs verify product/kediri-history` (from Monorepo root)

## Topology

Root SAFRS topology: `python tools/safrs/check_topology.py`

## Notes

- Keep tests offline and deterministic by default.
- Do not weaken gates to make a slice pass.
