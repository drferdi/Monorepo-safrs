# Config (`@safrs/config`)

## Purpose

Shared TypeScript configuration presets so every workspace package gets identical strict compiler settings. The package ships two tsconfig presets and is consumed as a dev dependency by every package's `typecheck` script.

## Key source files

| File | Purpose |
| --- | --- |
| `packages/config/package.json` | Exports `./tsconfig/base.json` and `./tsconfig/nextjs.json` |
| `packages/config/tsconfig/base.json` | The strict baseline preset |
| `packages/config/tsconfig/nextjs.json` | Next.js preset extending the baseline |

## The presets

**`packages/config/tsconfig/base.json`** enforces the monorepo's strict baseline:

- `target: ES2024`
- `module: NodeNext`, `moduleResolution: NodeNext`
- `strict: true`
- `noEmit: true`
- `skipLibCheck: true`
- `verbatimModuleSyntax: true`

**`packages/config/tsconfig/nextjs.json`** extends the baseline for Next.js surfaces:

- `lib: ["DOM", "DOM.Iterable", "ES2024"]`
- `jsx: "preserve"`
- the `next` TypeScript plugin

## Usage

```jsonc
// package.json (workspace member)
{
  "devDependencies": { "@safrs/config": "workspace:*" }
}
```

```jsonc
// tsconfig.json (workspace member)
{
  "extends": "@safrs/config/tsconfig/base.json"
}
```

## Integration points

- Every `packages/*` package lists `@safrs/config` as a dev dependency and runs `tsc --project tsconfig.json` for `typecheck`.
- `projects/golden-path/apps/web` uses `@safrs/config/tsconfig/nextjs.json` for its App Router surface.

## Verification

```bash
pnpm --filter @safrs/config lint
```

## Related pages

- [Shared packages](index.md)
