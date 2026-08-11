---
name: new-capability
description: Activate an optional capability pack (Stripe, email, AI, Electron, WXT, Python) or scaffold a new project capsule through the repository tooling, with the SAFRS risk review that the manifest requires.
---

# Add a capability or project

Optional capabilities are **not** baseline runtime dependencies. They are activated only
through the tooling below, never by hand-adding a dependency to a `package.json`.

## Before anything

1. Read root `AGENTS.md` (golden-path baseline, risk handling) and `tools/AGENTS.md`.
2. Read the manifest for the capability under `tools/capabilities/manifests/<id>.json`.
   It declares `risk`, `dependencies`, `environment`, `commands`, `tests`,
   `sensitivePaths`, `sideEffects`, and `removal`.
3. For a new project, read `docs/governance/SAFRS_PROJECT_CAPSULES.md` first.

## Capability activation

```bash
# 1. Preview — read-only, prints exactly what would change
pnpm capability:add --capability <id> --project <project> --preview

# 2. Apply — only after the preview is reviewed and the risk tier is accepted
pnpm capability:add --capability <id> --project <project> --apply \
  --confirm <confirmation> --justification "<why this capability is needed now>"
```

Applying records the activation in `projects/<project>/capabilities.json`.

## New project

```bash
pnpm project:new
```

Follow the wizard; the generated capsule may narrow commands and scope but may never
weaken root SAFRS or security controls.

## Rules

- Every manifest in this repository is at least R2 — designated review before merge.
  Prepare the change, state the risk tier, and do not self-approve.
- Environment variables from the manifest go into `.env.example` with empty values.
  Never write real keys, and never read or edit `.env`.
- Capabilities that reach a third-party network endpoint also need an entry in
  `.safrs/tool-inventory.json` (`id`, `owner`, `purpose`, `allowed_operations`,
  `data_scope`, `authentication`, `network_endpoints`, `provenance`, `review_status`).
- Add the manifest's declared `tests` before declaring the capability done.
- Use Active LTS or stable releases. A prerelease dependency or the Edge runtime needs a
  written accepted decision in `.agents/DECISIONS.md` or an ADR.

## Verify

`pnpm governance`, then the package-scoped tests for whatever the capability touched.
Record the activation in `.agents/DECISIONS.md` and update `.agents/HANDOFF.md`.
