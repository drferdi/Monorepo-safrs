# UI (`@safrs/ui`)

## Purpose

React primitives built on the Sentra design tokens. The package is deliberately minimal — one exported component today — and exists so UI consumers share a common visual vocabulary instead of hand-inventing compositions. It is a shared package, so changes are R2.

## Key source files

| File | Purpose |
| --- | --- |
| `packages/ui/src/index.ts` | Barrel: exports `StatusCard` + `StatusCardState` |
| `packages/ui/src/status-card.tsx` | The `StatusCard` component |
| `packages/ui/package.json` | Depends on `@sentra/token`; `react` is a peer dependency |

## The component

`StatusCard` (`packages/ui/src/status-card.tsx`) renders a labelled status panel with an inline state badge:

- Props: `label`, `detail`, `state` (`"ready" | "attention"`), and optional `children`.
- Renders an `<article class="status-card" data-state={state}>` with a heading, the label, a short detail paragraph, and any children.
- The visible state text is localised (Bahasa Indonesia): `ready` → "Siap", `attention` → "Perlu perhatian".

Styling is class-driven (`status-card`, `status-card__*`) so the actual colours come from `@sentra/token` (see [Token](token.md)); the component carries **no raw colour or radius values**, which keeps it inside the governance token gate.

```tsx
import { StatusCard } from "@safrs/ui";

<StatusCard
  label="Database"
  detail="Local disposable database is ready."
  state="ready"
/>
```

## Integration points

- **`@safrs/web`** consumes `@safrs/ui` (declared in `projects/golden-path/apps/web/package.json`).
- **`@sentra/token`** provides the design tokens the component styles against; `check-tokens.mjs` enforces that no raw values leak into this package.

## Verification

```bash
pnpm --filter @safrs/ui lint
pnpm --filter @safrs/ui typecheck
pnpm --filter @safrs/ui test
pnpm --filter @safrs/ui build
```

## Related pages

- [Token](token.md) — mandatory design tokens for all UI work
- [UI rules](../../packages/token/UI-RULES.md) — the full UI conventions this component follows
- [Shared packages](index.md)
