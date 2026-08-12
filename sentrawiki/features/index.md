# Features

Cross-cutting features that span multiple systems in the SAFRS Monorepo.

## Purpose

This section documents the horizontal concerns that reach across projects, packages, and tools rather than living inside a single deployable unit. Three cross-cutting features govern how the whole repository behaves: the SAFRS governance model, the Sentra design token system, and optional capability packs. Understanding these is prerequisite to working in the repository without violating its controls.

## Cross-cutting features

| Feature | Scope | Summary |
| --- | --- | --- |
| [SAFRS governance](safrs-governance.md) | Whole repository | Six-layer control architecture, R0–R3 risk tiers, agent roles, sensitive-path detection, document registry, verification pipeline |
| [Design tokens](design-tokens.md) | `packages/token`, all UI | Sentra token system, WCAG enforcement, theme handling |
| [Capability packs](capability-packs.md) | Projects + `tools/capabilities` | Opt-in activation of Stripe, email, Electron, WXT, AI, Python |

These three features are enforced by `.safrs/**`, `scripts/safrs-verify.sh`/`.mjs`/`.ps1`, and the SAFRS Governance CI workflow, and they are invoked through `pnpm run governance`.

## Related pages

- [SAFRS governance](safrs-governance.md)
- [Design tokens](design-tokens.md)
- [Capability packs](capability-packs.md)
- [Governance tooling](../tools/safrs.md)
- [Architecture](../overview/architecture.md) and [glossary](../overview/glossary.md)
