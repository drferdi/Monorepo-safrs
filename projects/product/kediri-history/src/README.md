# Capsule source boundary

The deployable runtime source is owned by `apps/web/src`. This directory satisfies the SAFRS
capsule topology without duplicating application code.

Architecture modules — `historical-domain`, `content-validation`, `design-system`, `motion` —
live in `apps/web/src/modules/` and keep their responsibilities separate under the rules recorded
in [`../AGENTS.md`](../AGENTS.md) and enforced by `apps/web/tests/architecture/`.
