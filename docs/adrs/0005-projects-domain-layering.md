# ADR 0005 — Domain Layering for Project Capsules

- Status: Proposed pending designated R2 review
- Date: 2026-08-22
- Deciders: Chief
- Supersedes: decision D1 in `docs/superpowers/specs/2026-08-20-smartboard-migration-design.md`

## Context

Project capsules used to sit one level below `projects/`, one folder per product. As the repository grew to six capsules across unrelated fields — academic tooling, a public bot, a portfolio site, internal instrumentation, and a healthcare agent — that flat list stopped communicating which capsules share a compliance and data-handling context.

The 2026-08-20 smartboard design considered a domain layer and deferred it. Its stated reason was accurate: `pnpm-workspace.yaml` (`projects/*/apps/*`), `tools/safrs/check_topology.py`, and `scripts/check-tokens.mjs` all assumed a capsule was exactly one level deep, so a domain folder would force three governance controls to change at once. It proposed waiting for four or five products and a dedicated ADR.

Chief ruled on 2026-08-22 that the layering applies now, and applies uniformly. A structure where some capsules are grouped and others are not was rejected explicitly.

## Decision

1. Every capsule lives at `projects/<domain>/<capsule>/`. No capsule sits directly under `projects/`.
2. A domain folder carries only `AGENTS.md` and `README.md`. It holds no code, no `src/`, no `tests/`, and no `docs/`; those belong to the capsule.
3. A domain folder with no capsule inside it is a topology error.
4. The initial domains are `academic`, `corporate`, `healthcare`, `internal`, and `product`.
5. Domain routing files carry the shared compliance posture — default risk tier and data boundaries — that its capsules inherit and may narrow but never loosen.

## Consequences

Three governance controls changed together with the move, which is why this change set requires an independent verification-integrity review:

- `tools/safrs/check_topology.py` now scans two levels: domains are checked for the routing pair, capsules for the full capsule contract.
- `tools/safrs/check_routing.py` follows the relocated golden-path reference.
- `pnpm-workspace.yaml` widened to `projects/*/*/apps/*`; the flat pattern silently dropped all nine applications from the workspace.

Further breakage found and repaired during the move, recorded here because each failed silently rather than loudly:

- `packages/token/scope.txt` kept three stale paths, which would have disabled design-token enforcement for golden-path, smartboard, and sentrabot without any error.
- `biome.jsonc` exclusion globs `projects/portfolio*/**` no longer matched, pulling vendored assets into linting.
- Four capsule `AGENTS.md` files pointed at `../../AGENTS.md`, one level short of the root after the move.
- `tests/repository/lfs-snapshots.test.mjs` assembled its path from string fragments, so text-level path rewriting missed it.

Capsule depth is now three path segments, so canonical links from a capsule to the root are `../../../AGENTS.md`, and `../../../../../AGENTS.md` from an app inside a capsule.

## Rejected alternatives

- **Domain as a name prefix** (`projects/academic-smartboard/`): rejected because the grouping exists only in the name, so no tool, reviewer, or routing file can act on it.
- **Layering only where it seems useful**: rejected by Chief. Mixed structure is harder to reason about than either consistent alternative.
- **Keeping empty `docs/`, `src/`, and `tests/` in domain folders** to satisfy the old one-level checker: rejected because those directories would exist purely to appease a tool, and would imply a domain owns code.
- **Deferring until four or five products exist**: superseded. The count was already six, and every additional capsule raises the cost of the move.
