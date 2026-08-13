# Capabilities

## Purpose

`pnpm capability:add` (implemented in `tools/capabilities/src/cli.mjs`) lets a project capsule opt into an **optional** capability from a catalog of manifests. Enabling a capability records it in `projects/<project>/capabilities.json` with its risk level; it does **not** install runtime integration — actual integration remains a project-scoped R2 task.

## Key source files

| File | Purpose |
| --- | --- |
| `tools/capabilities/src/cli.mjs` | CLI: `--preview` / `--apply`, args |
| `tools/capabilities/src/catalog.mjs` | Catalog loading, preview text, apply (writes `capabilities.json`) |
| `tools/capabilities/src/schema.mjs` | Manifest + payload validation, `safeProjectSlug`, `maximumRisk` |
| `tools/capabilities/manifests/*.json` | The capability catalog (one manifest per optional capability) |
| `tools/capabilities/package.json` | Package metadata |

## The catalog (`tools/capabilities/manifests/`)

| Manifest | Capability | Risk | Dependencies | Notes |
| --- | --- | --- | --- | --- |
| `ai.json` | Bounded AI capability | R2 | `ai`, `@ai-sdk/provider` | Provider-neutral, structured Zod output, test doubles; env `AI_PROVIDER_API_KEY`, `AI_MODEL` |
| `electron.json` | Desktop application shell | R2 | `electron` | Preload allowlist and IPC verification; sensitive path `apps/desktop/**` |
| `email.json` | Local email development | R2 | `@react-email/components`, `react-email`, `resend` | React Email preview + provider delivery boundary; env `EMAIL_FROM`, `RESEND_API_KEY` |
| `python.json` | Python technical boundary | R2 | `python` | Requires a recorded technical justification that Node.js is unsuitable |
| `stripe.json` | Stripe sandbox webhooks | R2 | `stripe` | Sandbox-only payment boundary, local webhook forwarding; env `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| `wxt.json` | Browser extension shell | R2 | `wxt` | Permission-minimized manifest review; sensitive path `apps/extension/**` |

Each manifest declares `label`, `description`, `risk`, `dependencies`, `environment` variables, `commands`, `tests`, `sensitivePaths`, `sideEffects`, and `removal` instructions.

## How it works

`tools/capabilities/src/catalog.mjs`:

- **`loadCatalog()`** reads `manifests/*.json`, validates each via `schema.mjs` (file basename must equal `manifest.id`, no duplicate ids), and returns a `Map`.
- **`capabilityPreview()`** prints what the selection would do: risk, the single file that changes (`projects/<project>/capabilities.json`), dependencies, environment, commands, tests, sensitive paths, side effects, and removal guidance.
- **`applyCapability()`** requires the confirmation to exactly equal `ENABLE <id> FOR <slug>`. It reads the project's `capabilities.json`, appends (or updates) the capability — merging with `maximumRisk` so risk is never lowered — sorts entries by id, and writes `{ version: 1, capabilities: [...] }`. The `python` capability additionally requires a `--justification` text.
- All project/repo paths are resolved through symlink-excluding canonical-directory checks and `safeProjectSlug`, so the tool cannot escape `projects/`.

## CLI usage

```bash
pnpm capability:add --capability stripe --project golden-path --preview
pnpm capability:add --capability python --project myproj --apply --justification "…"
pnpm capability:add --capability ai --project myproj --apply --confirm "ENABLE ai FOR myproj" --repo-root /abs/path
```

## Integration points

- **`packages/env`** already carries the optional Stripe `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` entries (prefix-checked); enabling the Stripe capability uses those env vars.
- **`.safrs/tool-inventory.json`** registers the endpoints touched by optional capabilities so the workflow-pinning gate can validate downloads.
- **`tools/project-wizard`** writes each capsule's `capabilities.json` path; the wizard prompts for capabilities and sensitive domains, which this tool manages afterwards.
- **`check_topology.py`** / governance validate the capsule remains well-formed after a capability is recorded.

## Verification

```bash
node --test tools/capabilities/test/*.test.mjs
pnpm run doctor          # read-only diagnostics
pnpm run governance
```

## Related pages

- [Project wizard](project-wizard.md) — creates the capsule this tool edits
- [Tools overview](index.md)
