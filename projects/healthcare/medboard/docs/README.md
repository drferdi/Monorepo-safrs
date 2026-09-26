# Technical documentation — IntelligenceBoard

This directory contains deeper technical material for
**`@drferdi/intelligenceboard`** (Puskesmas staff dashboard in **The Abyss**
monorepo).

## Index

| Document                                     | Description                                                                                                                                                                       |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`../mintlify-docs/`](../mintlify-docs/)     | **Public docs (Mintlify)** — MDX site, `docs.json`, and generated `openapi.json`; run `pnpm docs:dev` from the package. Internal Markdown below is for engineers working in-repo. |
| [`SETUP.md`](./SETUP.md)                     | Local setup, prerequisites, and first run                                                                                                                                         |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md)           | Deployment notes (for example Railway)                                                                                                                                            |
| [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) | Common failures and fixes                                                                                                                                                         |
| [`testing.md`](./testing.md)                   | Test commands and conventions                                                                                                                                                     |
| [`API.md`](./API.md)                         | HTTP API overview (hand-maintained); machine-readable stub: [`api/openapi.yaml`](./api/openapi.yaml)                                                                              |
| [`DATA_MODEL.md`](./DATA_MODEL.md)           | Data model and persistence notes                                                                                                                                                  |
| [`CLINICAL_LOGIC.md`](./CLINICAL_LOGIC.md)   | Clinical logic boundaries (non-prescriptive)                                                                                                                                      |
| [`AI_GOVERNANCE.md`](./AI_GOVERNANCE.md)     | AI usage governance for this app                                                                                                                                                  |
| [`PRIVACY.md`](./PRIVACY.md)                 | Privacy and PHI-handling principles (implementation-focused)                                                                                                                      |

Root-level governance and contributor docs: [`../README.md`](../README.md),
[`../ARCHITECTURE.md`](../ARCHITECTURE.md), [`../AGENTS.md`](../AGENTS.md),
[`../DISCLAIMER.md`](../DISCLAIMER.md),
[`../DATA_PRIVACY.md`](../DATA_PRIVACY.md).

## Conventions

- Prefer diagrams that can be regenerated from code or stored under
  `docs/assets/` when added.
- Keep examples copy-pasteable; verify commands against `package.json` scripts.
- Do not store secrets, credentials, or real patient data in this repository.

## Mintlify (public documentation site)

The deployed documentation for this app is maintained under
[`mintlify-docs/`](../mintlify-docs/) (Mintlify: `docs.json` + MDX + OpenAPI).
The `docs/` folder here remains the **internal** technical index (Markdown).

**Scripts** (from package root, or
`pnpm --filter @drferdi/intelligenceboard run …` from the monorepo root):

| Script       | Purpose                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `docs:dev`   | Local Mintlify preview (port **3004**).                                                                                        |
| `docs:api`   | Regenerate `mintlify-docs/openapi.json` from Next.js App Router API routes. Run after meaningful changes under `src/app/api/`. |
| `docs:check` | `mintlify validate` + `mintlify broken-links`.                                                                                 |

**Mintlify Cloud:** In
[dashboard deployment settings](https://mintlify.com/docs/deploy/monorepo),
enable **monorepo** and set the docs root to:

`apps/healthcare/intelligenceBoard/mintlify-docs`

Authorize the Mintlify GitHub App for this repository and align the deployment
branch with your primary branch (`main`, `master`, or `develop`).

---

_Designed and constructed by Drferdi._
