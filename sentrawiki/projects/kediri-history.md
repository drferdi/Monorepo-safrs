# Kediri History

**Path:** `projects/product/kediri-history/`
**Contract:** `project.contract.json` id `product/kediri-history`
**Posture:** sovereign capsule — own pnpm workspace and lockfile; excluded from the root workspace.

Public cinematic heritage experience for Kediri (879 → 2026). Two public paths: **Journey** (scroll-directed narrative) and **Archive** (evidence behind claims).

Capsule README: `projects/product/kediri-history/README.md`.

## Contract (machine)

| Field | Value |
| --- | --- |
| Owner | Chief |
| Default risk | R2 |
| Runtime | Node 24 |
| Package manager | pnpm 11.21.0, `pnpm-lock.yaml` |
| Smoke | HTTP `127.0.0.1:4320/` expect 200 |
| Artifact | `apps/web/.next` |

Lifecycle commands are argv via `scripts/pnpm.mjs` and `scripts/serve.mjs` / `scripts/deploy-dry-run.mjs`.

## Shape

Next.js app at `apps/web` with Payload CMS collections, RBAC/draft/versioning, public Archive / Explore / Journey, GSAP hero choreography, token contrast gate.

Infra: capsule `infra/docker-compose.yml` (PostgreSQL + MinIO). HANDOFF (2026-08-26) records a real empty-database run: migrate, seed, `verify:production`, lint, typecheck, unit + e2e, deploy dry-run, and `project-standalone verify product/kediri-history` PASS.

PGlite remains a fallback when Docker is unavailable; it is not the only proof.

## Honest limits (from HANDOFF 2026-08-26)

- No institutional historical images have been acquired yet.
- The 1869 bridge claim is held at `needs_review`.
- Motion is not declared production-ready until re-verified against current GSAP skills (Sentra-GSAP standard withdrawn 2026-08-28).
- Phase 22 deployment waits on Chief. No production remote is created by agents.

## Related

- Capsule `.agents/` (Kediri owns its own HANDOFF/PROGRESS; do not duplicate numbers in root HANDOFF)
- [Standalone verification](../verification/standalone.md)
