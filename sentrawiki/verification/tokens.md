# Design token enforcement

**Canonical:** `packages/token/AGENTS.md`, `packages/token/UI-RULES.md`.
**Root checker:** `pnpm check:tokens` → `scripts/check-tokens.mjs`.

Any agent building a rendered surface must use approved Sentra tokens.

A **standalone capsule** satisfies that by:

- a capsule-local token package/snapshot with version/provenance, or
- an independently distributable pin.

Extraction MUST NOT resolve `packages/token` or a root-only checker.

Root token sources remain for authoring and distribution. They are not a new capsule's runtime dependency.

Worked reference screens: `docs/design-system/reference/`.

See also [features/design-tokens](../features/design-tokens.md).
