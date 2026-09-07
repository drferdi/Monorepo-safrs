# Background and key decisions

Canonical records: `docs/adrs/` and `.agents/DECISIONS.md`. This page is a pointer.

## Why a golden path existed

[ADR 0001](../../docs/adrs/0001-solo-developer-golden-path.md) needed an executable typed Database → API → Web journey without inventing a product domain. That app still exists. It is no longer the shape of new work.

## Why the root is a control plane

[ADR 0002](../../docs/adrs/0002-safrs-automation-control-plane.md) put contracts, risk, leases, and evidence in-repo instead of a custom service.

## Why capsules are two levels deep

[ADR 0005](../../docs/adrs/0005-projects-domain-layering.md) groups products by compliance context. Domain folders own no code.

## Why extraction is the proof

[ADR 0006](../../docs/adrs/0006-standalone-project-capsules.md) rejected "root-managed runtime for every capsule" and "one repo per project with no control plane".

## Migration from abyss-monorepo

Selective copy, never lift-and-shift (decision 2026-08-11). `.env` from the old tree is never read. Lessons: `.agents/knowledge/12_LESSONS.md`.

## Related

- [Lore](../lore.md)
- [Decisions index](../decisions/index.md)
- [Purpose](../overview/purpose.md)
