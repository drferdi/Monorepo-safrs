# SAFRS v1.1 Agent-First Monorepo

This repository is the SAFRS v1.1 foundation for a non-coding solo developer: it provides one safe, typed Database → API → Web golden path while retaining room for independently governed project capsules and shared capabilities.

## Start as Chief

1. Run `pnpm run doctor` to see what is ready and how to recover missing local prerequisites.
2. Run `pnpm run setup` once to prepare the local-only database, Prisma client, migration, and deterministic demo data.
3. Run `pnpm dev` to start the web application in one command.
4. Open the local address printed by the command. The page proves the typed API and local database path by saving a harmless demo record.
5. Use `pnpm project:new` to preview a new governed capsule; it only writes after the exact requested confirmation.

The baseline deliberately does not include real payments, email delivery, AI, desktop, browser-extension, production deployment, or production credentials. Those are optional capability packs selected through a reviewed task.

## Start here

1. Read `AGENTS.md` and follow its context-routing order.
2. Place independently owned products or services under `projects/<project>/`.
3. Place reusable, product-neutral code under `packages/<package>/`.
4. Keep repository-wide developer tooling under `tools/` and cross-project tests under `tests/`.
5. Run `bash scripts/safrs-verify.sh` before review.

## Canonical knowledge

- `00_READ_FIRST.md` — reading order and source-of-truth rules.
- `01_COLLABORATION.md` — human/agent collaboration.
- `02_OBJECTIVES.md` through `11_RESPONSE_STANDARDS.md` — project constitution.
- `SAFRS_SPEC.md` — normative SAFRS v1.1 implementation specification.
- `SECURITY.md` — security boundary and required controls.
- `docs/governance/` — permissions, controls, lifecycle, conformance, and multi-agent protocol.
- `.safrs/` — machine-readable policy, registries, and inventories.

## Repository topology

```text
projects/                 independently governed project capsules
packages/                 reusable shared packages
tools/                    repository-wide tooling and SAFRS enforcement
tests/                    cross-project architecture/governance tests
scripts/                  operator entry points
docs/adrs/                architectural decision records
docs/plans/               active/completed/archived execution plans
docs/evidence/            verification and approval evidence without secrets
```

The current declared conformance and unresolved operational controls are tracked in `docs/governance/SAFRS_CONFORMANCE.md` and `docs/evidence/SAFRS_GOLDEN_PATH_VERIFICATION.md`.
